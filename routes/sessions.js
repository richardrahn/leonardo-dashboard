const express = require('express');
const auth = require('../middleware/auth');
const clawdbot = require('../services/clawdbot');
const db = require('../database/db');

const router = express.Router();

// Get all sessions
router.get('/', auth, async (req, res) => {
    try {
        const sessions = await clawdbot.getSessionStatus();
        res.json(sessions);
    } catch (error) {
        console.error('Failed to get sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions', details: error.message });
    }
});

// Get specific session details
router.get('/:key', auth, async (req, res) => {
    try {
        const { key } = req.params;
        const session = await clawdbot.getSessionDetails(key);
        res.json(session);
    } catch (error) {
        console.error('Failed to get session:', error);
        res.status(500).json({ error: 'Failed to get session details' });
    }
});

// Spawn new agent session
router.post('/spawn', auth, async (req, res) => {
    try {
        const { name, type, prompt } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Session name required' });
        }

        const result = await clawdbot.spawnSession({
            name,
            type: type || 'claude_code',
            prompt
        });

        db.logActivity('session_spawned', `Spawned: ${name}`);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('session:spawned', result);

        res.json(result);
    } catch (error) {
        console.error('Failed to spawn session:', error);
        res.status(500).json({ error: 'Failed to spawn session', details: error.message });
    }
});

// Send message to session
router.post('/:key/send', auth, async (req, res) => {
    try {
        const { key } = req.params;
        const { message, timeout } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }

        const result = await clawdbot.sendToSession(key, message, timeout || 60);
        res.json(result);
    } catch (error) {
        console.error('Failed to send to session:', error);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

// Kill session
router.delete('/:key', auth, async (req, res) => {
    try {
        const { key } = req.params;
        const result = await clawdbot.killSession(key);

        db.logActivity('session_killed', `Killed: ${key}`);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('session:killed', { key });

        res.json(result);
    } catch (error) {
        console.error('Failed to kill session:', error);
        res.status(500).json({ error: 'Failed to kill session', details: error.message });
    }
});

// Get session logs/history
router.get('/:key/logs', auth, async (req, res) => {
    try {
        const { key } = req.params;
        const { limit } = req.query;
        const logs = await clawdbot.getSessionLogs(key, parseInt(limit) || 50);
        res.json(logs);
    } catch (error) {
        console.error('Failed to get session logs:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

module.exports = router;
