// Memory Hub functionality
let currentMemoryPath = '';
let currentMemoryFile = null;

async function loadMemoryFiles(path = '') {
    try {
        currentMemoryPath = path;
        document.getElementById('memory-path-display').textContent = '/' + (path || '');

        const data = await apiCall(`/api/memory/files?path=${encodeURIComponent(path)}`);
        const container = document.getElementById('memory-file-list');

        if (data.error) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <div class="text-2xl mb-2">📁</div>
                    <p class="text-sm">${data.error}</p>
                    <p class="text-xs mt-2">Configure MEMORY_PATH in .env</p>
                </div>
            `;
            return;
        }

        if (data.files.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <p>Empty folder</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Add parent directory link
        if (path) {
            const parentPath = path.split('/').slice(0, -1).join('/');
            html += `
                <div class="file-item flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700 cursor-pointer"
                     onclick="loadMemoryFiles('${parentPath}')">
                    <span>📁</span>
                    <span class="text-slate-400">..</span>
                </div>
            `;
        }

        data.files.forEach(file => {
            const icon = file.isDirectory ? '📁' : getFileIcon(file.name);
            html += `
                <div class="file-item flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700 cursor-pointer group"
                     onclick="${file.isDirectory ? `loadMemoryFiles('${escapeHtml(file.path)}')` : `viewMemoryFile('${escapeHtml(file.path)}')`}">
                    <span>${icon}</span>
                    <span class="flex-1 truncate">${escapeHtml(file.name)}</span>
                    ${!file.isDirectory ? `<span class="text-xs text-slate-500">${formatFileSize(file.size)}</span>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load memory files:', error);
    }
}

async function viewMemoryFile(filePath) {
    try {
        currentMemoryFile = filePath;
        const data = await apiCall(`/api/memory/read?path=${encodeURIComponent(filePath)}`);
        const container = document.getElementById('memory-content-area');

        const ext = filePath.split('.').pop().toLowerCase();
        const isMarkdown = ext === 'md';

        container.innerHTML = `
            <div class="mb-4 flex items-center justify-between">
                <div>
                    <h3 class="font-semibold">${escapeHtml(filePath.split('/').pop())}</h3>
                    <div class="text-xs text-slate-400">
                        ${formatFileSize(data.size)} • Modified ${new Date(data.modified).toLocaleString()}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editMemoryFile('${escapeHtml(filePath)}')"
                        class="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                        ✏️ Edit
                    </button>
                    <button onclick="deleteMemoryFile('${escapeHtml(filePath)}')"
                        class="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="prose prose-invert max-w-none bg-slate-800 rounded-lg p-4 overflow-auto">
                ${isMarkdown ? marked.parse(data.content) : `<pre class="whitespace-pre-wrap">${escapeHtml(data.content)}</pre>`}
            </div>
        `;

    } catch (error) {
        console.error('Failed to view memory file:', error);
        showToast('Failed to load file', 'error');
    }
}

async function editMemoryFile(filePath) {
    try {
        const data = await apiCall(`/api/memory/read?path=${encodeURIComponent(filePath)}`);

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <h2 class="text-xl font-bold mb-4">Edit: ${escapeHtml(filePath.split('/').pop())}</h2>
                <form id="edit-memory-form" class="space-y-4">
                    <textarea name="content" rows="20"
                        class="w-full rounded-lg px-3 py-2 font-mono text-sm resize-none bg-slate-900"
                        style="min-height: 400px;">${escapeHtml(data.content)}</textarea>
                    <div class="flex gap-2 justify-end">
                        <button type="button" onclick="closeModal()"
                            class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                            Cancel
                        </button>
                        <button type="submit"
                            class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('modal-container').appendChild(modal);

        document.getElementById('edit-memory-form').onsubmit = async (e) => {
            e.preventDefault();
            const content = e.target.content.value;

            try {
                await apiCall('/api/memory/write', {
                    method: 'PUT',
                    body: JSON.stringify({ path: filePath, content })
                });
                closeModal();
                showToast('File saved!', 'success');
                viewMemoryFile(filePath);
            } catch (error) {
                showToast('Failed to save file', 'error');
            }
        };

    } catch (error) {
        console.error('Failed to edit memory file:', error);
        showToast('Failed to load file for editing', 'error');
    }
}

async function deleteMemoryFile(filePath) {
    if (!confirm(`Delete ${filePath}? This cannot be undone.`)) return;

    try {
        await apiCall(`/api/memory/delete?path=${encodeURIComponent(filePath)}`, {
            method: 'DELETE'
        });
        showToast('File deleted', 'success');
        loadMemoryFiles(currentMemoryPath);

        // Clear content area
        document.getElementById('memory-content-area').innerHTML = `
            <div class="text-center text-slate-500 py-12">
                <div class="text-4xl mb-4">🧠</div>
                <p>Select a file to view its contents</p>
            </div>
        `;

    } catch (error) {
        console.error('Failed to delete file:', error);
        showToast('Failed to delete file', 'error');
    }
}

async function searchMemory() {
    const query = document.getElementById('memory-search').value.trim();
    if (!query) {
        loadMemoryFiles(currentMemoryPath);
        return;
    }

    try {
        const data = await apiCall(`/api/memory/search?q=${encodeURIComponent(query)}`);
        const container = document.getElementById('memory-content-area');

        if (data.results.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-slate-500">
                    <div class="text-4xl mb-4">🔍</div>
                    <p>No results found for "${escapeHtml(query)}"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3 class="font-semibold mb-4">Search Results for "${escapeHtml(query)}"</h3>
            <div class="space-y-4">
                ${data.results.map(result => `
                    <div class="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 cursor-pointer transition"
                         onclick="viewMemoryFile('${escapeHtml(result.path)}')">
                        <div class="font-medium text-primary">${escapeHtml(result.name)}</div>
                        <div class="text-xs text-slate-400 mb-2">${escapeHtml(result.path)}</div>
                        ${result.matches.map(m => `
                            <div class="text-sm text-slate-300 bg-slate-900 rounded p-2 mt-2">
                                <span class="text-slate-500">Line ${m.line}:</span> ${highlightMatch(m.text, query)}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Memory search failed:', error);
        showToast('Search failed', 'error');
    }
}

// Helper functions
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'md': '📝',
        'txt': '📄',
        'json': '📋',
        'js': '🟨',
        'py': '🐍',
        'sh': '⚙️',
        'yaml': '📋',
        'yml': '📋',
        'html': '🌐',
        'css': '🎨',
        'sql': '🗃️',
        'env': '🔐'
    };
    return icons[ext] || '📄';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark class="bg-yellow-500/30 text-yellow-200">$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
