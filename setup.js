const Database = require('better-sqlite3');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database/dashboard.db';
const SCHEMA_PATH = './database/schema.sql';
const SEED_PATH = './database/seed.sql';

async function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function setup() {
    console.log('');
    console.log('===========================================');
    console.log('   Leonardo Dashboard Setup');
    console.log('===========================================');
    console.log('');

    // Create database directory if it doesn't exist
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('✓ Created database directory');
    }

    // Check if database already exists
    const dbExists = fs.existsSync(DB_PATH);
    if (dbExists) {
        const answer = await prompt('Database already exists. Reset it? (y/N): ');
        if (answer.toLowerCase() !== 'y') {
            console.log('Setup cancelled.');
            process.exit(0);
        }
        fs.unlinkSync(DB_PATH);
        console.log('✓ Removed existing database');
    }

    // Create database
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Load and execute schema
    console.log('Creating database tables...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('✓ Created database tables');

    // Get password from user or use default
    let password = 'admin123';
    const customPassword = await prompt('Enter password (press Enter for default "admin123"): ');
    if (customPassword.trim()) {
        password = customPassword.trim();
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert user settings
    db.prepare('INSERT INTO user_settings (key, value) VALUES (?, ?)').run('username', 'richard');
    db.prepare('INSERT INTO user_settings (key, value) VALUES (?, ?)').run('password_hash', hash);
    db.prepare('INSERT INTO user_settings (key, value) VALUES (?, ?)').run('theme', 'dark');
    console.log('✓ Created user credentials');

    // Ask about seed data
    const seedAnswer = await prompt('Add sample projects and tasks? (Y/n): ');
    if (seedAnswer.toLowerCase() !== 'n') {
        // Insert sample projects
        db.prepare(`
            INSERT INTO projects (title, description, status, priority, assignee, tags, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            'Customer Journey Tracking (CDH)',
            'Implement attribution tracking for marketing campaigns',
            'in_progress', 'high', 'claude_code', 'development,analytics', 1
        );

        db.prepare(`
            INSERT INTO projects (title, description, status, priority, assignee, tags, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            'LinkedIn + Dux-Soup Strategy',
            'Define strategy for LinkedIn outreach automation',
            'in_progress', 'high', 'leonardo', 'marketing,strategy', 2
        );

        db.prepare(`
            INSERT INTO projects (title, description, status, priority, assignee, tags, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            'Lean Magnet Lead Capture',
            'Create lead magnet for email list building',
            'backlog', 'medium', 'richard', 'marketing,content', 3
        );

        // Insert sample tasks
        const today = new Date().toISOString().split('T')[0];
        const twoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const fiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const oneDay = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        db.prepare(`INSERT INTO tasks (title, priority, due_date) VALUES (?, ?, ?)`)
            .run('Review CDH journey tracking spec with Claude Code', 'high', twoDays);

        db.prepare(`INSERT INTO tasks (title, priority, due_date) VALUES (?, ?, ?)`)
            .run('Draft Lean Magnet content outline', 'medium', fiveDays);

        db.prepare(`INSERT INTO tasks (title, priority, due_date) VALUES (?, ?, ?)`)
            .run('Schedule meeting with admin about LinkedIn', 'high', oneDay);

        console.log('✓ Added sample data');
    }

    db.close();

    console.log('');
    console.log('===========================================');
    console.log('   Setup Complete!');
    console.log('===========================================');
    console.log('');
    console.log('   Credentials:');
    console.log('   Username: richard');
    console.log(`   Password: ${password === 'admin123' ? 'admin123 (default)' : '(your custom password)'}`);
    console.log('');
    console.log('   Start the server:');
    console.log('   npm start');
    console.log('');
    console.log('   Or for development with auto-reload:');
    console.log('   npm run dev');
    console.log('');
}

setup().catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
});
