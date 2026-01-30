const express = require('express');
const auth = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const db = require('../database/db');

const router = express.Router();

// Base path for file browser (configurable)
const FILES_BASE = process.env.FILES_PATH || '/home/richard/clawd';

// Allowed extensions for preview
const PREVIEWABLE = ['.md', '.txt', '.json', '.js', '.ts', '.py', '.sh', '.yaml', '.yml', '.html', '.css', '.sql', '.env', '.gitignore'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

// Helper to safely resolve paths
function safePath(requestedPath) {
    const resolved = path.resolve(FILES_BASE, requestedPath || '');
    if (!resolved.startsWith(FILES_BASE)) {
        throw new Error('Invalid path');
    }
    return resolved;
}

// List files in directory
router.get('/list', auth, async (req, res) => {
    try {
        const subpath = req.query.path || '';
        const fullPath = safePath(subpath);

        const entries = await fs.readdir(fullPath, { withFileTypes: true });

        const files = await Promise.all(entries
            .filter(entry => !entry.name.startsWith('.') || req.query.showHidden === 'true')
            .map(async (entry) => {
                const entryPath = path.join(fullPath, entry.name);
                try {
                    const stats = await fs.stat(entryPath);
                    const ext = path.extname(entry.name).toLowerCase();

                    return {
                        name: entry.name,
                        path: path.join(subpath, entry.name),
                        isDirectory: entry.isDirectory(),
                        size: stats.size,
                        modified: stats.mtime,
                        extension: ext,
                        previewable: PREVIEWABLE.includes(ext),
                        isImage: IMAGE_EXTENSIONS.includes(ext)
                    };
                } catch (statErr) {
                    return null;
                }
            }));

        // Filter nulls and sort
        const validFiles = files.filter(f => f !== null);
        validFiles.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        res.json({
            path: subpath,
            parent: subpath ? path.dirname(subpath) : null,
            files: validFiles,
            basePath: FILES_BASE
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Directory not found' });
        }
        console.error('Failed to list files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Read file content
router.get('/read', auth, async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'Path required' });
        }

        const fullPath = safePath(filePath);
        const stats = await fs.stat(fullPath);

        // Check if it's a previewable file
        const ext = path.extname(filePath).toLowerCase();

        if (IMAGE_EXTENSIONS.includes(ext)) {
            // Return image as base64
            const content = await fs.readFile(fullPath);
            const base64 = content.toString('base64');
            const mimeType = ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1)}`;

            return res.json({
                path: filePath,
                isImage: true,
                mimeType,
                content: `data:${mimeType};base64,${base64}`,
                size: stats.size,
                modified: stats.mtime
            });
        }

        if (!PREVIEWABLE.includes(ext) && stats.size > 1024 * 1024) {
            return res.status(400).json({ error: 'File too large to preview' });
        }

        const content = await fs.readFile(fullPath, 'utf8');

        res.json({
            path: filePath,
            content,
            size: stats.size,
            modified: stats.mtime,
            extension: ext
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        console.error('Failed to read file:', error);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// Write file content
router.put('/write', auth, async (req, res) => {
    try {
        const { path: filePath, content } = req.body;
        if (!filePath || content === undefined) {
            return res.status(400).json({ error: 'Path and content required' });
        }

        const fullPath = safePath(filePath);

        // Create backup
        try {
            const existing = await fs.readFile(fullPath, 'utf8');
            const backupPath = fullPath + '.bak';
            await fs.writeFile(backupPath, existing, 'utf8');
        } catch (e) {
            // No existing file, skip backup
        }

        await fs.writeFile(fullPath, content, 'utf8');

        db.logActivity('file_updated', `Updated: ${filePath}`);

        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error('Failed to write file:', error);
        res.status(500).json({ error: 'Failed to write file' });
    }
});

// Create new file or directory
router.post('/create', auth, async (req, res) => {
    try {
        const { path: filePath, content, isDirectory } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'Path required' });
        }

        const fullPath = safePath(filePath);

        // Check if already exists
        try {
            await fs.access(fullPath);
            return res.status(400).json({ error: 'File or directory already exists' });
        } catch (e) {
            // Doesn't exist, good
        }

        if (isDirectory) {
            await fs.mkdir(fullPath, { recursive: true });
        } else {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content || '', 'utf8');
        }

        db.logActivity('file_created', `Created: ${filePath}`);

        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error('Failed to create:', error);
        res.status(500).json({ error: 'Failed to create' });
    }
});

// Delete file or directory
router.delete('/delete', auth, async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'Path required' });
        }

        // Prevent deleting root or critical paths
        if (!filePath || filePath === '/' || filePath === '.') {
            return res.status(400).json({ error: 'Cannot delete root directory' });
        }

        const fullPath = safePath(filePath);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true });
        } else {
            await fs.unlink(fullPath);
        }

        db.logActivity('file_deleted', `Deleted: ${filePath}`);

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete:', error);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Rename/move file
router.post('/rename', auth, async (req, res) => {
    try {
        const { oldPath, newPath } = req.body;
        if (!oldPath || !newPath) {
            return res.status(400).json({ error: 'Old and new path required' });
        }

        const fullOldPath = safePath(oldPath);
        const fullNewPath = safePath(newPath);

        await fs.rename(fullOldPath, fullNewPath);

        db.logActivity('file_renamed', `Renamed: ${oldPath} → ${newPath}`);

        res.json({ success: true, oldPath, newPath });
    } catch (error) {
        console.error('Failed to rename:', error);
        res.status(500).json({ error: 'Failed to rename' });
    }
});

// Search files by name
router.get('/search', auth, async (req, res) => {
    try {
        const { q, type } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const results = [];
        const maxResults = 50;

        async function searchDir(dir, relativePath = '') {
            if (results.length >= maxResults) return;

            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    if (results.length >= maxResults) break;
                    if (entry.name.startsWith('.')) continue;

                    const fullPath = path.join(dir, entry.name);
                    const entryRelPath = path.join(relativePath, entry.name);

                    if (entry.name.toLowerCase().includes(q.toLowerCase())) {
                        const stats = await fs.stat(fullPath);
                        const ext = path.extname(entry.name).toLowerCase();

                        // Filter by type if specified
                        if (type === 'file' && entry.isDirectory()) continue;
                        if (type === 'directory' && !entry.isDirectory()) continue;

                        results.push({
                            name: entry.name,
                            path: entryRelPath,
                            isDirectory: entry.isDirectory(),
                            size: stats.size,
                            modified: stats.mtime,
                            extension: ext
                        });
                    }

                    if (entry.isDirectory() && results.length < maxResults) {
                        await searchDir(fullPath, entryRelPath);
                    }
                }
            } catch (dirErr) {
                // Skip directories that can't be read
            }
        }

        await searchDir(FILES_BASE);

        res.json({ query: q, results });
    } catch (error) {
        console.error('File search failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
