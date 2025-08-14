const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-user:your-password@cluster0.xxxxx.mongodb.net/willboxd?retryWrites=true&w=majority';
let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    db = client.db('willboxd');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  }
}

connectToMongoDB();

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

    const result = await db.collection('comments').insertOne(newComment);
    console.log('💬 New comment added:', { mediaTitle, author });
    
    res.json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete a comment (optional moderation)
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const commentId = req.params.id;
    await db.collection('comments').deleteOne({ id: commentId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Willboxd server running on port ${PORT}`);
  console.log(`📊 Using MongoDB Atlas for persistent storage`);
});
