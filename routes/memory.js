const express = require('express');
const auth = require('../middleware/auth');
const clawdbot = require('../services/clawdbot');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Base path for memory files (configurable)
const MEMORY_BASE = process.env.MEMORY_PATH || '/home/richard/clawd/memory';

// Helper to safely resolve paths
function safePath(requestedPath) {
    const resolved = path.resolve(MEMORY_BASE, requestedPath || '');
    if (!resolved.startsWith(MEMORY_BASE)) {
        throw new Error('Invalid path');
    }
    return resolved;
}

// List memory files
router.get('/files', auth, async (req, res) => {
    try {
        const subpath = req.query.path || '';
        const fullPath = safePath(subpath);

        const entries = await fs.readdir(fullPath, { withFileTypes: true });

        const files = await Promise.all(entries.map(async (entry) => {
            const entryPath = path.join(fullPath, entry.name);
            const stats = await fs.stat(entryPath);

            return {
                name: entry.name,
                path: path.join(subpath, entry.name),
                isDirectory: entry.isDirectory(),
                size: stats.size,
                modified: stats.mtime
            };
        }));

        // Sort: directories first, then by name
        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        res.json({
            path: subpath,
            files,
            basePath: MEMORY_BASE
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.json({ path: '', files: [], error: 'Memory directory not found' });
        }
        console.error('Failed to list memory files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Read memory file
router.get('/read', auth, async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'Path required' });
        }

        const fullPath = safePath(filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        const stats = await fs.stat(fullPath);

        res.json({
            path: filePath,
            content,
            size: stats.size,
            modified: stats.mtime
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        console.error('Failed to read memory file:', error);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// Write/update memory file
router.put('/write', auth, async (req, res) => {
    try {
        const { path: filePath, content } = req.body;
        if (!filePath || content === undefined) {
            return res.status(400).json({ error: 'Path and content required' });
        }

        const fullPath = safePath(filePath);

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        await fs.writeFile(fullPath, content, 'utf8');

        const db = require('../database/db');
        db.logActivity('memory_updated', `Updated: ${filePath}`);

        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error('Failed to write memory file:', error);
        res.status(500).json({ error: 'Failed to write file' });
    }
});

// Create new memory file
router.post('/create', auth, async (req, res) => {
    try {
        const { path: filePath, content, isDirectory } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'Path required' });
        }

        const fullPath = safePath(filePath);

        if (isDirectory) {
            await fs.mkdir(fullPath, { recursive: true });
        } else {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content || '', 'utf8');
        }

        const db = require('../database/db');
        db.logActivity('memory_created', `Created: ${filePath}`);

        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error('Failed to create memory file:', error);
        res.status(500).json({ error: 'Failed to create file' });
    }
});

// Delete memory file
router.delete('/delete', auth, async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'Path required' });
        }

        const fullPath = safePath(filePath);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            await fs.rmdir(fullPath, { recursive: true });
        } else {
            await fs.unlink(fullPath);
        }

        const db = require('../database/db');
        db.logActivity('memory_deleted', `Deleted: ${filePath}`);

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete memory file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Search memory files (simple grep-like search)
router.get('/search', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const results = [];

        async function searchDir(dir, relativePath = '') {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const entryRelPath = path.join(relativePath, entry.name);

                    if (entry.isDirectory()) {
                        await searchDir(fullPath, entryRelPath);
                    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt') || entry.name.endsWith('.json')) {
                        try {
                            const content = await fs.readFile(fullPath, 'utf8');
                            if (content.toLowerCase().includes(q.toLowerCase())) {
                                // Find matching lines
                                const lines = content.split('\n');
                                const matches = [];
                                lines.forEach((line, idx) => {
                                    if (line.toLowerCase().includes(q.toLowerCase())) {
                                        matches.push({
                                            line: idx + 1,
                                            text: line.substring(0, 200)
                                        });
                                    }
                                });

                                if (matches.length > 0) {
                                    results.push({
                                        path: entryRelPath,
                                        name: entry.name,
                                        matches: matches.slice(0, 5) // Limit matches per file
                                    });
                                }
                            }
                        } catch (readErr) {
                            // Skip files that can't be read
                        }
                    }
                }
            } catch (dirErr) {
                // Skip directories that can't be read
            }
        }

        await searchDir(MEMORY_BASE);

        res.json({
            query: q,
            results: results.slice(0, 20) // Limit total results
        });
    } catch (error) {
        console.error('Memory search failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Quick add memory note
router.post('/quick-add', auth, async (req, res) => {
    try {
        const { content, category } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content required' });
        }

        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');

        const category_path = category || 'notes';
        const fileName = `${dateStr}_${timeStr}.md`;
        const filePath = path.join(category_path, fileName);
        const fullPath = safePath(filePath);

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Format the note
        const formattedContent = `# Quick Note - ${date.toLocaleString()}

${content}

---
*Added via Leonardo Dashboard*
`;

        await fs.writeFile(fullPath, formattedContent, 'utf8');

        const db = require('../database/db');
        db.logActivity('memory_quick_add', `Quick note: ${fileName}`);

        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error('Failed to add quick note:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

module.exports = router;
