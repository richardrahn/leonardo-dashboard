// Action Items functionality
let actionItems = [];
let currentDepartment = 'strategic';
let itemSortables = [];

const DEPARTMENTS = {
    'strategic': { name: 'Strategic Planning', icon: '📊', file: 'ezbelta/departments/strategic-planning/ACTION-ITEMS.md' },
    'marketing': { name: 'Branding & Marketing', icon: '📢', file: 'ezbelta/departments/branding-marketing/ACTION-ITEMS.md' },
    'security': { name: 'Security & Deployment', icon: '🔒', file: 'ezbelta/departments/security-deployment/ACTION-ITEMS.md' },
    'finance': { name: 'Finance & Accounting', icon: '💰', file: 'departments/finance/ACTION-ITEMS.md' },
    'product': { name: 'Product Development', icon: '🚀', file: 'departments/product/ACTION-ITEMS.md' },
    'operations': { name: 'Operations', icon: '⚙️', file: 'departments/operations/ACTION-ITEMS.md' },
    'sales': { name: 'Sales & Growth', icon: '📈', file: 'departments/sales-marketing/ACTION-ITEMS.md' },
    'support': { name: 'Customer Support', icon: '🎧', file: 'departments/customer-support/ACTION-ITEMS.md' }
};

const PRIORITIES = {
    'urgent': { label: 'URGENT', icon: '🔴', color: 'red' },
    'this-week': { label: 'THIS WEEK', icon: '🟡', color: 'amber' },
    'this-month': { label: 'THIS MONTH', icon: '🟢', color: 'green' },
    'future': { label: 'FUTURE', icon: '🔵', color: 'blue' },
    'completed': { label: 'COMPLETED', icon: '✅', color: 'emerald' }
};

async function loadActionItems() {
    try {
        // Load from localStorage (will eventually load from server/files)
        const saved = localStorage.getItem('leonardo-action-items');
        if (saved) {
            actionItems = JSON.parse(saved);
        } else {
            // Initialize with sample data from ACTION-ITEMS.md files
            actionItems = await initializeActionItems();
        }
        
        renderActionItems();
        initItemDragAndDrop();
    } catch (error) {
        console.error('Failed to load action items:', error);
        actionItems = await initializeActionItems();
        renderActionItems();
    }
}

