const express = require('express');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
