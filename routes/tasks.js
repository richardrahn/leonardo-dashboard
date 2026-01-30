const express = require('express');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all tasks
router.get('/', auth, (req, res) => {
    try {
        const { project_id } = req.query;

        let tasks;
        if (project_id) {
            tasks = db.all(
                'SELECT * FROM tasks WHERE project_id = ? ORDER BY completed ASC, position ASC, created_at DESC',
                [project_id]
            );
        } else {
            tasks = db.all('SELECT * FROM tasks ORDER BY completed ASC, position ASC, created_at DESC');
        }

        res.json(tasks);
    } catch (error) {
        console.error('Failed to get tasks:', error);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});

// Get single task
router.get('/:id', auth, (req, res) => {
    try {
        const task = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        console.error('Failed to get task:', error);
        res.status(500).json({ error: 'Failed to load task' });
    }
});

// Create task
router.post('/', auth, (req, res) => {
    try {
        const { title, project_id, priority, due_date } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const result = db.run(
            `INSERT INTO tasks (title, project_id, priority, due_date) VALUES (?, ?, ?, ?)`,
            [title, project_id || null, priority || 'medium', due_date || null]
        );

        db.logActivity('task_created', `Created task: ${title}`, result.id);

        const task = db.get('SELECT * FROM tasks WHERE id = ?', [result.id]);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('task:created', task);

        res.json(task);
    } catch (error) {
        console.error('Failed to create task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
router.patch('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const existing = db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const allowedFields = ['title', 'project_id', 'completed', 'priority', 'due_date', 'position'];
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
        if (updates.completed === true || updates.completed === 1) {
            fields.push('completed_at = ?');
            values.push(new Date().toISOString());
        } else if (updates.completed === false || updates.completed === 0) {
            fields.push('completed_at = ?');
            values.push(null);
        }

        values.push(id);

        db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);

        db.logActivity('task_updated', `Updated task #${id}`, parseInt(id));

        const task = db.get('SELECT * FROM tasks WHERE id = ?', [id]);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('task:updated', task);

        res.json(task);
    } catch (error) {
        console.error('Failed to update task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
router.delete('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;

        const existing = db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Task not found' });
        }

        db.run('DELETE FROM tasks WHERE id = ?', [id]);
        db.logActivity('task_deleted', `Deleted task: ${existing.title}`, parseInt(id));

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('task:deleted', { id: parseInt(id) });

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Get today's tasks (due today or overdue, not completed)
router.get('/focus/today', auth, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tasks = db.all(
            `SELECT * FROM tasks
             WHERE completed = 0
             AND (due_date <= ? OR priority = 'high')
             ORDER BY due_date ASC, priority DESC
             LIMIT 5`,
            [today]
        );
        res.json(tasks);
    } catch (error) {
        console.error('Failed to get today\'s tasks:', error);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});

module.exports = router;
