const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();

// Path to Gmail functionality
const GMAIL_SKILL_PATH = path.join(__dirname, '../../skills/gmail');
const SETTINGS_PATH = path.join(GMAIL_SKILL_PATH, 'settings.json');

// Import Gmail status checker
let getGmailStatus;
try {
    const gmailModule = require(path.join(GMAIL_SKILL_PATH, 'gmail-status.js'));
    getGmailStatus = gmailModule.getGmailStatus;
} catch (error) {
    console.error('[Gmail] Failed to load gmail-status module:', error.message);
}

// Get current Gmail status
router.get('/status', auth, async (req, res) => {
    try {
        if (!getGmailStatus) {
            throw new Error('Gmail module not loaded');
        }
        
        const status = await getGmailStatus();
        res.json(status);
    } catch (error) {
        console.error('[Gmail] Error getting status:', error);
        res.status(500).json({ 
            error: 'Failed to get Gmail status',
            message: error.message 
        });
    }
});

// Trigger manual check (same as status, but explicit action)
router.post('/check', auth, async (req, res) => {
    try {
        if (!getGmailStatus) {
            throw new Error('Gmail module not loaded');
        }
        
        console.log('[Gmail] Manual check triggered');
        const status = await getGmailStatus();
        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('[Gmail] Error during manual check:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to check Gmail',
            message: error.message 
        });
    }
});

// Get Gmail settings
router.get('/settings', auth, async (req, res) => {
    try {
        const data = await fs.readFile(SETTINGS_PATH, 'utf8');
        const settings = JSON.parse(data);
        res.json(settings);
    } catch (error) {
        console.error('[Gmail] Failed to read settings:', error);
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
            },
            lastUpdated: new Date().toISOString()
        });
    }
});

// Update Gmail settings
router.post('/settings', auth, async (req, res) => {
    try {
        const settings = req.body;
        settings.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        console.log('[Gmail] Settings updated');
        res.json({ success: true, settings });
    } catch (error) {
        console.error('[Gmail] Failed to save settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to save settings',
            message: error.message
        });
    }
});

module.exports = router;
