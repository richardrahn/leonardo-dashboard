const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const SETTINGS_PATH = path.join(__dirname, '../../skills/gmail/settings.json');

// Get Gmail settings
router.get('/gmail', auth, async (req, res) => {
    try {
        const data = await fs.readFile(SETTINGS_PATH, 'utf8');
        const settings = JSON.parse(data);
        res.json(settings);
    } catch (error) {
        console.error('Failed to read settings:', error);
        // Return defaults if file doesn't exist
        res.json({
            notifications: {
                whatsapp: { enabled: true, number: "13038176148" },
                sms: { enabled: false, gateway: "3038176148@vtext.com" }
            },
            checking: {
                enabled: true,
                intervalMinutes: 60,
                quietHoursStart: "23:00",
                quietHoursEnd: "08:00"
            },
            priorities: {
                alertOnHigh: true,
                alertOnMedium: false,
                alertOnLow: false
            }
        });
    }
});

// Update Gmail settings
router.post('/gmail', auth, async (req, res) => {
    try {
        const settings = req.body;
        settings.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Failed to save settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
