// Tasks functionality
let tasks = [];

async function loadTasks() {
    try {
        tasks = await apiCall('/api/tasks');
        renderTasks();
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

function renderTasks() {
    const pendingContainer = document.getElementById('tasks-pending');
    const completedContainer = document.getElementById('tasks-completed');
    const completedSection = document.getElementById('tasks-completed-section');

    pendingContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    // Separate pending and completed tasks
    const pending = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);

    // Render pending tasks
    if (pending.length === 0) {
        pendingContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <p>No pending tasks</p>
                <p class="text-sm mt-2">Add a task to get started</p>
            </div>
        `;
    } else {
        pending.forEach(task => {
            pendingContainer.appendChild(createTaskItem(task));
        });
    }

    // Render completed tasks
    if (completed.length > 0) {
        completedSection.classList.remove('hidden');
        document.getElementById('completed-count').textContent = completed.length;
        completed.forEach(task => {
            completedContainer.appendChild(createTaskItem(task));
        });
    } else {
        completedSection.classList.add('hidden');
    }
}

function createTaskItem(task) {
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.dataset.id = task.id;

    let dueDateHtml = '';
    if (task.due_date) {
        const dueDateClass = task.completed ? '' :
            isOverdue(task.due_date) ? 'text-red-400' :
            isToday(task.due_date) ? 'text-yellow-400' : 'text-slate-400';
        dueDateHtml = `<span class="text-xs ${dueDateClass}">${formatDate(task.due_date)}</span>`;
    }

    const priorityIndicator = task.priority === 'high' ?
        '<span class="w-2 h-2 bg-red-500 rounded-full" title="High priority"></span>' :
        task.priority === 'medium' ?
        '<span class="w-2 h-2 bg-yellow-500 rounded-full" title="Medium priority"></span>' :
        '<span class="w-2 h-2 bg-green-500 rounded-full" title="Low priority"></span>';

    item.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}
            onchange="toggleTask(${task.id}, this.checked)">
        ${priorityIndicator}
        <span class="task-title flex-1">${escapeHtml(task.title)}</span>
        ${dueDateHtml}
        <button onclick="editTask(${task.id})" class="text-slate-400 hover:text-white p-1" title="Edit">
            ✏️
        </button>
        <button onclick="deleteTask(${task.id})" class="text-slate-400 hover:text-red-400 p-1" title="Delete">
            🗑️
        </button>
    `;

    return item;
}

async function toggleTask(id, completed) {
    try {
        await apiCall(`/api/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ completed: completed ? 1 : 0 })
        });

        // Update local state
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = completed ? 1 : 0;
            renderTasks();
        }
    } catch (error) {
        console.error('Failed to update task:', error);
        loadTasks(); // Reload on error
    }
}

async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;

    try {
        await apiCall(`/api/tasks/${id}`, { method: 'DELETE' });
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
    } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task');
    }
}

function showNewTaskModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">New Task</h2>
            <form id="new-task-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Title *</label>
                    <input type="text" name="title" required
                        class="w-full rounded-lg px-3 py-2" placeholder="What needs to be done?">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold mb-1">Priority</label>
                        <select name="priority" class="w-full rounded-lg px-3 py-2">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1">Due Date</label>
                        <input type="date" name="due_date" class="w-full rounded-lg px-3 py-2">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Link to Project</label>
                    <select name="project_id" class="w-full rounded-lg px-3 py-2">
                        <option value="">No project</option>
                        ${projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('')}
                    </select>
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 transition">
                        Create Task
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);

    // Focus title input
    modal.querySelector('input[name="title"]').focus();

    document.getElementById('new-task-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Remove empty values
        Object.keys(data).forEach(key => {
            if (data[key] === '') delete data[key];
        });

        try {
            await apiCall('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            closeModal();
            await loadTasks();
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('Failed to create task');
        }
    };
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">Edit Task</h2>
            <form id="edit-task-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Title *</label>
                    <input type="text" name="title" required value="${escapeHtml(task.title)}"
                        class="w-full rounded-lg px-3 py-2">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold mb-1">Priority</label>
                        <select name="priority" class="w-full rounded-lg px-3 py-2">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1">Due Date</label>
                        <input type="date" name="due_date" value="${task.due_date || ''}"
                            class="w-full rounded-lg px-3 py-2">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Link to Project</label>
                    <select name="project_id" class="w-full rounded-lg px-3 py-2">
                        <option value="">No project</option>
                        ${projects.map(p => `<option value="${p.id}" ${task.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('')}
                    </select>
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 transition">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);

    document.getElementById('edit-task-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Handle empty project_id
        if (data.project_id === '') {
            data.project_id = null;
        }

        try {
            await apiCall(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            closeModal();
            await loadTasks();
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Failed to update task');
        }
    };
}
