// File Browser functionality
let currentFilePath = '';
let currentFileContent = null;

async function loadFiles(path = '') {
    try {
        currentFilePath = path;
        document.getElementById('file-path-display').textContent = '/' + (path || '');

        const data = await apiCall(`/api/files/list?path=${encodeURIComponent(path)}`);
        const container = document.getElementById('file-list');

        if (data.files.length === 0 && !path) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <div class="text-2xl mb-2">📁</div>
                    <p class="text-sm">No files found</p>
                    <p class="text-xs mt-2">Configure FILES_PATH in .env</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Render files
        data.files.forEach(file => {
            const icon = file.isDirectory ? '📁' :
                        file.isImage ? '🖼️' : getFileIcon(file.name);

            html += `
                <div class="file-item flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700 cursor-pointer group"
                     onclick="${file.isDirectory ? `loadFiles('${escapeHtml(file.path)}')` : `viewFile('${escapeHtml(file.path)}')`}"
                     ondblclick="${file.isDirectory ? '' : `editFile('${escapeHtml(file.path)}')`}">
                    <span>${icon}</span>
                    <span class="flex-1 truncate">${escapeHtml(file.name)}</span>
                    <span class="text-xs text-slate-500 opacity-0 group-hover:opacity-100">${formatFileSize(file.size)}</span>
                    <button onclick="event.stopPropagation(); showFileMenu('${escapeHtml(file.path)}', ${file.isDirectory})"
                        class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-1">
                        ⋮
                    </button>
                </div>
            `;
        });

        container.innerHTML = html || '<div class="text-slate-500 text-sm p-2">Empty folder</div>';

    } catch (error) {
        console.error('Failed to load files:', error);
        document.getElementById('file-list').innerHTML = `
            <div class="text-center py-4 text-red-400">
                <p>Failed to load files</p>
            </div>
        `;
    }
}

function navigateUp() {
    if (!currentFilePath) return;
    const parentPath = currentFilePath.split('/').slice(0, -1).join('/');
    loadFiles(parentPath);
}

async function viewFile(filePath) {
    try {
        const data = await apiCall(`/api/files/read?path=${encodeURIComponent(filePath)}`);
        const container = document.getElementById('file-content-area');
        currentFileContent = data;

        if (data.isImage) {
            container.innerHTML = `
                <div class="mb-4 flex items-center justify-between">
                    <div>
                        <h3 class="font-semibold">${escapeHtml(filePath.split('/').pop())}</h3>
                        <div class="text-xs text-slate-400">${formatFileSize(data.size)}</div>
                    </div>
                    <button onclick="deleteFile('${escapeHtml(filePath)}')"
                        class="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition">
                        🗑️ Delete
                    </button>
                </div>
                <div class="flex justify-center bg-slate-800 rounded-lg p-4">
                    <img src="${data.content}" alt="${escapeHtml(filePath)}" class="max-w-full max-h-[500px] object-contain">
                </div>
            `;
            return;
        }

        const ext = data.extension || filePath.split('.').pop().toLowerCase();
        const isMarkdown = ext === '.md';

        container.innerHTML = `
            <div class="mb-4 flex items-center justify-between">
                <div>
                    <h3 class="font-semibold">${escapeHtml(filePath.split('/').pop())}</h3>
                    <div class="text-xs text-slate-400">
                        ${formatFileSize(data.size)} • Modified ${new Date(data.modified).toLocaleString()}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editFile('${escapeHtml(filePath)}')"
                        class="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                        ✏️ Edit
                    </button>
                    <button onclick="downloadFile('${escapeHtml(filePath)}')"
                        class="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                        📥 Download
                    </button>
                    <button onclick="deleteFile('${escapeHtml(filePath)}')"
                        class="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="bg-slate-800 rounded-lg p-4 overflow-auto">
                ${isMarkdown ?
                    `<div class="prose prose-invert max-w-none">${marked.parse(data.content)}</div>` :
                    `<pre class="whitespace-pre-wrap font-mono text-sm text-slate-300">${escapeHtml(data.content)}</pre>`
                }
            </div>
        `;

    } catch (error) {
        console.error('Failed to view file:', error);
        showToast('Failed to load file', 'error');
    }
}