async function initializeActionItems() {
    // Initialize from the ACTION-ITEMS.md files we created
    const items = [];
    
    // Strategic Planning items
    items.push(
        { id: 1, department: 'strategic', priority: 'urgent', title: 'Review Department Structure', description: 'Ensure organizational structure makes sense before building on it', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 2, department: 'strategic', priority: 'urgent', title: 'Open Leonardo Dashboard', description: 'See your strategic command center', timeEstimate: '10 min', completed: false, notes: '', chatHistory: [] },
        { id: 3, department: 'strategic', priority: 'this-week', title: 'Gather Baseline Metrics', description: 'Provide current counts for Lean Design Studio, MailChimp, LinkedIn', timeEstimate: '20 min', completed: false, notes: '', chatHistory: [] },
        { id: 4, department: 'strategic', priority: 'this-week', title: 'Set Webinar Date', description: 'Choose specific date and time for webinar', timeEstimate: '10 min', completed: false, notes: '', chatHistory: [] },
        { id: 5, department: 'strategic', priority: 'this-month', title: 'Review and Approve Roadmap', description: 'Ensure strategic direction aligns with your vision', timeEstimate: '45 min', completed: false, notes: '', chatHistory: [] }
    );
    
    // Branding & Marketing items
    items.push(
        { id: 101, department: 'marketing', priority: 'urgent', title: 'Complete Webinar Planning Survey', description: 'Critical path - blocks presentation creation', timeEstimate: '45 min', completed: false, notes: '', chatHistory: [] },
        { id: 102, department: 'marketing', priority: 'urgent', title: 'Choose Webinar Date & Time', description: 'Less than 2 weeks out - need to send invitations', timeEstimate: '10 min', completed: false, notes: '', chatHistory: [] },
        { id: 103, department: 'marketing', priority: 'urgent', title: 'Provide Brand Assets', description: 'Logo, colors, screenshots for PowerPoint and registration page', timeEstimate: '20 min', completed: false, notes: '', chatHistory: [] },
        { id: 104, department: 'marketing', priority: 'this-week', title: 'Review Webinar Presentation Outline', description: 'Ensure message aligns with your vision', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 105, department: 'marketing', priority: 'this-week', title: 'Draft Registration Page Copy', description: 'Compelling copy to drive registrations', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] }
    );
    
    // Security & Deployment items
    items.push(
        { id: 201, department: 'security', priority: 'urgent', title: 'Define Security Non-Negotiables', description: 'Foundation for all deployment decisions', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 202, department: 'security', priority: 'urgent', title: 'Review Digital Twin Security', description: 'First product going to production', timeEstimate: '45 min', completed: false, notes: '', chatHistory: [] },
        { id: 203, department: 'security', priority: 'this-week', title: 'Choose Hosting Platform', description: 'Blocks deployment of all products', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 204, department: 'security', priority: 'this-week', title: 'Define Authentication Strategy', description: 'Every app needs user login', timeEstimate: '20 min', completed: false, notes: '', chatHistory: [] },
        { id: 205, department: 'security', priority: 'this-month', title: 'Database Architecture Decision', description: 'Critical for multi-tenant scalability', timeEstimate: '60 min', completed: false, notes: '', chatHistory: [] }
    );
    
    // Finance & Accounting items
    items.push(
        { id: 301, department: 'finance', priority: 'urgent', title: 'Set Up Stripe Account', description: 'Required to accept customer payments', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 302, department: 'finance', priority: 'this-week', title: 'Research Accounting Software', description: 'QuickBooks vs. Wave vs. FreshBooks', timeEstimate: '45 min', completed: false, notes: '', chatHistory: [] },
        { id: 303, department: 'finance', priority: 'this-week', title: 'Create Invoice Templates', description: 'Professional templates for future billing', timeEstimate: '20 min', completed: false, notes: '', chatHistory: [] },
        { id: 304, department: 'finance', priority: 'this-month', title: 'Define Pricing Strategy', description: 'Finalize pricing tiers and annual discounts', timeEstimate: '60 min', completed: false, notes: '', chatHistory: [] },
        { id: 305, department: 'finance', priority: 'this-month', title: 'Set Up Expense Tracking', description: 'Track monthly infrastructure and marketing costs', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 306, department: 'finance', priority: 'future', title: 'Plan Quarterly Tax Estimates', description: 'When revenue starts flowing', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] }
    );
    
    // Product Development items
    items.push(
        { id: 401, department: 'product', priority: 'urgent', title: 'Complete Leonardo Dashboard v1.0', description: 'Finish Gmail integration and mobile responsiveness', timeEstimate: '2 hours', completed: false, notes: '', chatHistory: [] },
        { id: 402, department: 'product', priority: 'urgent', title: 'Fix Chat Scroll Behavior', description: 'Ensure smooth user experience', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 403, department: 'product', priority: 'this-week', title: 'Conduct VSM Tool Market Research', description: 'Analyze competitors and identify gaps', timeEstimate: '2 hours', completed: false, notes: '', chatHistory: [] },
        { id: 404, department: 'product', priority: 'this-week', title: 'Draft Value Stream Mapper Spec', description: 'Define features and user flows', timeEstimate: '90 min', completed: false, notes: '', chatHistory: [] },
        { id: 405, department: 'product', priority: 'this-month', title: 'Prototype A3 Problem Solving Tool', description: 'Initial concept and wireframes', timeEstimate: '3 hours', completed: false, notes: '', chatHistory: [] },
        { id: 406, department: 'product', priority: 'this-month', title: 'Add Automated Testing Suite', description: 'Reduce technical debt', timeEstimate: '4 hours', completed: false, notes: '', chatHistory: [] },
        { id: 407, department: 'product', priority: 'future', title: 'Plan Voice Commands Feature', description: 'User-requested enhancement for Q2', timeEstimate: '60 min', completed: false, notes: '', chatHistory: [] }
    );
    
    // Operations items
    items.push(
        { id: 501, department: 'operations', priority: 'urgent', title: 'Purchase Domain (ezbelta.com)', description: 'Secure the domain before launch', timeEstimate: '15 min', completed: false, notes: '', chatHistory: [] },
        { id: 502, department: 'operations', priority: 'this-week', title: 'Choose Cloud Provider', description: 'DigitalOcean, AWS, or Railway for hosting', timeEstimate: '45 min', completed: false, notes: '', chatHistory: [] },
        { id: 503, department: 'operations', priority: 'this-week', title: 'Create Production Deployment Plan', description: 'Document step-by-step deployment process', timeEstimate: '60 min', completed: false, notes: '', chatHistory: [] },
        { id: 504, department: 'operations', priority: 'this-month', title: 'Migrate SQLite to PostgreSQL', description: 'Required for production scalability', timeEstimate: '3 hours', completed: false, notes: '', chatHistory: [] },
        { id: 505, department: 'operations', priority: 'this-month', title: 'Set Up Monitoring & Alerts', description: 'UptimeRobot or Sentry for system health', timeEstimate: '90 min', completed: false, notes: '', chatHistory: [] },
        { id: 506, department: 'operations', priority: 'this-month', title: 'Configure SSL/HTTPS', description: 'Security essential for production', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 507, department: 'operations', priority: 'future', title: 'Implement Backup Strategy', description: 'Daily database backups + off-site storage', timeEstimate: '60 min', completed: false, notes: '', chatHistory: [] }
    );
    
    // Sales & Growth items
    items.push(
        { id: 601, department: 'sales', priority: 'urgent', title: 'Finalize Webinar Date', description: 'Choose specific date and time - needed ASAP', timeEstimate: '10 min', completed: false, notes: '', chatHistory: [] },
        { id: 602, department: 'sales', priority: 'urgent', title: 'Send Webinar Invitations', description: 'To existing Lean Design Studio audience', timeEstimate: '30 min', completed: false, notes: '', chatHistory: [] },
        { id: 603, department: 'sales', priority: 'this-week', title: 'Create Landing Page', description: 'For webinar registration and product interest', timeEstimate: '2 hours', completed: false, notes: '', chatHistory: [] },
        { id: 604, department: 'sales', priority: 'this-week', title: 'Prepare LinkedIn Launch Posts', description: 'Announce webinar and gather interest', timeEstimate: '45 min', completed: false, notes: '', chatHistory: [] },
        { id: 605, department: 'sales', priority: 'this-month', title: 'Identify Target Customers', description: 'List of 50 ideal prospects from consulting network', timeEstimate: '90 min', completed: false, notes: '', chatHistory: [] },
        { id: 606, department: 'sales', priority: 'this-month', title: 'Draft Sales Playbook', description: 'How to position value and handle objections', timeEstimate: '2 hours', completed: false, notes: '', chatHistory: [] },
        { id: 607, department: 'sales', priority: 'future', title: 'Set Up Email Nurture Sequence', description: 'For webinar attendees and leads', timeEstimate: '3 hours', completed: false, notes: '', chatHistory: [] }
    );
    
    // Customer Support items
    items.push(
        { id: 701, department: 'support', priority: 'this-week', title: 'Create FAQ Document', description: 'Common questions about products and pricing', timeEstimate: '60 min', completed: false, notes: '', chatHistory: [] },
        { id: 702, department: 'support', priority: 'this-week', title: 'Set Up Support Email', description: 'support@ezbelta.com with auto-responder', timeEstimate: '20 min', completed: false, notes: '', chatHistory: [] },
        { id: 703, department: 'support', priority: 'this-month', title: 'Write Onboarding Guide', description: 'Help new customers get started quickly', timeEstimate: '2 hours', completed: false, notes: '', chatHistory: [] },
        { id: 704, department: 'support', priority: 'this-month', title: 'Create Product Demo Videos', description: 'Short tutorials for each feature', timeEstimate: '4 hours', completed: false, notes: '', chatHistory: [] },
        { id: 705, department: 'support', priority: 'this-month', title: 'Draft Terms of Service', description: 'Legal protection for both parties', timeEstimate: '90 min', completed: false, notes: '', chatHistory: [] },
        { id: 706, department: 'support', priority: 'future', title: 'Implement Live Chat Widget', description: 'For real-time customer support', timeEstimate: '60 min', completed: false, notes: '', chatHistory: [] },
        { id: 707, department: 'support', priority: 'future', title: 'Build Knowledge Base', description: 'Self-service documentation portal', timeEstimate: '6 hours', completed: false, notes: '', chatHistory: [] }
    );
    
    return items;
}

