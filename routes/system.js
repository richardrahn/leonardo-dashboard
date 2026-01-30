const express = require('express');
const db = require('../database/db');
const auth = require('../middleware/auth');
const clawdbot = require('../services/clawdbot');

const router = express.Router();

// Get dashboard stats
router.get('/stats', auth, async (req, res) => {
    try {
        // Project stats
        const projectStats = db.get(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
                SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog
            FROM projects
        `);

        // Task stats
        const taskStats = db.get(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN completed = 0 AND due_date <= date('now') THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN completed = 0 AND due_date = date('now') THEN 1 ELSE 0 END) as due_today
            FROM tasks
        `);

        // Chat stats (today)
        const chatStats = db.get(`
            SELECT
                COUNT(*) as total_today,
                SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
                SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages
            FROM chat_messages
            WHERE date(timestamp) = date('now')
        `);

        // Recent activity
        const recentActivity = db.all(`
            SELECT * FROM activity_log
            ORDER BY timestamp DESC
            LIMIT 10
        `);

        res.json({
            projects: projectStats,
            tasks: taskStats,
            chat: chatStats,
            activity: recentActivity,
            uptime: process.uptime()
        });
    } catch (error) {
        console.error('Failed to get stats:', error);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// Get activity feed
router.get('/activity', auth, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const activity = db.all(`
            SELECT * FROM activity_log
            ORDER BY timestamp DESC
            LIMIT ?
        `, [limit]);
        res.json(activity);
    } catch (error) {
        console.error('Failed to get activity:', error);
        res.status(500).json({ error: 'Failed to load activity' });
    }
});

// Get today's focus (high priority + due today tasks)
router.get('/focus', auth, (req, res) => {
    try {
        const tasks = db.all(`
            SELECT * FROM tasks
            WHERE completed = 0
            AND (priority = 'high' OR due_date <= date('now', '+1 day'))
            ORDER BY
                CASE WHEN due_date <= date('now') THEN 0 ELSE 1 END,
                CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                due_date ASC
            LIMIT 5
        `);

        const projects = db.all(`
            SELECT * FROM projects
            WHERE status = 'in_progress'
            ORDER BY
                CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                updated_at DESC
            LIMIT 3
        `);

        res.json({ tasks, projects });
    } catch (error) {
        console.error('Failed to get focus:', error);
        res.status(500).json({ error: 'Failed to load focus' });
    }
});

// System health check
router.get('/health', async (req, res) => {
    try {
        const clawdbotStatus = await clawdbot.getSessionStatus();

        res.json({
            status: 'healthy',
            dashboard: 'online',
            database: 'connected',
            clawdbot: clawdbotStatus.length >= 0 ? 'connected' : 'unknown',
            sessions: clawdbotStatus.length,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: 'degraded',
            dashboard: 'online',
            database: 'connected',
            clawdbot: 'disconnected',
            error: error.message,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