async function editFile(filePath) {
    try {
        const data = currentFileContent?.path === filePath ?
            currentFileContent :
            await apiCall(`/api/files/read?path=${encodeURIComponent(filePath)}`);

        if (data.isImage) {
            showToast('Cannot edit image files', 'warning');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold">Edit: ${escapeHtml(filePath.split('/').pop())}</h2>
                    <span class="text-xs text-slate-400">${escapeHtml(filePath)}</span>
                </div>
                <form id="edit-file-form" class="flex flex-col" style="height: calc(90vh - 150px);">
                    <textarea name="content"
                        class="flex-1 rounded-lg px-3 py-2 font-mono text-sm resize-none bg-slate-900 border border-slate-700"
                        spellcheck="false">${escapeHtml(data.content)}</textarea>
                    <div class="flex gap-2 justify-end pt-4">
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

        document.getElementById('edit-file-form').onsubmit = async (e) => {
            e.preventDefault();
            const content = e.target.content.value;

            try {
                await apiCall('/api/files/write', {
                    method: 'PUT',
                    body: JSON.stringify({ path: filePath, content })
                });
                closeModal();
                showToast('File saved!', 'success');
                viewFile(filePath);
            } catch (error) {
                showToast('Failed to save file', 'error');
            }
        };

    } catch (error) {
        console.error('Failed to edit file:', error);
        showToast('Failed to load file for editing', 'error');
    }
}

function downloadFile(filePath) {
    // Create a download by fetching the content
    const content = currentFileContent?.content;
    if (!content) {
        showToast('No file content available', 'error');
        return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop();
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
}

async function deleteFile(filePath) {
    if (!confirm(`Delete ${filePath.split('/').pop()}? This cannot be undone.`)) return;

    try {
        await apiCall(`/api/files/delete?path=${encodeURIComponent(filePath)}`, {
            method: 'DELETE'
        });
        showToast('File deleted', 'success');
        loadFiles(currentFilePath);

        document.getElementById('file-content-area').innerHTML = `
            <div class="text-center text-slate-500 py-12">
                <div class="text-4xl mb-4">📁</div>
                <p>Select a file to view its contents</p>
            </div>
        `;
    } catch (error) {
        console.error('Failed to delete file:', error);
        showToast('Failed to delete file', 'error');
    }
}

function showFileMenu(filePath, isDirectory) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 300px;">
            <h3 class="font-semibold mb-4">${escapeHtml(filePath.split('/').pop())}</h3>
            <div class="space-y-2">
                ${!isDirectory ? `
                    <button onclick="closeModal(); editFile('${escapeHtml(filePath)}')"
                        class="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-700 transition">
                        ✏️ Edit
                    </button>
                    <button onclick="closeModal(); downloadFile('${escapeHtml(filePath)}')"
                        class="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-700 transition">
                        📥 Download
                    </button>
                ` : ''}
                <button onclick="closeModal(); renameFile('${escapeHtml(filePath)}')"
                    class="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-700 transition">
                    ✏️ Rename
                </button>
                <button onclick="closeModal(); deleteFile('${escapeHtml(filePath)}')"
                    class="w-full text-left px-4 py-2 rounded-lg hover:bg-red-600/20 text-red-400 transition">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
}

function createNewFile() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">📄 New File</h2>
            <form id="new-file-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">File Name</label>
                    <input type="text" name="name" required
                        class="w-full rounded-lg px-3 py-2"
                        placeholder="example.md">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Content (optional)</label>
                    <textarea name="content" rows="6"
                        class="w-full rounded-lg px-3 py-2 font-mono text-sm resize-none"></textarea>
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        Create
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
    modal.querySelector('input[name="name"]').focus();

    document.getElementById('new-file-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const content = e.target.content.value;
        const filePath = currentFilePath ? `${currentFilePath}/${name}` : name;

        try {
            await apiCall('/api/files/create', {
                method: 'POST',
                body: JSON.stringify({ path: filePath, content, isDirectory: false })
            });
            closeModal();
            showToast('File created!', 'success');
            loadFiles(currentFilePath);
        } catch (error) {
            showToast('Failed to create file', 'error');
        }
    };
}