function renderActionItems() {
    const department = currentDepartment;
    const deptItems = actionItems.filter(item => item.department === department);
    
    // Update department header
    const deptInfo = DEPARTMENTS[department];
    document.getElementById('action-items-dept-name').textContent = deptInfo.icon + ' ' + deptInfo.name;
    
    // Clear all columns
    Object.keys(PRIORITIES).forEach(priority => {
        const column = document.getElementById(`items-${priority}-column`);
        if (column) column.innerHTML = '';
    });
    
    // Render items into columns
    deptItems.forEach(item => {
        const card = createActionItemCard(item);
        const column = document.getElementById(`items-${item.priority}-column`);
        if (column) {
            column.appendChild(card);
        }
    });
    
    // Update counts
    Object.keys(PRIORITIES).forEach(priority => {
        const count = deptItems.filter(item => item.priority === priority).length;
        const countEl = document.getElementById(`items-${priority}-count`);
        if (countEl) countEl.textContent = count;
    });
    
    // Add empty states
    Object.keys(PRIORITIES).forEach(priority => {
        const column = document.getElementById(`items-${priority}-column`);
        if (column && column.children.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-center text-slate-500 text-sm py-8';
            emptyDiv.textContent = 'No items';
            column.appendChild(emptyDiv);
        }
    });
}

