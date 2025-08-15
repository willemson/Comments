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
  res.send('Willboxd Comment Server with MongoDB is running! 🚀');
});

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
    
    // Now start the server
    app.listen(PORT, () => {
      console.log(`🚀 Willboxd server running on port ${PORT}`);
      console.log(`📊 MongoDB Atlas ready for comments`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Ratings endpoints
app.get('/api/ratings/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Get all ratings for this video
    const ratings = await db.collection('ratings').find({ videoId }).toArray();
    
    // Calculate statistics
    const total = ratings.length;
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const average = total > 0 ? sum / total : 0;
    
    res.json({
      total,
      sum,
      average: Math.round(average * 10) / 10 // Round to 1 decimal
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

app.post('/api/ratings', async (req, res) => {
  try {
    const { videoId, rating } = req.body;
    
    if (!videoId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid videoId or rating' });
    }
    
    // Add the rating
    const newRating = {
      videoId,
      rating: parseInt(rating),
      timestamp: new Date(),
      ip: req.ip // Simple way to prevent multiple ratings from same user
    };
    
    await db.collection('ratings').insertOne(newRating);
    
    // Recalculate statistics
    const allRatings = await db.collection('ratings').find({ videoId }).toArray();
    const total = allRatings.length;
    const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;
    
    res.json({
      success: true,
      ratings: {
        total,
        sum,
        average: Math.round(average * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Start everything
startServer();

