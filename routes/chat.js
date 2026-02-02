const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), '../uploads');
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Get chat history
router.get('/history', auth, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const messages = db.getChatHistory('main', limit);
        res.json(messages.reverse()); // Return oldest first
    } catch (error) {
        console.error('Failed to get chat history:', error);
        res.status(500).json({ error: 'Failed to load chat history' });
    }
});

// Search chat messages
router.get('/search', auth, (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const messages = db.all(
            `SELECT * FROM chat_messages
             WHERE content LIKE ?
             ORDER BY timestamp DESC
             LIMIT 50`,
            [`%${q}%`]
        );

        res.json(messages);
    } catch (error) {
        console.error('Failed to search chat:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Clear chat history
router.delete('/clear', auth, (req, res) => {
    try {
        db.run('DELETE FROM chat_messages WHERE session_key = ?', ['main']);
        db.logActivity('chat_cleared', 'Chat history cleared');
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to clear chat:', error);
        res.status(500).json({ error: 'Failed to clear chat' });
    }
});

// Export chat to markdown (for download)
router.get('/export', auth, (req, res) => {
    try {
        const messages = db.getChatHistory('main', 1000);
        messages.reverse();

        let markdown = '# Leonardo Chat Export\n\n';
        markdown += `Exported: ${new Date().toISOString()}\n\n---\n\n`;

        for (const msg of messages) {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            const role = msg.role === 'user' ? 'You' : 'Leonardo';
            markdown += `**${role}** (${timestamp}):\n\n${msg.content}\n\n---\n\n`;
        }

        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', 'attachment; filename=chat-export.md');
        res.send(markdown);
    } catch (error) {
        console.error('Failed to export chat:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// Upload file
router.post('/upload', auth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = path.join('../uploads', req.file.filename);
        
        db.logActivity('file_uploaded', `File uploaded: ${req.file.originalname}`);
        
        res.json({
            success: true,
            path: filePath,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

module.exports = router;
