// Projects functionality
let projects = [];
let sortables = [];

async function loadProjects() {
    try {
        projects = await apiCall('/api/projects');
        renderProjects();
        initDragAndDrop();
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

function renderProjects() {
    const statuses = ['backlog', 'in_progress', 'blocked', 'done'];

    // Clear all columns and update counts
    statuses.forEach(status => {
        const column = document.getElementById(`${status}-column`);
        column.innerHTML = '';

        const count = projects.filter(p => p.status === status).length;
        const countEl = document.getElementById(`${status}-count`);
        if (countEl) countEl.textContent = count;
    });

    // Render projects into columns
    projects.forEach(project => {
        const card = createProjectCard(project);
        const column = document.getElementById(`${project.status}-column`);
        if (column) {
            column.appendChild(card);
        }
    });

    // Add empty state to empty columns
    statuses.forEach(status => {
        const column = document.getElementById(`${status}-column`);
        if (column && column.children.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-center text-slate-500 text-sm py-8';
            emptyDiv.textContent = 'Drop projects here';
            column.appendChild(emptyDiv);
        }
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = `project-card ${project.priority}`;
    card.dataset.id = project.id;

    const tags = project.tags ? project.tags.split(',').map(t =>
        `<span class="tag">${escapeHtml(t.trim())}</span>`
    ).join('') : '';

    let dueDateHtml = '';
    if (project.due_date) {
        const dueDateClass = isOverdue(project.due_date) ? 'overdue' :
                            isToday(project.due_date) ? 'today' : '';
        dueDateHtml = `<div class="due-date ${dueDateClass}">Due: ${formatDate(project.due_date)}</div>`;
    }

    const assigneeHtml = project.assignee ?
        `<div class="assignee-badge">${escapeHtml(project.assignee)}</div>` : '';

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="font-semibold text-sm">${escapeHtml(project.title)}</div>
            <button onclick="event.stopPropagation(); showProjectMenu(${project.id})" class="text-slate-400 hover:text-white p-1 -mr-1">
                ⋮
            </button>
        </div>
        ${project.description ? `<div class="text-xs text-slate-400 mt-1 line-clamp-2">${escapeHtml(project.description)}</div>` : ''}
        ${tags ? `<div class="mt-2">${tags}</div>` : ''}
        ${dueDateHtml}
        ${assigneeHtml}
    `;

    card.onclick = () => showProjectDetails(project);

    return card;
}

function initDragAndDrop() {
    // Destroy existing sortables
    sortables.forEach(s => s.destroy());
    sortables = [];

    const statuses = ['backlog', 'in_progress', 'blocked', 'done'];

    statuses.forEach(status => {
        const column = document.getElementById(`${status}-column`);
        if (!column) return;

        const sortable = new Sortable(column, {
            group: 'projects',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            filter: '.text-center', // Don't drag empty state text
            onEnd: async (evt) => {
                // Remove any "empty state" text elements that might be in the way
                const emptyStates = document.querySelectorAll('.text-center.text-slate-500');
                emptyStates.forEach(el => el.remove());

                const projectId = evt.item.dataset.id;
                const newStatus = evt.to.id.replace('-column', '');

                try {
                    await apiCall(`/api/projects/${projectId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: newStatus })
                    });

                    // Update local state
                    const project = projects.find(p => p.id == projectId);
                    if (project) {
                        project.status = newStatus;
                    }

                    // Update counts
                    renderProjects();
                } catch (error) {
                    console.error('Failed to update project:', error);
                    loadProjects(); // Reload on error
                }
            }
        });

        sortables.push(sortable);
    });
}

function showNewProjectModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">New Project</h2>
            <form id="new-project-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Title *</label>
                    <input type="text" name="title" required
                        class="w-full rounded-lg px-3 py-2" placeholder="Project name">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Description</label>
                    <textarea name="description" rows="3"
                        class="w-full rounded-lg px-3 py-2" placeholder="What is this project about?"></textarea>
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
                        <label class="block text-sm font-semibold mb-1">Assignee</label>
                        <select name="assignee" class="w-full rounded-lg px-3 py-2">
                            <option value="">None</option>
                            <option value="leonardo">Leonardo</option>
                            <option value="claude_code">Claude Code</option>
                            <option value="richard">Richard</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold mb-1">Due Date</label>
                        <input type="date" name="due_date" class="w-full rounded-lg px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1">Status</label>
                        <select name="status" class="w-full rounded-lg px-3 py-2">
                            <option value="backlog" selected>Backlog</option>
                            <option value="in_progress">In Progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Tags</label>
                    <input type="text" name="tags" class="w-full rounded-lg px-3 py-2"
                        placeholder="marketing, development (comma-separated)">
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 transition">
                        Create Project
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);

    // Focus title input
    modal.querySelector('input[name="title"]').focus();

    document.getElementById('new-project-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Remove empty values
        Object.keys(data).forEach(key => {
            if (data[key] === '') delete data[key];
        });

        try {
            await apiCall('/api/projects', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            closeModal();
            await loadProjects();
        } catch (error) {
            console.error('Failed to create project:', error);
            alert('Failed to create project');
        }
    };
}

