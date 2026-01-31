// Dashboard functionality

async function loadDashboard() {
    try {
        await Promise.all([
            loadDashboardStats(),
            loadFocusItems(),
            loadActivityFeed(),
            initializeCalendar(),
            loadMorningBriefing(),
            loadWeather()
        ]);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

async function loadDashboardStats() {
    try {
        const stats = await apiCall('/api/system/stats');

        // Update stat cards
        document.getElementById('stat-projects').textContent =
            stats.projects?.in_progress || 0;
        document.getElementById('stat-tasks').textContent =
            (stats.tasks?.due_today || 0) + (stats.tasks?.overdue || 0);
        document.getElementById('stat-completed').textContent =
            stats.tasks?.completed || 0;
        document.getElementById('stat-messages').textContent =
            stats.chat?.total_today || 0;

    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadFocusItems() {
    try {
        const focus = await apiCall('/api/system/focus');

        // Render focus tasks
        const tasksContainer = document.getElementById('focus-tasks');
        if (focus.tasks && focus.tasks.length > 0) {
            tasksContainer.innerHTML = focus.tasks.map(task => `
                <div class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                     onclick="showView('tasks')">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}
                           onclick="event.stopPropagation(); toggleTask(${task.id}, this.checked)">
                    <span class="flex-1 ${task.completed ? 'line-through opacity-50' : ''}">${escapeHtml(task.title)}</span>
                    ${task.due_date ? `<span class="text-xs ${isOverdue(task.due_date) ? 'text-red-400' : 'text-slate-400'}">${formatDate(task.due_date)}</span>` : ''}
                    ${task.priority === 'high' ? '<span class="w-2 h-2 bg-red-500 rounded-full"></span>' : ''}
                </div>
            `).join('');
        } else {
            tasksContainer.innerHTML = `
                <div class="text-center py-4 text-slate-500">
                    <p>No urgent tasks</p>
                    <button onclick="showNewTaskModal()" class="text-primary hover:underline mt-2 text-sm">Add a task</button>
                </div>
            `;
        }

        // Render focus projects
        const projectsContainer = document.getElementById('focus-projects');
        if (focus.projects && focus.projects.length > 0) {
            projectsContainer.innerHTML = focus.projects.map(project => `
                <div class="p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition cursor-pointer border-l-4 ${getPriorityBorderColor(project.priority)}"
                     onclick="showView('projects')">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="font-medium">${escapeHtml(project.title)}</div>
                            <div class="text-sm text-slate-400 mt-1">${escapeHtml(project.description || 'No description')}</div>
                        </div>
                        <span class="text-xs px-2 py-1 rounded-full ${getStatusBgColor(project.status)}">${formatStatus(project.status)}</span>
                    </div>
                    ${project.tags ? `<div class="mt-2">${project.tags.split(',').map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
                </div>
            `).join('');
        } else {
            projectsContainer.innerHTML = `
                <div class="text-center py-4 text-slate-500">
                    <p>No active projects</p>
                    <button onclick="showNewProjectModal()" class="text-primary hover:underline mt-2 text-sm">Create a project</button>
                </div>
            `;
        }

    } catch (error) {
        console.error('Failed to load focus items:', error);
    }
}

async function loadActivityFeed() {
    try {
        const activity = await apiCall('/api/system/activity?limit=15');
        const container = document.getElementById('activity-feed');

        if (activity && activity.length > 0) {
            container.innerHTML = activity.map(item => `
                <div class="flex items-start gap-3 text-sm">
                    <span class="text-lg">${getActivityIcon(item.activity_type)}</span>
                    <div class="flex-1 min-w-0">
                        <div class="text-slate-300">${escapeHtml(item.description)}</div>
                        <div class="text-xs text-slate-500">${formatTimeAgo(item.timestamp)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-4 text-slate-500">
                    <p>No recent activity</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Failed to load activity feed:', error);
    }
}

// Quick note modal
function showQuickNoteModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">📝 Quick Note</h2>
            <form id="quick-note-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Note</label>
                    <textarea name="content" rows="5" required
                        class="w-full rounded-lg px-3 py-2 resize-none"
                        placeholder="Write your note here..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Category</label>
                    <select name="category" class="w-full rounded-lg px-3 py-2">
                        <option value="notes">Notes</option>
                        <option value="ideas">Ideas</option>
                        <option value="meetings">Meetings</option>
                        <option value="research">Research</option>
                    </select>
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        Save Note
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
    modal.querySelector('textarea').focus();

    document.getElementById('quick-note-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await apiCall('/api/memory/quick-add', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            closeModal();
            showToast('Note saved!', 'success');
            loadActivityFeed();
        } catch (error) {
            console.error('Failed to save note:', error);
            showToast('Failed to save note', 'error');
        }
    };
}

// Helper functions
function getActivityIcon(type) {
    const icons = {
        'chat_message': '💬',
        'project_created': '📊',
        'project_updated': '✏️',
        'project_deleted': '🗑️',
        'task_created': '✅',
        'task_updated': '✏️',
        'task_deleted': '🗑️',
        'memory_updated': '🧠',
        'memory_created': '📝',
        'memory_quick_add': '📝',
        'session_spawned': '⚡',
        'session_killed': '💀',
        'file_created': '📄',
        'file_updated': '✏️',
        'file_deleted': '🗑️',
        'login': '🔐',
        'chat_cleared': '🧹'
    };
    return icons[type] || '📌';
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function getPriorityBorderColor(priority) {
    const colors = {
        'high': 'border-red-500',
        'medium': 'border-amber-500',
        'low': 'border-green-500'
    };
    return colors[priority] || 'border-slate-500';
}

function getStatusBgColor(status) {
    const colors = {
        'backlog': 'bg-slate-600',
        'in_progress': 'bg-blue-600',
        'blocked': 'bg-orange-600',
        'done': 'bg-green-600'
    };
    return colors[status] || 'bg-slate-600';
}

function formatStatus(status) {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const bgColors = {
        'success': 'bg-green-600',
        'error': 'bg-red-600',
        'info': 'bg-blue-600',
        'warning': 'bg-amber-600'
    };

    toast.className = `${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg animate-slide-up flex items-center gap-2`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-2 hover:opacity-70">✕</button>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.remove();
    }, 4000);
}
