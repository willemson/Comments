// server.js - Simple comment server for shared comments
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const COMMENTS_FILE = 'comments.json';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve your HTML files

// Initialize comments file if it doesn't exist
if (!fs.existsSync(COMMENTS_FILE)) {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify([]));
}

// Get all comments
app.get('/api/comments', (req, res) => {
    try {
        const comments = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
        res.json(comments);
    } catch (error) {
        console.error('Error reading comments:', error);
        res.status(500).json({ error: 'Failed to read comments' });
    }
});

// Get comments for a specific media item
app.get('/api/comments/:mediaTitle', (req, res) => {
    try {
        const mediaTitle = decodeURIComponent(req.params.mediaTitle);
        const allComments = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
        const mediaComments = allComments.filter(comment => comment.mediaTitle === mediaTitle);
        res.json(mediaComments);
    } catch (error) {
        console.error('Error reading comments:', error);
        res.status(500).json({ error: 'Failed to read comments' });
    }
});

// Add a new comment
app.post('/api/comments', (req, res) => {
    try {
        const { mediaTitle, author, text } = req.body;
        
        if (!mediaTitle || !author || !text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Basic validation
        if (author.length > 50 || text.length > 500) {
            return res.status(400).json({ error: 'Comment too long' });
        }

        const comments = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
        
        const newComment = {
            id: Date.now().toString(),
            mediaTitle: mediaTitle.trim(),
            author: author.trim(),
            text: text.trim(),
            timestamp: new Date().toISOString()
        };

        comments.push(newComment);
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
        
        res.json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Delete a comment (optional moderation feature)
app.delete('/api/comments/:id', (req, res) => {
    try {
        const commentId = req.params.id;
        const comments = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
        
        const filteredComments = comments.filter(comment => comment.id !== commentId);
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(filteredComments, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Comment server running at http://localhost:${PORT}`);
    console.log(`📁 Comments saved to ${COMMENTS_FILE}`);
    console.log(`🌐 Access your site at http://localhost:${PORT}`);
});

// Optional: Create package.json file
const packageJson = {
    "name": "willboxd-comment-server",
    "version": "1.0.0",
    "description": "Simple comment server for Willboxd",
    "main": "server.js",
    "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js"
    },
    "dependencies": {
        "express": "^4.18.2",
        "cors": "^2.8.5"
    },
    "devDependencies": {
        "nodemon": "^3.0.1"
    }
};

console.log('\n📋 Create package.json with this content:');
console.log(JSON.stringify(packageJson, null, 2));