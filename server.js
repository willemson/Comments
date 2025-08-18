const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://willem:6hg43jywisf19cAd@willboxd.1vhzjwn.mongodb.net/willboxd?retryWrites=true&w=majority&appName=Willboxd';
let db;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Health check
app.get('/', (req, res) => {
  res.send('Willboxd Comment & Rating Server with MongoDB is running! 🚀');
});

// ============================================
// EXISTING COMMENTS API (unchanged)
// ============================================

// Get all comments for a specific media item
app.get('/api/comments/:mediaTitle', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const mediaTitle = decodeURIComponent(req.params.mediaTitle);
    const comments = await db.collection('comments')
      .find({ mediaTitle })
      .sort({ timestamp: 1 })
      .toArray();
    res.json(comments);
  } catch (error) {
    console.error('Error reading comments:', error);
    res.status(500).json({ error: 'Failed to read comments' });
  }
});

// Add a new comment
app.post('/api/comments', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const { mediaTitle, author, text } = req.body;
    
    if (!mediaTitle || !author || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (author.length > 50 || text.length > 500) {
      return res.status(400).json({ error: 'Comment too long' });
    }

    const newComment = {
    mediaTitle: mediaTitle.trim(),
    author: author.trim(),
    text: text.trim(),
    avatar: req.body.avatar || null, // Add this line
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
};

    await db.collection('comments').insertOne(newComment);
    console.log('💬 New comment added:', { mediaTitle, author });
    
    res.json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============================================
// EXISTING RATINGS API (unchanged)
// ============================================

// Get ratings for a specific media item
app.get('/api/ratings/:mediaTitle', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const mediaTitle = decodeURIComponent(req.params.mediaTitle);
    
    // Get all ratings for this media
    const ratings = await db.collection('ratings')
      .find({ mediaTitle })
      .toArray();
    
    // Calculate statistics
    const total = ratings.length;
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const average = total > 0 ? sum / total : 0;
    
    res.json({
      total,
      sum,
      average: Math.round(average * 10) / 10 // Round to 1 decimal place
    });
  } catch (error) {
    console.error('Error reading ratings:', error);
    res.status(500).json({ error: 'Failed to read ratings' });
  }
});

// Add a new rating
app.post('/api/ratings', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const { videoId, rating } = req.body;
    
    if (!videoId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Use IP address as user identifier to prevent multiple ratings from same user
    const userIdentifier = req.ip || req.connection.remoteAddress || 'anonymous';
    
    // Check if user already rated this video
    const existingRating = await db.collection('ratings')
      .findOne({ mediaTitle: videoId, userIdentifier: userIdentifier });
    
    if (existingRating) {
      // Update existing rating
      await db.collection('ratings').updateOne(
        { _id: existingRating._id },
        { 
          $set: { 
            rating: rating,
            timestamp: new Date().toISOString()
          }
        }
      );
      console.log('⭐ Rating updated:', { videoId, rating, userIdentifier });
    } else {
      // Add new rating
      const newRating = {
        mediaTitle: videoId,
        rating: rating,
        userIdentifier: userIdentifier,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };

      await db.collection('ratings').insertOne(newRating);
      console.log('⭐ New rating added:', { videoId, rating, userIdentifier });
    }

    // Return updated statistics
    const allRatings = await db.collection('ratings')
      .find({ mediaTitle: videoId })
      .toArray();
    
    const total = allRatings.length;
    const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
    const average = total > 0 ? sum / total : 0;
    
    res.json({
      ratings: {
        total,
        sum,
        average: Math.round(average * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({ error: 'Failed to add rating' });
  }
});

// ============================================
// NEW GUESTBOOK API
// ============================================

// Get all guestbook entries
app.get('/api/guestbook', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const entries = await db.collection('guestbook')
      .find({})
      .sort({ timestamp: -1 }) // Newest first
      .toArray();
      
    console.log(`📖 Retrieved ${entries.length} guestbook entries`);
    res.json(entries);
  } catch (error) {
    console.error('Error reading guestbook entries:', error);
    res.status(500).json({ error: 'Failed to read guestbook entries' });
  }
});

// Add a new guestbook entry
app.post('/api/guestbook', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const { name, message } = req.body;
    
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: 'Name is too long (max 50 characters)' });
    }

    if (message.length > 300) {
      return res.status(400).json({ error: 'Message is too long (max 300 characters)' });
    }

    const newEntry = {
      name: name.trim(),
      message: message.trim(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };

    await db.collection('guestbook').insertOne(newEntry);
    console.log('📖 New guestbook entry added:', { name: newEntry.name, messageLength: newEntry.message.length });
    
    res.json(newEntry);
  } catch (error) {
    console.error('Error adding guestbook entry:', error);
    res.status(500).json({ error: 'Failed to add guestbook entry' });
  }
});

// Connect to MongoDB and THEN start the server
async function startServer() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    db = client.db('willboxd');
    console.log('📁 Database selected: willboxd');
    
    // Test the connection
    await db.admin().ping();
    console.log('🏓 Database ping successful');
    
    // Create indexes for better performance
    try {
      await db.collection('comments').createIndex({ mediaTitle: 1, timestamp: 1 });
      await db.collection('ratings').createIndex({ mediaTitle: 1, userIdentifier: 1 });
      await db.collection('guestbook').createIndex({ timestamp: -1 }); // New index for guestbook
      console.log('📊 Database indexes created');
    } catch (indexError) {
      console.log('⚠️ Index creation skipped (may already exist)');
    }
    
    // Now start the server
    app.listen(PORT, () => {
      console.log(`🚀 Willboxd server running on port ${PORT}`);
      console.log(`💬 Comments API ready at /api/comments`);
      console.log(`⭐ Ratings API ready at /api/ratings`);
      console.log(`📖 Guestbook API ready at /api/guestbook`);
      console.log(`📊 MongoDB Atlas connected and ready`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start everything
startServer();
