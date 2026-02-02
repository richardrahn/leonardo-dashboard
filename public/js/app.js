// Main application logic
let socket;
let currentView = 'dashboard';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Verify token
    const userData = await verifyToken(token);
    if (!userData) {
        logout();
        return;
    }

    // Update UI with username
    document.getElementById('username-display').textContent = userData.username;

    // Initialize Socket.io
    initializeSocket();

    // Load initial data for all views
    await Promise.all([
        loadChatHistory(),
        loadProjects(),
        loadTasks()
    ]);

    // Load theme preference
    loadTheme();

    // Show default view (dashboard)
    showView('dashboard');
});

function initializeSocket() {
    socket = io({
        auth: { token: getToken() }
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus('online');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus('offline');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus('offline');
    });

    // Chat events
    socket.on('chat:message', (data) => {
        console.log('Received chat message:', data);
        try {
            appendMessage(data.role, data.content, data.timestamp);
            // Make sure input is re-enabled
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-btn');
            if (input) input.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
        } catch (error) {
            console.error('Error appending message:', error);
        }
    });

    socket.on('chat:typing', (data) => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            if (data.typing) {
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        }
    });

    socket.on('chat:error', (data) => {
        console.error('Chat error:', data);
        showToast(data.message || 'Chat error', 'error');
        // Re-enable input on error
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
    });

    // Project events
    socket.on('project:created', (project) => {
        projects.push(project);
        renderProjects();
        if (currentView === 'dashboard') loadDashboard();
    });

    socket.on('project:updated', (project) => {
        const index = projects.findIndex(p => p.id === project.id);
        if (index !== -1) {
            projects[index] = project;
            renderProjects();
        }
        if (currentView === 'dashboard') loadDashboard();
    });

    socket.on('project:deleted', (data) => {
        projects = projects.filter(p => p.id !== data.id);
        renderProjects();
        if (currentView === 'dashboard') loadDashboard();
    });

    // Task events
    socket.on('task:created', (task) => {
        tasks.push(task);
        renderTasks();
        if (currentView === 'dashboard') loadDashboard();
    });

    socket.on('task:updated', (task) => {
        const index = tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            tasks[index] = task;
            renderTasks();
        }
        if (currentView === 'dashboard') loadDashboard();
    });

    socket.on('task:deleted', (data) => {
        tasks = tasks.filter(t => t.id !== data.id);
        renderTasks();
        if (currentView === 'dashboard') loadDashboard();
    });

    // Session events
    socket.on('sessions:status', (updatedSessions) => {
        if (typeof sessions !== 'undefined') {
            sessions = updatedSessions;
            if (currentView === 'sessions') {
                renderSessions();
            }
        }
    });
}

function updateConnectionStatus(status) {
    const indicator = document.getElementById('status-indicator');
    const dot = indicator.querySelector('div');
    const text = indicator.querySelector('span');

    dot.className = 'w-2 h-2 rounded-full';

    switch (status) {
        case 'online':
            dot.classList.add('bg-green-500');
            text.textContent = 'Leonardo Online';
            break;
        case 'offline':
            dot.classList.add('bg-red-500');
            text.textContent = 'Disconnected';
            break;
        default:
            dot.classList.add('bg-yellow-500', 'animate-pulse');
            text.textContent = 'Connecting...';
    }
}

// Close chat and return to dashboard
function closeChat() {
    showView('dashboard');
}

// View management
function showView(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.add('hidden');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected view
    const viewElement = document.getElementById(`${view}-view`);
    if (viewElement) {
        viewElement.classList.remove('hidden');
    }

    // Add active class to current nav button
    const navBtn = document.querySelector(`.nav-btn[data-view="${view}"]`);
    if (navBtn) {
        navBtn.classList.add('active');
    }

    currentView = view;

    // Load view-specific data
    switch (view) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'chat':
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                setTimeout(() => {
                    chatMessages.scrollTop = chatMessages.scrollHeight + 100;
                }, 10);
            }
            document.getElementById('chat-input')?.focus();
            break;
        case 'action-items':
            if (typeof loadActionItems === 'function') {
                loadActionItems();
            }
            break;
        case 'memory':
            loadMemoryFiles();
            break;
        case 'sessions':
            loadSessions();
            break;
        case 'files':
            loadFiles();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'gmail':
            loadGmail();
            break;
        case 'monitoring':
            loadMonitoring();
            break;
    }
}

