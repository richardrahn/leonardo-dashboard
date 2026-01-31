// Quick Actions Hub

/**
 * Quick Actions - One-click tasks for common operations
 */

const quickActions = [
    {
        id: 'daily-standup',
        icon: '📝',
        label: 'Daily Standup',
        description: 'Create today\'s standup note',
        action: createDailyStandup,
        category: 'notes'
    },
    {
        id: 'check-email',
        icon: '📧',
        label: 'Check Email',
        description: 'Review unread emails',
        action: () => showView('gmail'),
        category: 'email'
    },
    {
        id: 'review-calendar',
        icon: '📅',
        label: 'Review Calendar',
        description: 'See today\'s schedule',
        action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        category: 'calendar'
    },
    {
        id: 'focus-mode',
        icon: '🎯',
        label: 'Focus Mode',
        description: 'Block 2 hours for deep work',
        action: setFocusMode,
        category: 'productivity'
    },
    {
        id: 'quick-task',
        icon: '✅',
        label: 'Quick Task',
        description: 'Add a task fast',
        action: () => showNewTaskModal(),
        category: 'tasks'
    },
    {
        id: 'chat-leo',
        icon: '💬',
        label: 'Ask Leonardo',
        description: 'Quick chat',
        action: () => showView('chat'),
        category: 'assistant'
    },
];

/**
 * Render quick actions in the dashboard
 */
function renderQuickActions() {
    const container = document.getElementById('quick-actions-hub');
    if (!container) return;

    const actionsHtml = quickActions.map(action => `
        <button 
            onclick="executeQuickAction('${action.id}')"
            class="quick-action-btn group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-xl p-4 transition-all duration-200 transform hover:scale-105 hover:shadow-lg text-left"
            title="${escapeHtml(action.description)}"
        >
            <div class="flex items-center gap-3">
                <span class="text-3xl group-hover:scale-110 transition-transform">${action.icon}</span>
                <div>
                    <div class="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        ${escapeHtml(action.label)}
                    </div>
                    <div class="text-xs text-slate-500 mt-0.5">
                        ${escapeHtml(action.description)}
                    </div>
                </div>
            </div>
        </button>
    `).join('');

    container.innerHTML = actionsHtml;
}

/**
 * Execute a quick action by ID
 */
function executeQuickAction(actionId) {
    const action = quickActions.find(a => a.id === actionId);
    if (!action) {
        console.error(`Quick action not found: ${actionId}`);
        return;
    }

    console.log(`[Quick Actions] Executing: ${action.label}`);
    
    try {
        action.action();
    } catch (error) {
        console.error(`[Quick Actions] Failed to execute ${actionId}:`, error);
        showToast(`Failed to execute: ${action.label}`, 'error');
    }
}

/**
 * Create daily standup note
 */
async function createDailyStandup() {
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const template = `# Daily Standup - ${today}

## What I accomplished yesterday
- 

## What I'm working on today
- 

## Blockers
- None

## Notes
- 
`;

    try {
        await apiCall('/api/memory/quick-add', {
            method: 'POST',
            body: JSON.stringify({
                content: template,
                category: 'standup'
            })
        });

        showToast('✅ Daily standup note created!', 'success');
        showView('memory');
    } catch (error) {
        console.error('[Quick Actions] Failed to create standup:', error);
        showToast('Failed to create standup note', 'error');
    }
}

/**
 * Set focus mode (block 2 hours for deep work)
 */
async function setFocusMode() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content max-w-md">
            <h2 class="text-xl font-bold mb-4">🎯 Focus Mode</h2>
            <p class="text-slate-400 mb-4">
                Block time for deep, uninterrupted work. This will:
            </p>
            <ul class="list-disc list-inside text-slate-300 space-y-2 mb-6">
                <li>Send you a reminder to silence notifications</li>
                <li>Log a focus session in your activity</li>
                <li>Optionally create a calendar block (coming soon)</li>
            </ul>
            <form id="focus-mode-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Duration</label>
                    <select name="duration" class="w-full rounded-lg px-3 py-2">
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120" selected>2 hours</option>
                        <option value="180">3 hours</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">What are you focusing on?</label>
                    <input type="text" name="task" required
                        class="w-full rounded-lg px-3 py-2"
                        placeholder="e.g., Writing proposal, Coding feature">
                </div>
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        🎯 Start Focus Session
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('modal-container').appendChild(modal);

    document.getElementById('focus-mode-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const duration = formData.get('duration');
        const task = formData.get('task');

        try {
            // Log activity
            await apiCall('/api/memory/quick-add', {
                method: 'POST',
                body: JSON.stringify({
                    content: `🎯 Focus Session: ${task} (${duration} minutes)\nStarted: ${new Date().toLocaleTimeString()}`,
                    category: 'focus'
                })
            });

            closeModal();
            showToast(`🎯 Focus mode activated! ${duration} minutes on: ${task}`, 'success');

            // Set timer reminder
            setTimeout(() => {
                showToast(`✅ Focus session complete! Great work on: ${task}`, 'success');
            }, parseInt(duration) * 60 * 1000);

        } catch (error) {
            console.error('[Quick Actions] Failed to start focus mode:', error);
            showToast('Failed to start focus mode', 'error');
        }
    };
}

/**
 * Initialize quick actions on dashboard load
 */
function initQuickActions() {
    renderQuickActions();
}