function showProjectDetails(project) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    const tags = project.tags ? project.tags.split(',').map(t =>
        `<span class="tag">${escapeHtml(t.trim())}</span>`
    ).join('') : '<span class="text-slate-500">No tags</span>';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-xl font-bold">${escapeHtml(project.title)}</h2>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="text-sm text-slate-400">Description</label>
                    <p class="mt-1">${project.description ? escapeHtml(project.description) : '<span class="text-slate-500">No description</span>'}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-slate-400">Status</label>
                        <p class="mt-1 capitalize">${project.status.replace('_', ' ')}</p>
                    </div>
                    <div>
                        <label class="text-sm text-slate-400">Priority</label>
                        <p class="mt-1 capitalize priority-${project.priority}">${project.priority}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-slate-400">Assignee</label>
                        <p class="mt-1">${project.assignee || '<span class="text-slate-500">Unassigned</span>'}</p>
                    </div>
                    <div>
                        <label class="text-sm text-slate-400">Due Date</label>
                        <p class="mt-1">${project.due_date ? formatDate(project.due_date) : '<span class="text-slate-500">No due date</span>'}</p>
                    </div>
                </div>

                <div>
                    <label class="text-sm text-slate-400">Tags</label>
                    <div class="mt-1">${tags}</div>
                </div>

                <div class="text-xs text-slate-500 mt-4">
                    Created: ${new Date(project.created_at).toLocaleString()}
                </div>
            </div>

            <div class="flex gap-2 justify-end pt-6 border-t border-slate-700 mt-6">
                <button onclick="editProject(${project.id})"
                    class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                    Edit
                </button>
                <button onclick="deleteProject(${project.id})"
                    class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition">
                    Delete
                </button>
            </div>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);
}

function showProjectMenu(projectId) {
    // Simple context menu - could be expanded
    const project = projects.find(p => p.id === projectId);
    if (project) {
        showProjectDetails(project);
    }
}

async function editProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    closeModal();

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">Edit Project</h2>
            <form id="edit-project-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Title *</label>
                    <input type="text" name="title" required value="${escapeHtml(project.title)}"
                        class="w-full rounded-lg px-3 py-2">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Description</label>
                    <textarea name="description" rows="3"
                        class="w-full rounded-lg px-3 py-2">${escapeHtml(project.description || '')}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold mb-1">Priority</label>
                        <select name="priority" class="w-full rounded-lg px-3 py-2">
                            <option value="low" ${project.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${project.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${project.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1">Assignee</label>
                        <select name="assignee" class="w-full rounded-lg px-3 py-2">
                            <option value="" ${!project.assignee ? 'selected' : ''}>None</option>
                            <option value="leonardo" ${project.assignee === 'leonardo' ? 'selected' : ''}>Leonardo</option>
                            <option value="claude_code" ${project.assignee === 'claude_code' ? 'selected' : ''}>Claude Code</option>
                            <option value="richard" ${project.assignee === 'richard' ? 'selected' : ''}>Richard</option>
                            <option value="admin" ${project.assignee === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold mb-1">Due Date</label>
                        <input type="date" name="due_date" value="${project.due_date || ''}"
                            class="w-full rounded-lg px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1">Status</label>
                        <select name="status" class="w-full rounded-lg px-3 py-2">
                            <option value="backlog" ${project.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                            <option value="in_progress" ${project.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="blocked" ${project.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                            <option value="done" ${project.status === 'done' ? 'selected' : ''}>Done</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Tags</label>
                    <input type="text" name="tags" value="${escapeHtml(project.tags || '')}"
                        class="w-full rounded-lg px-3 py-2" placeholder="marketing, development">
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

    document.getElementById('edit-project-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await apiCall(`/api/projects/${projectId}`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            closeModal();
            await loadProjects();
        } catch (error) {
            console.error('Failed to update project:', error);
            alert('Failed to update project');
        }
    };
}

async function deleteProject(projectId) {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    try {
        await apiCall(`/api/projects/${projectId}`, { method: 'DELETE' });
        closeModal();
        await loadProjects();
    } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project');
    }
}
