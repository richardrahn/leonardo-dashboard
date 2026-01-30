const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database/dashboard.db';

class DB {
    constructor() {
        this.db = new Database(DB_PATH);
        this.db.pragma('journal_mode = WAL');
        console.log('Connected to SQLite database');
    }

    run(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...params);
            return { id: result.lastInsertRowid, changes: result.changes };
        } catch (err) {
            console.error('DB run error:', err);
            throw err;
        }
    }

    get(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.get(...params);
        } catch (err) {
            console.error('DB get error:', err);
            throw err;
        }
    }

    all(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(...params);
        } catch (err) {
            console.error('DB all error:', err);
            throw err;
        }
    }

    saveChatMessage(sessionKey, role, content, metadata = null) {
        return this.run(
            'INSERT INTO chat_messages (session_key, role, content, metadata) VALUES (?, ?, ?, ?)',
            [sessionKey, role, content, metadata ? JSON.stringify(metadata) : null]
        );
    }

    getChatHistory(sessionKey = 'main', limit = 100) {
        return this.all(
            'SELECT * FROM chat_messages WHERE session_key = ? ORDER BY timestamp DESC LIMIT ?',
            [sessionKey, limit]
        );
    }

    logActivity(type, description, relatedId = null) {
        return this.run(
            'INSERT INTO activity_log (activity_type, description, related_id) VALUES (?, ?, ?)',
            [type, description, relatedId]
        );
    }

    close() {
        this.db.close();
    }
}

module.exports = new DB();