function createActionItemCard(item) {
    const card = document.createElement('div');
    card.className = 'action-item-card';
    card.dataset.id = item.id;
    
    const completedClass = item.completed ? 'opacity-50 line-through' : '';
    const hasNotes = item.notes && item.notes.trim().length > 0;
    const hasChatHistory = item.chatHistory && item.chatHistory.length > 0;
    
    card.innerHTML = `
        <div class="flex items-start gap-3">
            <input type="checkbox" 
                   class="task-checkbox mt-1 flex-shrink-0" 
                   ${item.completed ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleItemComplete(${item.id}, this.checked)">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <div class="font-semibold text-sm ${completedClass}">${escapeHtml(item.title)}</div>
                    ${hasNotes ? '<span class="text-xs" title="Has notes">📝</span>' : ''}
                    ${hasChatHistory ? '<span class="text-xs" title="Has chat messages">💬</span>' : ''}
                </div>
                ${item.description ? `<div class="text-xs text-slate-400 mt-1">${escapeHtml(item.description)}</div>` : ''}
                ${item.timeEstimate ? `<div class="text-xs text-slate-500 mt-2">⏱️ ${escapeHtml(item.timeEstimate)}</div>` : ''}
            </div>
            <button onclick="event.stopPropagation(); showItemMenu(${item.id})" 
                    class="text-slate-400 hover:text-white p-1 -mr-1 flex-shrink-0">
                ⋮
            </button>
        </div>
    `;
    
    card.onclick = () => showItemDetails(item);
    
    return card;
}

function initItemDragAndDrop() {
    // Destroy existing sortables
    itemSortables.forEach(s => s.destroy());
    itemSortables = [];
    
    Object.keys(PRIORITIES).forEach(priority => {
        const column = document.getElementById(`items-${priority}-column`);
        if (!column) return;
        
        const sortable = new Sortable(column, {
            group: 'action-items',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            filter: '.text-center',
            onEnd: async (evt) => {
                // Remove empty states
                const emptyStates = document.querySelectorAll('.text-center.text-slate-500');
                emptyStates.forEach(el => el.remove());
                
                const itemId = parseInt(evt.item.dataset.id);
                const newPriority = evt.to.id.replace('items-', '').replace('-column', '');
                
                // Update local state
                const item = actionItems.find(i => i.id === itemId);
                if (item) {
                    item.priority = newPriority;
                    
                    // Auto-complete if moved to completed
                    if (newPriority === 'completed' && !item.completed) {
                        item.completed = true;
                    }
                    // Auto-uncomplete if moved out of completed
                    if (newPriority !== 'completed' && item.completed) {
                        item.completed = false;
                    }
                    
                    saveActionItems();
                }
                
                renderActionItems();
            }
        });
        
        itemSortables.push(sortable);
    });
}

