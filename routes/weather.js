const express = require('express');
const router = express.Router();
const weatherService = require('../services/weather');

/**
 * GET /api/weather
 * Get current weather
 */
router.get('/', async (req, res) => {
    try {
        const location = req.query.location || null;
        const weather = await weatherService.getCurrentWeather(location);
        res.json(weather);
    } catch (error) {
        console.error('[Weather Route] Error:', error);
        res.status(500).json({
            error: error.message,
            success: false,
        });
    }
});

/**
 * POST /api/weather/refresh
 * Force refresh weather data
 */
router.post('/refresh', async (req, res) => {
    try {
        weatherService.clearCache();
        const location = req.body.location || null;
        const weather = await weatherService.getCurrentWeather(location);
        res.json(weather);
    } catch (error) {
        console.error('[Weather Route] Refresh error:', error);
        res.status(500).json({
            error: error.message,
            success: false,
        });
    }
});

module.exports = router;
