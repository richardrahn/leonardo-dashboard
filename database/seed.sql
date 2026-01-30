-- Default user settings (password hash will be inserted by setup.js)
INSERT OR IGNORE INTO user_settings (key, value) VALUES
    ('username', 'richard'),
    ('password_hash', 'PLACEHOLDER'),
    ('theme', 'dark');

-- Sample projects
INSERT INTO projects (title, description, status, priority, assignee, tags, position) VALUES
    ('Customer Journey Tracking (CDH)', 'Implement attribution tracking for marketing campaigns', 'in_progress', 'high', 'claude_code', 'development,analytics', 1),
    ('LinkedIn + Dux-Soup Strategy', 'Define strategy for LinkedIn outreach automation', 'in_progress', 'high', 'leonardo', 'marketing,strategy', 2),
    ('Lean Magnet Lead Capture', 'Create lead magnet for email list building', 'backlog', 'medium', 'richard', 'marketing,content', 3);

-- Sample tasks
INSERT INTO tasks (title, priority, due_date) VALUES
    ('Review CDH journey tracking spec with Claude Code', 'high', date('now', '+2 days')),
    ('Draft Lean Magnet content outline', 'medium', date('now', '+5 days')),
    ('Schedule meeting with admin about LinkedIn', 'high', date('now', '+1 day'));