function switchDepartment(dept) {
    currentDepartment = dept;
    
    // Update tab styles
    document.querySelectorAll('.dept-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-dept="${dept}"]`)?.classList.add('active');
    
    renderActionItems();
    initItemDragAndDrop();
}

function toggleItemComplete(itemId, checked) {
    const item = actionItems.find(i => i.id === itemId);
    if (item) {
        item.completed = checked;
        
        // Auto-move to completed column if checked
        if (checked && item.priority !== 'completed') {
            item.priority = 'completed';
        }
        
        saveActionItems();
        renderActionItems();
        initItemDragAndDrop();
    }
}

function showItemDetails(item) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    
    const chatCount = item.chatHistory ? item.chatHistory.length : 0;
    const hasNotes = item.notes && item.notes.trim().length > 0;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; display: flex; flex-direction: column;">
            <h2 class="text-xl font-bold mb-4">${escapeHtml(item.title)}</h2>
            
            <!-- Info Summary -->
            <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                    <span class="text-slate-400">Department:</span> 
                    <span class="text-white">${DEPARTMENTS[item.department].icon} ${DEPARTMENTS[item.department].name}</span>
                </div>
                <div>
                    <span class="text-slate-400">Priority:</span> 
                    <span class="text-white">${PRIORITIES[item.priority].icon} ${PRIORITIES[item.priority].label}</span>
                </div>
                ${item.description ? `
                <div class="col-span-2">
                    <span class="text-slate-400">Description:</span> 
                    <span class="text-slate-300">${escapeHtml(item.description)}</span>
                </div>
                ` : ''}
                <div>
                    <span class="text-slate-400">Time:</span> 
                    <span class="text-slate-300">⏱️ ${escapeHtml(item.timeEstimate || 'Not set')}</span>
                </div>
                <div>
                    <span class="text-slate-400">Status:</span> 
                    <span class="text-white">${item.completed ? '✅ Completed' : '⏳ To Do'}</span>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="flex gap-2 border-b border-slate-700 mb-4">
                <button class="item-detail-tab active" data-tab="notes" onclick="switchItemTab(${item.id}, 'notes')">
                    📝 Notes ${hasNotes ? '●' : ''}
                </button>
                <button class="item-detail-tab" data-tab="chat" onclick="switchItemTab(${item.id}, 'chat')">
                    💬 Chat ${chatCount > 0 ? `(${chatCount})` : ''}
                </button>
            </div>
            
            <!-- Tab Content Container -->
            <div class="flex-1 overflow-hidden" style="min-height: 300px;">
                <!-- Notes Tab -->
                <div id="item-notes-tab-${item.id}" class="item-tab-content h-full">
                    <div class="flex items-center justify-between mb-3">
                        <label class="block text-sm font-semibold text-slate-400">📝 Notes</label>
                        <button onclick="quickEditNotes(${item.id})" 
                            class="text-xs text-primary hover:text-primary-hover px-3 py-1 bg-primary/20 rounded-lg">
                            ✏️ Edit Notes
                        </button>
                    </div>
                    ${item.notes ? `
                        <div class="bg-slate-800/50 rounded-lg p-4 text-slate-300 whitespace-pre-wrap overflow-y-auto" style="max-height: 400px;">${escapeHtml(item.notes)}</div>
                    ` : `
                        <div class="bg-slate-800/50 rounded-lg p-4 text-slate-500 italic text-sm text-center">
                            No notes yet. Click "Edit Notes" to document your work, decisions, or responses.
                        </div>
                    `}
                </div>
                
                <!-- Chat Tab -->
                <div id="item-chat-tab-${item.id}" class="item-tab-content h-full hidden flex flex-col">
                    <div class="flex-1 overflow-y-auto mb-3 bg-slate-800/30 rounded-lg p-3" id="item-chat-messages-${item.id}" style="max-height: 400px;">
                        ${renderItemChatHistory(item)}
                    </div>
                    <div class="flex gap-2">
                        <input type="text" 
                               id="item-chat-input-${item.id}" 
                               placeholder="Ask Leonardo or share your progress..." 
                               class="flex-1 rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 focus:border-primary focus:outline-none"
                               onkeypress="if(event.key==='Enter') sendItemChatMessage(${item.id})">
                        <button onclick="sendItemChatMessage(${item.id})" 
                                class="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg transition font-semibold text-sm">
                            Send
                        </button>
                    </div>
                    <div class="text-xs text-slate-500 mt-2 text-center">
                        💡 I'm context-aware - I know we're discussing "${escapeHtml(item.title)}"
                    </div>
                </div>
            </div>
            
            <div class="flex gap-2 justify-end pt-4 mt-4 border-t border-slate-700">
                <button onclick="closeModal()" 
                    class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                    Close
                </button>
                <button onclick="editActionItem(${item.id}); closeModal();"
                    class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                    Edit Item
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').appendChild(modal);
    
    // Focus chat input if chat tab and no messages yet
    if (chatCount === 0) {
        setTimeout(() => {
            const input = document.getElementById(`item-chat-input-${item.id}`);
            if (input && !item.chatHistory?.length) {
                // Auto-switch to chat tab and add welcome message
                switchItemTab(item.id, 'chat');
                addWelcomeChatMessage(item);
            }
        }, 100);
    }
}

