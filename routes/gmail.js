const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * MODEL ROUTING: Use Haiku for all Gmail operations
 * - Cost: 10x cheaper than Sonnet
 * - Quality: Perfect for structured email data
 * - Operations: status, list, filter, triage
 * - Exception: Use Sonnet for compose/analyze (if implemented)
 */

// Path to Gmail functionality
const GMAIL_SKILL_PATH = path.join(__dirname, '../../skills/gmail');
const SETTINGS_PATH = path.join(GMAIL_SKILL_PATH, 'settings.json');

// Import Gmail functions
let getGmailStatus, deleteEmail, archiveEmail, starEmail, unstarEmail, markAsRead, getEmailDetails, replyToEmail;
try {
    const gmailModule = require(path.join(GMAIL_SKILL_PATH, 'gmail-status.js'));
    getGmailStatus = gmailModule.getGmailStatus;
    deleteEmail = gmailModule.deleteEmail;
    archiveEmail = gmailModule.archiveEmail;
    starEmail = gmailModule.starEmail;
    unstarEmail = gmailModule.unstarEmail;
    markAsRead = gmailModule.markAsRead;
    getEmailDetails = gmailModule.getEmailDetails;
    replyToEmail = gmailModule.replyToEmail;
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

// Delete/trash an email
router.delete('/email/:messageId', auth, async (req, res) => {
    try {
        if (!deleteEmail) {
            throw new Error('Gmail delete function not loaded');
        }
        
        const { messageId } = req.params;
        console.log('[Gmail] Deleting email:', messageId);
        
        const result = await deleteEmail(messageId);
        
        if (result.success) {
            res.json({ success: true, messageId });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('[Gmail] Failed to delete email:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete email',
            message: error.message
        });
    }
});

// Archive an email
router.post('/email/:messageId/archive', auth, async (req, res) => {
    try {
        if (!archiveEmail) {
            throw new Error('Gmail archive function not loaded');
        }
        
        const { messageId } = req.params;
        console.log('[Gmail] Archiving email:', messageId);
        
        const result = await archiveEmail(messageId);
        
        if (result.success) {
            res.json({ success: true, messageId });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('[Gmail] Failed to archive email:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to archive email',
            message: error.message
        });
    }
});

// Star an email
router.post('/email/:messageId/star', auth, async (req, res) => {
    try {
        if (!starEmail) {
            throw new Error('Gmail star function not loaded');
        }
        
        const { messageId } = req.params;
        console.log('[Gmail] Starring email:', messageId);
        
        const result = await starEmail(messageId);
        
        if (result.success) {
            res.json({ success: true, messageId });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('[Gmail] Failed to star email:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to star email',
            message: error.message
        });
    }
});

// Unstar an email
router.post('/email/:messageId/unstar', auth, async (req, res) => {
    try {
        if (!unstarEmail) {
            throw new Error('Gmail unstar function not loaded');
        }
        
        const { messageId } = req.params;
        console.log('[Gmail] Unstarring email:', messageId);
        
        const result = await unstarEmail(messageId);
        
        if (result.success) {
            res.json({ success: true, messageId });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('[Gmail] Failed to unstar email:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to unstar email',
            message: error.message
        });
    }
});

// Mark email as read
router.post('/email/:messageId/read', auth, async (req, res) => {
    try {
        if (!markAsRead) {
            throw new Error('Gmail mark-read function not loaded');
        }
        
        const { messageId } = req.params;
        console.log('[Gmail] Marking email as read:', messageId);
        
        const result = await markAsRead(messageId);
        
        if (result.success) {
            res.json({ success: true, messageId });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('[Gmail] Failed to mark email as read:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to mark email as read',
            message: error.message
        });
    }
});

// Get email details (for snippet preview)
router.get('/email/:messageId/details', auth, async (req, res) => {
    try {
        if (!getEmailDetails) {
            throw new Error('Gmail details function not loaded');
        }
        
        const { messageId } = req.params;
        console.log('[Gmail] Getting email details:', messageId);
        
        const result = await getEmailDetails(messageId);
        
        if (result.success) {
            res.json(result);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('[Gmail] Failed to get email details:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get email details',
            message: error.message
        });
    }
});

// Reply to an email
router.post('/email/:messageId/reply', auth, async (req, res) => {
    try {
        if (!replyToEmail) {
            throw new Error('Gmail reply function not loaded');
        }
        
        const { messageId } = req.params;
        const { threadId, replyText } = req.body;
        
        if (!threadId || !replyText) {
            throw new Error('Missing threadId or replyText');
        }
        
        console.log('[Gmail] Replying to email:', messageId);
        
        const result = await replyToEmail(messageId, threadId, replyText);
        
        if (result.success) {
            res.json({ success: true, messageId });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('[Gmail] Failed to send reply:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send reply',
            message: error.message
        });
    }
});

module.exports = router;
