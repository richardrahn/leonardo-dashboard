const express = require('express');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', auth, (req, res) => {
    try {
        const projects = db.all('SELECT * FROM projects ORDER BY position ASC, created_at DESC');
        res.json(projects);
    } catch (error) {
        console.error('Failed to get projects:', error);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

// Get single project
router.get('/:id', auth, (req, res) => {
    try {
        const project = db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        console.error('Failed to get project:', error);
        res.status(500).json({ error: 'Failed to load project' });
    }
});

// Create project
router.post('/', auth, (req, res) => {
    try {
        const { title, description, status, priority, assignee, due_date, tags } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const result = db.run(
            `INSERT INTO projects (title, description, status, priority, assignee, due_date, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description || null,
                status || 'backlog',
                priority || 'medium',
                assignee || null,
                due_date || null,
                tags || null
            ]
        );

        db.logActivity('project_created', `Created project: ${title}`, result.id);

        const project = db.get('SELECT * FROM projects WHERE id = ?', [result.id]);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('project:created', project);

        res.json(project);
    } catch (error) {
        console.error('Failed to create project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Update project
router.patch('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check project exists
        const existing = db.get('SELECT * FROM projects WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const allowedFields = ['title', 'description', 'status', 'priority', 'assignee', 'due_date', 'tags', 'position'];
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Handle completed_at timestamp
        if (updates.status === 'done' && existing.status !== 'done') {
            fields.push('completed_at = ?');
            values.push(new Date().toISOString());
        } else if (updates.status && updates.status !== 'done') {
            fields.push('completed_at = ?');
            values.push(null);
        }

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());

        values.push(id);

        db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);

        db.logActivity('project_updated', `Updated project #${id}`, parseInt(id));

        const project = db.get('SELECT * FROM projects WHERE id = ?', [id]);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('project:updated', project);

        res.json(project);
    } catch (error) {
        console.error('Failed to update project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Delete project
router.delete('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;

        const existing = db.get('SELECT * FROM projects WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Project not found' });
        }

        db.run('DELETE FROM projects WHERE id = ?', [id]);
        db.logActivity('project_deleted', `Deleted project: ${existing.title}`, parseInt(id));

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('project:deleted', { id: parseInt(id) });

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Bulk update positions (for drag-and-drop reordering)
router.post('/reorder', auth, (req, res) => {
    try {
        const { updates } = req.body; // Array of { id, position, status }

        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'Updates array required' });
        }

        for (const update of updates) {
            db.run(
                'UPDATE projects SET position = ?, status = ?, updated_at = ? WHERE id = ?',
                [update.position, update.status, new Date().toISOString(), update.id]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to reorder projects:', error);
        res.status(500).json({ error: 'Failed to reorder projects' });
    }
});

module.exports = router;