function renderItemChatHistory(item) {
    if (!item.chatHistory || item.chatHistory.length === 0) {
        return `
            <div class="text-center text-slate-500 text-sm py-8">
                No messages yet. Start a conversation!
            </div>
        `;
    }
    
    return item.chatHistory.map(msg => {
        const isUser = msg.role === 'user';
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        return `
            <div class="flex ${isUser ? 'justify-end' : 'justify-start'} mb-3">
                <div class="${isUser ? 'bg-primary' : 'bg-slate-700'} rounded-lg px-3 py-2 max-w-[80%]">
                    <div class="text-xs opacity-70 mb-1">${isUser ? '👤 You' : '🎯 Leonardo'} • ${time}</div>
                    <div class="text-sm whitespace-pre-wrap">${escapeHtml(msg.content)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function switchItemTab(itemId, tabName) {
    // Update tab buttons
    document.querySelectorAll('.item-detail-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.item-detail-tab[data-tab="${tabName}"]`)?.classList.add('active');
    
    // Show/hide tab content
    document.getElementById(`item-notes-tab-${itemId}`)?.classList.add('hidden');
    document.getElementById(`item-chat-tab-${itemId}`)?.classList.add('hidden');
    document.getElementById(`item-${tabName}-tab-${itemId}`)?.classList.remove('hidden');
    
    // Focus input if switching to chat
    if (tabName === 'chat') {
        setTimeout(() => {
            const input = document.getElementById(`item-chat-input-${itemId}`);
            if (input) input.focus();
        }, 50);
    }
}

async function sendItemChatMessage(itemId) {
    const item = actionItems.find(i => i.id === itemId);
    if (!item) return;
    
    const input = document.getElementById(`item-chat-input-${itemId}`);
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    if (!item.chatHistory) item.chatHistory = [];
    item.chatHistory.push({
        role: 'user',
        content: message,
        timestamp: Date.now()
    });
    
    // Clear input
    input.value = '';
    input.disabled = true;
    
    // Update UI
    updateItemChatDisplay(item);
    saveActionItems();
    
    // Send to Leonardo via API
    try {
        const contextPrompt = `Context: This is about the action item "${item.title}" in ${DEPARTMENTS[item.department].name}. ${item.description ? 'Description: ' + item.description : ''} Status: ${item.completed ? 'Completed' : item.priority.toUpperCase()}. ${item.notes ? 'Previous notes: ' + item.notes : 'No notes yet.'}

User message: ${message}

Please provide helpful feedback, ask follow-up questions, or offer suggestions related to this specific action item. Keep responses focused and actionable.`;
        
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ message: contextPrompt })
        });
        
        if (!response.ok) throw new Error('Failed to send message');
        
        const data = await response.json();
        
        // Add Leonardo's response
        item.chatHistory.push({
            role: 'assistant',
            content: data.response || 'I received your message!',
            timestamp: Date.now()
        });
        
        updateItemChatDisplay(item);
        saveActionItems();
        
    } catch (error) {
        console.error('Chat error:', error);
        // Add error message
        item.chatHistory.push({
            role: 'assistant',
            content: 'Sorry, I had trouble responding. Please try again or use the main chat.',
            timestamp: Date.now()
        });
        updateItemChatDisplay(item);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

function updateItemChatDisplay(item) {
    const container = document.getElementById(`item-chat-messages-${item.id}`);
    if (container) {
        container.innerHTML = renderItemChatHistory(item);
        container.scrollTop = container.scrollHeight;
    }
}

function addWelcomeChatMessage(item) {
    if (!item.chatHistory) item.chatHistory = [];
    
    // Add welcome message from Leonardo
    const welcomeMessages = [
        `Hi! Ready to work on "${item.title}"? What's on your mind?`,
        `Let's tackle "${item.title}" together. How can I help?`,
        `Working on "${item.title}"? I'm here to help you think it through.`,
        `Ready to discuss "${item.title}"? Share your thoughts or questions!`
    ];
    
    item.chatHistory.push({
        role: 'assistant',
        content: welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)],
        timestamp: Date.now()
    });
    
    updateItemChatDisplay(item);
    saveActionItems();
}

