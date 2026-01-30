// Sessions functionality
let sessions = [];

async function loadSessions() {
    try {
        sessions = await apiCall('/api/sessions');
        renderSessions();
    } catch (error) {
        console.error('Failed to load sessions:', error);
        document.getElementById('sessions-list').innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-4">⚠️</div>
                <p class="text-slate-400">Failed to connect to Clawdbot</p>
                <p class="text-sm text-slate-500 mt-2">Make sure Clawdbot is running</p>
                <button onclick="refreshSessions()" class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                    Try Again
                </button>
            </div>
        `;
    }
}

function renderSessions() {
    const container = document.getElementById('sessions-list');

    if (!sessions || sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-4">⚡</div>
                <p class="text-slate-400">No active sessions</p>
                <button onclick="showSpawnSessionModal()" class="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg transition">
                    Spawn an Agent
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(session => `
        <div class="session-card bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition">
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${getSessionColor(session.type || session.name)} flex items-center justify-center text-xl">
                        ${getSessionIcon(session.type || session.name)}
                    </div>
                    <div>
                        <div class="font-semibold">${escapeHtml(session.name || session.key)}</div>
                        <div class="text-sm text-slate-400">${escapeHtml(session.type || 'Agent')}</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${session.active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}">
                        <span class="w-1.5 h-1.5 rounded-full ${session.active ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}"></span>
                        ${session.active ? 'Active' : 'Idle'}
                    </span>
                </div>
            </div>

            ${session.currentTask ? `
                <div class="mt-3 p-3 bg-slate-700/50 rounded-lg">
                    <div class="text-xs text-slate-400 mb-1">Current Task</div>
                    <div class="text-sm">${escapeHtml(session.currentTask)}</div>
                </div>
            ` : ''}

            ${session.stats ? `
                <div class="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div class="p-2 bg-slate-700/50 rounded-lg">
                        <div class="text-lg font-semibold">${session.stats.messages || 0}</div>
                        <div class="text-xs text-slate-400">Messages</div>
                    </div>
                    <div class="p-2 bg-slate-700/50 rounded-lg">
                        <div class="text-lg font-semibold">${session.stats.tokens ? formatNumber(session.stats.tokens) : '0'}</div>
                        <div class="text-xs text-slate-400">Tokens</div>
                    </div>
                    <div class="p-2 bg-slate-700/50 rounded-lg">
                        <div class="text-lg font-semibold">${session.stats.uptime || '-'}</div>
                        <div class="text-xs text-slate-400">Uptime</div>
                    </div>
                </div>
            ` : ''}

            <div class="mt-4 flex gap-2">
                <button onclick="sendToSession('${escapeHtml(session.key)}')"
                    class="flex-1 px-3 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm transition">
                    💬 Send Message
                </button>
                <button onclick="viewSessionLogs('${escapeHtml(session.key)}')"
                    class="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition">
                    📜 Logs
                </button>
                <button onclick="killSession('${escapeHtml(session.key)}')"
                    class="px-3 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition">
                    ⏹️
                </button>
            </div>
        </div>
    `).join('');
}

async function refreshSessions() {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '🔄 Refreshing...';
    }

    await loadSessions();

    if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh';
    }
}

function showSpawnSessionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">⚡ Spawn New Agent</h2>
            <form id="spawn-session-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Name *</label>
                    <input type="text" name="name" required
                        class="w-full rounded-lg px-3 py-2"
                        placeholder="e.g., research-agent">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Type</label>
                    <select name="type" class="w-full rounded-lg px-3 py-2">
                        <option value="claude_code">Claude Code</option>
                        <option value="assistant">Assistant</option>
                        <option value="researcher">Researcher</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Initial Prompt (optional)</label>
                    <textarea name="prompt" rows="4"
                        class="w-full rounded-lg px-3 py-2 resize-none"
                        placeholder="What should this agent work on?"></textarea>
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        Spawn Agent
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
    modal.querySelector('input[name="name"]').focus();

    document.getElementById('spawn-session-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Spawning...';

            await apiCall('/api/sessions/spawn', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            closeModal();
            showToast('Agent spawned!', 'success');
            refreshSessions();
        } catch (error) {
            console.error('Failed to spawn session:', error);
            showToast('Failed to spawn agent', 'error');
        }
    };
}

function sendToSession(sessionKey) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">💬 Send to ${escapeHtml(sessionKey)}</h2>
            <form id="send-session-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Message</label>
                    <textarea name="message" rows="4" required
                        class="w-full rounded-lg px-3 py-2 resize-none"
                        placeholder="What do you want the agent to do?"></textarea>
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        Send
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
    modal.querySelector('textarea').focus();

    document.getElementById('send-session-form').onsubmit = async (e) => {
        e.preventDefault();
        const message = e.target.message.value;

        try {
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Sending...';

            const result = await apiCall(`/api/sessions/${sessionKey}/send`, {
                method: 'POST',
                body: JSON.stringify({ message, timeout: 60 })
            });

            closeModal();
            showToast('Message sent!', 'success');

            // Show response if available
            if (result.response) {
                showSessionResponse(sessionKey, result.response);
            }
        } catch (error) {
            console.error('Failed to send to session:', error);
            showToast('Failed to send message', 'error');
        }
    };
}

function showSessionResponse(sessionKey, response) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2 class="text-xl font-bold mb-4">Response from ${escapeHtml(sessionKey)}</h2>
            <div class="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div class="prose prose-invert max-w-none">
                    ${marked.parse(response)}
                </div>
            </div>
            <div class="flex justify-end pt-4">
                <button onclick="closeModal()"
                    class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                    Close
                </button>
            </div>
        </div>
    `;
    document.getElementById('modal-container').appendChild(modal);
}

async function viewSessionLogs(sessionKey) {
    try {
        const logs = await apiCall(`/api/sessions/${sessionKey}/logs?limit=50`);

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <h2 class="text-xl font-bold mb-4">📜 Logs: ${escapeHtml(sessionKey)}</h2>
                <div class="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
                    ${logs && logs.length > 0 ? logs.map(log => `
                        <div class="py-1 border-b border-slate-800">
                            <span class="text-slate-500">${new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span class="ml-2">${escapeHtml(log.message || JSON.stringify(log))}</span>
                        </div>
                    `).join('') : '<p class="text-slate-500">No logs available</p>'}
                </div>
                <div class="flex justify-end pt-4">
                    <button onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.getElementById('modal-container').appendChild(modal);
    } catch (error) {
        console.error('Failed to get session logs:', error);
        showToast('Failed to load logs', 'error');
    }
}

async function killSession(sessionKey) {
    if (!confirm(`Kill session "${sessionKey}"? This will stop the agent.`)) return;

    try {
        await apiCall(`/api/sessions/${sessionKey}`, { method: 'DELETE' });
        showToast('Session terminated', 'success');
        refreshSessions();
    } catch (error) {
        console.error('Failed to kill session:', error);
        showToast('Failed to terminate session', 'error');
    }
}

// Helper functions
function getSessionIcon(type) {
    const icons = {
        'leonardo': '🎯',
        'claude_code': '💻',
        'assistant': '🤖',
        'researcher': '🔬',
        'main': '🎯'
    };
    const lowerType = (type || '').toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lowerType.includes(key)) return icon;
    }
    return '⚡';
}

function getSessionColor(type) {
    const colors = {
        'leonardo': 'bg-blue-600',
        'claude_code': 'bg-purple-600',
        'assistant': 'bg-green-600',
        'researcher': 'bg-amber-600',
        'main': 'bg-blue-600'
    };
    const lowerType = (type || '').toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
        if (lowerType.includes(key)) return color;
    }
    return 'bg-slate-600';
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Listen for session updates
if (typeof socket !== 'undefined') {
    socket?.on('sessions:status', (updatedSessions) => {
        sessions = updatedSessions;
        if (document.getElementById('sessions-view').classList.contains('hidden') === false) {
            renderSessions();
        }
    });

    socket?.on('session:spawned', () => {
        refreshSessions();
    });

    socket?.on('session:killed', () => {
        refreshSessions();
    });
}
