const express = require('express');
const router = express.Router();
const calendarService = require('../services/google-calendar');

/**
 * GET /api/calendar/status
 * Check if calendar is configured and authorized
 */
router.get('/status', async (req, res) => {
    try {
        const configured = await calendarService.isConfigured();
        const initialized = calendarService.initialized;

        res.json({
            configured,
            initialized,
            ready: configured && initialized,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/auth-url
 * Get OAuth authorization URL
 */
router.get('/auth-url', async (req, res) => {
    try {
        const url = await calendarService.getAuthUrl();
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/calendar/authorize
 * Exchange authorization code for tokens
 */
router.post('/authorize', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code required' });
        }

        const result = await calendarService.authorize(code);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/today
 * Get today's events
 */
router.get('/today', async (req, res) => {
    try {
        const result = await calendarService.getTodayEvents();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/upcoming
 * Get upcoming events (default 7 days)
 */
router.get('/upcoming', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const result = await calendarService.getUpcomingEvents(days);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/next-meeting
 * Get the next upcoming meeting with countdown
 */
router.get('/next-meeting', async (req, res) => {
    try {
        const result = await calendarService.getNextMeeting();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