function createNewFolder() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">📁 New Folder</h2>
            <form id="new-folder-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Folder Name</label>
                    <input type="text" name="name" required
                        class="w-full rounded-lg px-3 py-2"
                        placeholder="new-folder">
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        Create
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
    modal.querySelector('input').focus();

    document.getElementById('new-folder-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const folderPath = currentFilePath ? `${currentFilePath}/${name}` : name;

        try {
            await apiCall('/api/files/create', {
                method: 'POST',
                body: JSON.stringify({ path: folderPath, isDirectory: true })
            });
            closeModal();
            showToast('Folder created!', 'success');
            loadFiles(currentFilePath);
        } catch (error) {
            showToast('Failed to create folder', 'error');
        }
    };
}

function renameFile(filePath) {
    const currentName = filePath.split('/').pop();
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">Rename</h2>
            <form id="rename-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">New Name</label>
                    <input type="text" name="name" required value="${escapeHtml(currentName)}"
                        class="w-full rounded-lg px-3 py-2">
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        Rename
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
    const input = modal.querySelector('input');
    input.focus();
    input.select();

    document.getElementById('rename-form').onsubmit = async (e) => {
        e.preventDefault();
        const newName = e.target.name.value;
        const parentPath = filePath.split('/').slice(0, -1).join('/');
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        try {
            await apiCall('/api/files/rename', {
                method: 'POST',
                body: JSON.stringify({ oldPath: filePath, newPath })
            });
            closeModal();
            showToast('Renamed successfully', 'success');
            loadFiles(currentFilePath);
        } catch (error) {
            showToast('Failed to rename', 'error');
        }
    };
}

async function searchFiles() {
    const query = document.getElementById('file-search').value.trim();
    if (!query) {
        loadFiles(currentFilePath);
        return;
    }

    try {
        const data = await apiCall(`/api/files/search?q=${encodeURIComponent(query)}`);
        const container = document.getElementById('file-content-area');

        if (data.results.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-slate-500">
                    <div class="text-4xl mb-4">🔍</div>
                    <p>No files found matching "${escapeHtml(query)}"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3 class="font-semibold mb-4">Search Results for "${escapeHtml(query)}"</h3>
            <div class="space-y-2">
                ${data.results.map(file => `
                    <div class="flex items-center gap-3 p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition"
                         onclick="${file.isDirectory ? `loadFiles('${escapeHtml(file.path)}')` : `viewFile('${escapeHtml(file.path)}')`}">
                        <span>${file.isDirectory ? '📁' : getFileIcon(file.name)}</span>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium">${escapeHtml(file.name)}</div>
                            <div class="text-xs text-slate-400 truncate">${escapeHtml(file.path)}</div>
                        </div>
                        <span class="text-xs text-slate-500">${formatFileSize(file.size)}</span>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('File search failed:', error);
        showToast('Search failed', 'error');
    }
}

// Helper
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'md': '📝', 'txt': '📄', 'json': '📋', 'js': '🟨', 'ts': '🔷',
        'py': '🐍', 'sh': '⚙️', 'yaml': '📋', 'yml': '📋', 'html': '🌐',
        'css': '🎨', 'sql': '🗃️', 'env': '🔐', 'log': '📜', 'xml': '📋'
    };
    return icons[ext] || '📄';
}