function quickEditNotes(itemId) {
    const item = actionItems.find(i => i.id === itemId);
    if (!item) return;
    
    closeModal(); // Close detail view
    
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2 class="text-xl font-bold mb-4">📝 Edit Notes: ${escapeHtml(item.title)}</h2>
            <form id="notes-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-2 text-slate-400">
                        Document your work, decisions, responses, or follow-up items:
                    </label>
                    <textarea name="notes" rows="10"
                        class="w-full rounded-lg px-3 py-2 font-mono text-sm"
                        placeholder="Example:&#10;&#10;Completed on 2/1/26&#10;- Decided to go with DigitalOcean for hosting&#10;- Cost: $20/mo&#10;- Setup scheduled for next week&#10;&#10;Next steps:&#10;- Create account&#10;- Configure DNS">${escapeHtml(item.notes || '')}</textarea>
                    <div class="text-xs text-slate-500 mt-2">
                        💡 Tip: Leonardo can read these notes to answer questions about your decisions and progress
                    </div>
                </div>
                <div class="flex gap-2 justify-end pt-4 border-t border-slate-700">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        💾 Save Notes
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('modal-container').appendChild(modal);
    modal.querySelector('textarea').focus();
    
    document.getElementById('notes-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        item.notes = formData.get('notes');
        saveActionItems();
        
        closeModal();
        showToast('Notes saved!', 'success');
        
        // Optionally reopen detail view
        // showItemDetails(item);
    };
}

function showItemMenu(itemId) {
    const item = actionItems.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 300px;">
            <h3 class="font-bold mb-3">${escapeHtml(item.title)}</h3>
            <div class="space-y-2">
                <button onclick="editActionItem(${itemId}); closeModal();"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 transition">
                    ✏️ Edit
                </button>
                <button onclick="toggleItemComplete(${itemId}, ${!item.completed}); closeModal();"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 transition">
                    ${item.completed ? '↩️ Mark Incomplete' : '✅ Mark Complete'}
                </button>
                <button onclick="deleteActionItem(${itemId}); closeModal();"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-600/20 text-red-400 transition">
                    🗑️ Delete
                </button>
            </div>
            <button onclick="closeModal()" 
                class="w-full mt-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                Cancel
            </button>
        </div>
    `;
    
    document.getElementById('modal-container').appendChild(modal);
}

function editActionItem(itemId) {
    const item = actionItems.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2 class="text-xl font-bold mb-4">Edit Action Item</h2>
            <form id="edit-item-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Title *</label>
                    <input type="text" name="title" required value="${escapeHtml(item.title)}"
                        class="w-full rounded-lg px-3 py-2">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Description</label>
                    <textarea name="description" rows="3"
                        class="w-full rounded-lg px-3 py-2">${escapeHtml(item.description || '')}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Time Estimate</label>
                    <input type="text" name="timeEstimate" value="${escapeHtml(item.timeEstimate || '')}"
                        class="w-full rounded-lg px-3 py-2" placeholder="e.g., 30 min">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Priority</label>
                    <select name="priority" class="w-full rounded-lg px-3 py-2">
                        ${Object.entries(PRIORITIES).map(([key, val]) =>
                            `<option value="${key}" ${item.priority === key ? 'selected' : ''}>${val.icon} ${val.label}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="border-t border-slate-700 pt-4">
                    <label class="block text-sm font-semibold mb-2">📝 Notes</label>
                    <textarea name="notes" rows="6"
                        class="w-full rounded-lg px-3 py-2 font-mono text-sm"
                        placeholder="Document work, decisions, responses...">${escapeHtml(item.notes || '')}</textarea>
                    <div class="text-xs text-slate-500 mt-1">
                        💡 Leonardo can read these notes
                    </div>
                </div>
                <div class="flex gap-2 justify-end pt-4 border-t border-slate-700">
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
    
    document.getElementById('edit-item-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        item.title = formData.get('title');
        item.description = formData.get('description');
        item.timeEstimate = formData.get('timeEstimate');
        item.priority = formData.get('priority');
        item.notes = formData.get('notes');
        
        saveActionItems();
        renderActionItems();
        initItemDragAndDrop();
        closeModal();
        showToast('Action item updated!', 'success');
    };
}

