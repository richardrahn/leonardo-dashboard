const express = require('express');
const router = express.Router();
const briefingService = require('../services/morning-briefing');

/**
 * GET /api/briefing
 * Get the daily morning briefing
 */
router.get('/', async (req, res) => {
    try {
        const briefing = await briefingService.generateBriefing();
        res.json(briefing);
    } catch (error) {
        console.error('[Briefing Route] Error:', error);
        res.status(500).json({
            error: error.message,
            briefing: 'Unable to generate briefing at this time.',
        });
    }
});

/**
 * POST /api/briefing/refresh
 * Force refresh the briefing (clear cache)
 */
router.post('/refresh', async (req, res) => {
    try {
        briefingService.clearCache();
        const briefing = await briefingService.generateBriefing();
        res.json(briefing);
    } catch (error) {
        console.error('[Briefing Route] Refresh error:', error);
        res.status(500).json({
            error: error.message,
        });
    }
});

module.exports = router;
