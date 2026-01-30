const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Get stored credentials
        const storedUsername = db.get('SELECT value FROM user_settings WHERE key = ?', ['username']);
        const storedHash = db.get('SELECT value FROM user_settings WHERE key = ?', ['password_hash']);

        if (!storedUsername || !storedHash) {
            return res.status(500).json({ error: 'User not configured. Run npm run setup first.' });
        }

        if (username !== storedUsername.value) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, storedHash.value);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        db.logActivity('login', `User ${username} logged in`);

        res.json({ token, username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/verify', (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.json({ valid: false });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, username: decoded.username });
    } catch (error) {
        res.json({ valid: false });
    }
});

router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const storedHash = db.get('SELECT value FROM user_settings WHERE key = ?', ['password_hash']);

        const validPassword = await bcrypt.compare(currentPassword, storedHash.value);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        db.run('UPDATE user_settings SET value = ? WHERE key = ?', [newHash, 'password_hash']);

        db.logActivity('password_change', 'Password changed');

        res.json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