function deleteActionItem(itemId) {
    if (!confirm('Delete this action item?')) return;
    
    actionItems = actionItems.filter(i => i.id !== itemId);
    saveActionItems();
    renderActionItems();
    initItemDragAndDrop();
    showToast('Action item deleted', 'success');
}

function showNewActionItem() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2 class="text-xl font-bold mb-4">New Action Item</h2>
            <form id="new-item-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-1">Title *</label>
                    <input type="text" name="title" required
                        class="w-full rounded-lg px-3 py-2" placeholder="What needs to be done?">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Description</label>
                    <textarea name="description" rows="3"
                        class="w-full rounded-lg px-3 py-2" placeholder="Why and how..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Time Estimate</label>
                    <input type="text" name="timeEstimate"
                        class="w-full rounded-lg px-3 py-2" placeholder="e.g., 30 min">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Department</label>
                    <select name="department" class="w-full rounded-lg px-3 py-2">
                        ${Object.entries(DEPARTMENTS).map(([key, val]) =>
                            `<option value="${key}" ${key === currentDepartment ? 'selected' : ''}>${val.icon} ${val.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Priority</label>
                    <select name="priority" class="w-full rounded-lg px-3 py-2">
                        ${Object.entries(PRIORITIES).filter(([k]) => k !== 'completed').map(([key, val]) =>
                            `<option value="${key}">${val.icon} ${val.label}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="border-t border-slate-700 pt-4">
                    <label class="block text-sm font-semibold mb-2">📝 Notes (optional)</label>
                    <textarea name="notes" rows="4"
                        class="w-full rounded-lg px-3 py-2 font-mono text-sm"
                        placeholder="Add any initial notes..."></textarea>
                </div>
                <div class="flex gap-2 justify-end pt-4 border-t border-slate-700">
                    <button type="button" onclick="closeModal()"
                        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition">
                        Create Item
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('modal-container').appendChild(modal);
    
    document.getElementById('new-item-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newItem = {
            id: Date.now(), // Simple ID generation
            department: formData.get('department'),
            priority: formData.get('priority'),
            title: formData.get('title'),
            description: formData.get('description'),
            timeEstimate: formData.get('timeEstimate'),
            notes: formData.get('notes') || '',
            chatHistory: [],
            completed: false
        };
        
        actionItems.push(newItem);
        saveActionItems();
        
        // Switch to the department if needed
        if (newItem.department !== currentDepartment) {
            switchDepartment(newItem.department);
        } else {
            renderActionItems();
            initItemDragAndDrop();
        }
        
        closeModal();
        showToast('Action item created!', 'success');
    };
}

function saveActionItems() {
    localStorage.setItem('leonardo-action-items', JSON.stringify(actionItems));
}

// Department summary stats
function getActionItemsStats() {
    const stats = {};
    
    Object.keys(DEPARTMENTS).forEach(dept => {
        const deptItems = actionItems.filter(i => i.department === dept);
        const urgent = deptItems.filter(i => i.priority === 'urgent' && !i.completed).length;
        const completed = deptItems.filter(i => i.completed).length;
        const total = deptItems.length;
        
        stats[dept] = { urgent, completed, total };
    });
    
    return stats;
}