// Export chat
async function exportChat() {
    try {
        const response = await fetch('/api/chat/export', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showToast('Chat exported!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showToast('Export failed', 'error');
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function isOverdue(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

function isToday(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Modal utilities
function closeModal() {
    const container = document.getElementById('modal-container');
    container.innerHTML = '';
}

// Close modal on backdrop click
document.getElementById('modal-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    // Cmd/Ctrl + K for quick navigation
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        showQuickNav();
    }

    // Number keys for navigation
    if (e.key === '1') showView('dashboard');
    if (e.key === '2') showView('chat');
    if (e.key === '3') showView('projects');
    if (e.key === '4') showView('tasks');
});

function showQuickNav() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <input type="text" id="quick-nav-input" placeholder="Go to..."
                class="w-full rounded-lg px-4 py-3 bg-slate-900 border border-slate-600 text-lg"
                autocomplete="off">
            <div id="quick-nav-results" class="mt-3 space-y-1">
                <div class="quick-nav-item p-2 rounded-lg hover:bg-slate-700 cursor-pointer" onclick="showView('dashboard'); closeModal();">
                    <span class="mr-2">🏠</span> Dashboard <span class="text-slate-500 text-xs ml-2">1</span>
                </div>
                <div class="quick-nav-item p-2 rounded-lg hover:bg-slate-700 cursor-pointer" onclick="showView('chat'); closeModal();">
                    <span class="mr-2">💬</span> Chat <span class="text-slate-500 text-xs ml-2">2</span>
                </div>
                <div class="quick-nav-item p-2 rounded-lg hover:bg-slate-700 cursor-pointer" onclick="showView('projects'); closeModal();">
                    <span class="mr-2">📊</span> Projects <span class="text-slate-500 text-xs ml-2">3</span>
                </div>
                <div class="quick-nav-item p-2 rounded-lg hover:bg-slate-700 cursor-pointer" onclick="showView('tasks'); closeModal();">
                    <span class="mr-2">✅</span> Tasks <span class="text-slate-500 text-xs ml-2">4</span>
                </div>
                <div class="quick-nav-item p-2 rounded-lg hover:bg-slate-700 cursor-pointer" onclick="showView('memory'); closeModal();">
                    <span class="mr-2">🧠</span> Memory
                </div>
                <div class="quick-nav-item p-2 rounded-lg hover:bg-slate-700 cursor-pointer" onclick="showView('sessions'); closeModal();">
                    <span class="mr-2">⚡</span> Sessions
                </div>
                <div class="quick-nav-item p-2 rounded-lg hover:bg-slate-700 cursor-pointer" onclick="showView('files'); closeModal();">
                    <span class="mr-2">📁</span> Files
                </div>
            </div>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
    document.getElementById('quick-nav-input').focus();
}

// Theme Management
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const html = document.documentElement;
    
    if (savedTheme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    updateThemeUI(savedTheme);
}

function updateThemeUI(theme) {
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    
    if (theme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Light Mode';
    } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark Mode';
    }
}

// Knowledge Base quick access
function openKnowledgeFile(filePath) {
    console.log('Opening knowledge file:', filePath);
    
    // Switch to files view first
    showView('files');
    
    // Wait for view to load, then navigate to the directory and view the file
    setTimeout(() => {
        if (typeof viewFile === 'function') {
            // Extract directory path
            const dir = filePath.split('/').slice(0, -1).join('/');
            
            // Load the directory first (this initializes the file browser)
            if (typeof loadFiles === 'function' && dir) {
                loadFiles(dir).then(() => {
                    // Then view the specific file
                    setTimeout(() => viewFile(filePath), 100);
                }).catch(err => {
                    console.error('Failed to load directory:', err);
                    // Try to view file directly anyway
                    viewFile(filePath);
                });
            } else {
                // No directory or loadFiles not available, try direct view
                viewFile(filePath);
            }
        } else {
            console.error('viewFile function not available');
            showToast('Failed to open file - try navigating via Files view', 'error');
        }
    }, 300);
}
