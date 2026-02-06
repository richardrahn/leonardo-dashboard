// Gmail Triage functionality with enhanced actions

let gmailData = null;
let currentFilter = 'all'; // all, high, medium, low

async function loadGmail() {
    try {
        // Fetch Gmail status from Leonardo's API
        const response = await apiCall('/api/gmail/status');
        
        if (!response) {
            throw new Error('Failed to fetch Gmail data');
        }
        
        gmailData = response;
        displayGmailData();
    } catch (error) {
        console.error('Error loading Gmail:', error);
        showGmailError('Unable to load Gmail data. Check console for details.');
    }
}

function displayGmailData() {
    if (!gmailData) return;
    
    // Update stats
    document.getElementById('gmail-total').textContent = gmailData.total || 0;
    document.getElementById('gmail-high').textContent = gmailData.high || 0;
    document.getElementById('gmail-medium').textContent = gmailData.medium || 0;
    document.getElementById('gmail-low').textContent = gmailData.low || 0;
    
    // Update last check time
    const lastCheck = new Date(gmailData.timestamp);
    document.getElementById('gmail-last-check').textContent = 
        `Last checked: ${lastCheck.toLocaleTimeString()}`;
    
    // Check for inbox zero
    if (gmailData.total === 0) {
        showInboxZero();
        return;
    }
    
    // Display emails based on current filter
    displayFilteredEmails();
}

function displayFilteredEmails() {
    const emailsList = document.getElementById('gmail-emails-list');
    
    let emailsToShow = [];
    
    switch(currentFilter) {
        case 'high':
            emailsToShow = gmailData.highPriority || [];
            break;
        case 'medium':
            emailsToShow = gmailData.mediumPriority || [];
            break;
        case 'low':
            emailsToShow = gmailData.lowPriority || [];
            break;
        case 'all':
        default:
            emailsToShow = [
                ...(gmailData.highPriority || []),
                ...(gmailData.mediumPriority || []),
                ...(gmailData.lowPriority || [])
            ];
            break;
    }
    
    if (emailsToShow.length === 0) {
        emailsList.innerHTML = `
            <div class="text-center text-slate-400 py-8">
                ${currentFilter === 'all' ? 
                    '✨ No emails in this category!' : 
                    `No ${currentFilter} priority emails`}
            </div>
        `;
        return;
    }
    
    const emailsHtml = emailsToShow.map(email => createEmailCard(email)).join('');
    emailsList.innerHTML = emailsHtml;
}

function createEmailCard(email) {
    const priorityColor = {
        'HIGH': 'border-red-400',
        'MEDIUM': 'border-yellow-400',
        'LOW': 'border-blue-400'
    }[email.priority || 'HIGH'];
    
    const priorityBadge = {
        'HIGH': '🔴',
        'MEDIUM': '🟡',
        'LOW': '🔵'
    }[email.priority || 'HIGH'];
    
    return `
        <div class="border-l-4 ${priorityColor} bg-slate-700/50 rounded-lg p-4 mb-3 hover:bg-slate-700 transition email-card" 
             data-message-id="${email.id}" 
             data-thread-id="${email.threadId || email.id}">
            
            <!-- Email Header -->
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                    <div class="font-semibold text-white mb-1">${escapeHtml(email.subject)}</div>
                    <div class="text-sm text-slate-400">From: ${escapeHtml(email.from)}</div>
                </div>
                <div class="flex items-center gap-2 ml-3">
                    <span class="text-lg">${priorityBadge}</span>
                    <button onclick="toggleEmailActions('${email.id}')" 
                            class="text-slate-400 hover:text-white transition text-xl">
                        ⋮
                    </button>
                </div>
            </div>
            
            <!-- Reasons/Tags -->
            ${email.reasons && email.reasons.length > 0 ? `
                <div class="flex flex-wrap gap-2 mb-2">
                    ${email.reasons.map(reason => `
                        <span class="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                            ${escapeHtml(reason)}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            
            <!-- Snippet Preview (hover to expand) -->
            <div class="text-sm text-slate-300 mb-3 cursor-pointer hover:text-white transition snippet-preview" 
                 onclick="showEmailPreview('${email.id}')"
                 title="Click to preview full email">
                ${email.snippet ? escapeHtml(email.snippet.substring(0, 150)) + '...' : 'No preview available'}
            </div>
            
            <!-- Quick Actions -->
            <div class="hidden email-actions" id="actions-${email.id}">
                <div class="flex flex-wrap gap-2 mb-3 p-3 bg-slate-800/50 rounded border border-slate-600">
                    <button onclick="replyToEmail('${email.id}')" 
                            class="flex items-center gap-1 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded transition text-sm">
                        💬 Reply
                    </button>
                    <button onclick="archiveGmailEmail('${email.id}')" 
                            class="flex items-center gap-1 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded transition text-sm">
                        📥 Archive
                    </button>
                    <button onclick="toggleStarEmail('${email.id}')" 
                            class="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded transition text-sm">
                        ⭐ Star
                    </button>
                    <button onclick="markEmailAsRead('${email.id}')" 
                            class="flex items-center gap-1 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded transition text-sm">
                        ✓ Mark Read
                    </button>
                    <button onclick="deleteGmailEmail('${email.id}')" 
                            class="flex items-center gap-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition text-sm">
                        🗑️ Delete
                    </button>
                </div>
            </div>
            
            <!-- Reply Composer (hidden by default) -->
            <div class="hidden reply-composer" id="reply-${email.id}">
                <div class="p-3 bg-slate-800/50 rounded border border-slate-600 mb-2">
                    <textarea 
                        id="reply-text-${email.id}"
                        placeholder="Type your reply..."
                        class="w-full bg-slate-900 text-white rounded p-2 mb-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                    <div class="flex gap-2">
                        <button onclick="sendReply('${email.id}')" 
                                class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">
                            Send Reply
                        </button>
                        <button onclick="cancelReply('${email.id}')" 
                                class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center gap-3 text-xs text-slate-500">
                <span>Score: ${email.score}</span>
                <a href="${email.link}" target="_blank" 
                   class="text-blue-400 hover:text-blue-300 transition">
                    Open in Gmail →
                </a>
            </div>
        </div>
    `;
}

function showInboxZero() {
    const emailsList = document.getElementById('gmail-emails-list');
    emailsList.innerHTML = `
        <div class="text-center py-12">
            <div class="text-6xl mb-4">🎉</div>
            <div class="text-2xl font-bold text-white mb-2">Inbox Zero!</div>
            <div class="text-slate-400">All caught up! No unread emails.</div>
            <div class="mt-4 text-slate-500 text-sm">
                Time to celebrate or take a break 🌟
            </div>
        </div>
    `;
}

function toggleEmailActions(messageId) {
    const actionsDiv = document.getElementById(`actions-${messageId}`);
    if (actionsDiv) {
        actionsDiv.classList.toggle('hidden');
    }
}

async function showEmailPreview(messageId) {
    try {
        const details = await apiCall(`/api/gmail/email/${messageId}/details`);
        
        if (!details || !details.success) {
            throw new Error('Failed to load email details');
        }
        
        // Show modal with full preview
        showModal('Email Preview', `
            <div class="space-y-3">
                <div>
                    <strong class="text-slate-400">From:</strong>
                    <div class="text-white">${escapeHtml(details.from)}</div>
                </div>
                <div>
                    <strong class="text-slate-400">Subject:</strong>
                    <div class="text-white">${escapeHtml(details.subject)}</div>
                </div>
                <div>
                    <strong class="text-slate-400">Date:</strong>
                    <div class="text-white">${escapeHtml(details.date)}</div>
                </div>
                <div class="border-t border-slate-600 pt-3">
                    <div class="text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                        ${escapeHtml(details.body || details.snippet || 'No content available')}
                    </div>
                </div>
                <div class="flex gap-2 pt-3 border-t border-slate-600">
                    <a href="https://mail.google.com/mail/u/0/#inbox/${messageId}" 
                       target="_blank"
                       class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">
                        Open in Gmail →
                    </a>
                </div>
            </div>
        `);
    } catch (error) {
        console.error('Error loading email preview:', error);
        showToast('Failed to load email preview', 'error');
    }
}

function replyToEmail(messageId) {
    // Hide actions, show reply composer
    const actionsDiv = document.getElementById(`actions-${messageId}`);
    const replyDiv = document.getElementById(`reply-${messageId}`);
    
    if (actionsDiv) actionsDiv.classList.add('hidden');
    if (replyDiv) {
        replyDiv.classList.remove('hidden');
        // Focus textarea
        const textarea = document.getElementById(`reply-text-${messageId}`);
        if (textarea) textarea.focus();
    }
}

function cancelReply(messageId) {
    const replyDiv = document.getElementById(`reply-${messageId}`);
    if (replyDiv) {
        replyDiv.classList.add('hidden');
        // Clear textarea
        const textarea = document.getElementById(`reply-text-${messageId}`);
        if (textarea) textarea.value = '';
    }
}

async function sendReply(messageId) {
    const textarea = document.getElementById(`reply-text-${messageId}`);
    const replyText = textarea?.value.trim();
    
    if (!replyText) {
        showToast('Please enter a reply message', 'error');
        return;
    }
    
    try {
        const emailCard = document.querySelector(`[data-message-id="${messageId}"]`);
        const threadId = emailCard?.dataset.threadId || messageId;
        
        const result = await apiCall(`/api/gmail/email/${messageId}/reply`, {
            method: 'POST',
            body: JSON.stringify({ threadId, replyText })
        });
        
        if (!result || !result.success) {
            throw new Error(result?.message || 'Failed to send reply');
        }
        
        showToast('Reply sent successfully!', 'success');
        cancelReply(messageId);
        
        // Mark as read and archive automatically
        await markEmailAsRead(messageId);
        await archiveGmailEmail(messageId);
        
    } catch (error) {
        console.error('Error sending reply:', error);
        showToast('Failed to send reply: ' + error.message, 'error');
    }
}

async function archiveGmailEmail(messageId) {
    try {
        const result = await apiCall(`/api/gmail/email/${messageId}/archive`, {
            method: 'POST'
        });
        
        if (!result || !result.success) {
            throw new Error(result?.message || 'Failed to archive email');
        }
        
        removeEmailFromUI(messageId);
        showToast('Email archived', 'success');
    } catch (error) {
        console.error('Error archiving email:', error);
        showToast('Failed to archive email: ' + error.message, 'error');
    }
}

async function toggleStarEmail(messageId) {
    try {
        // For simplicity, always star (unstar not shown in UI yet)
        const result = await apiCall(`/api/gmail/email/${messageId}/star`, {
            method: 'POST'
        });
        
        if (!result || !result.success) {
            throw new Error(result?.message || 'Failed to star email');
        }
        
        showToast('Email starred ⭐', 'success');
    } catch (error) {
        console.error('Error starring email:', error);
        showToast('Failed to star email: ' + error.message, 'error');
    }
}

async function markEmailAsRead(messageId) {
    try {
        const result = await apiCall(`/api/gmail/email/${messageId}/read`, {
            method: 'POST'
        });
        
        if (!result || !result.success) {
            throw new Error(result?.message || 'Failed to mark as read');
        }
        
        removeEmailFromUI(messageId);
        showToast('Marked as read', 'success');
    } catch (error) {
        console.error('Error marking as read:', error);
        showToast('Failed to mark as read: ' + error.message, 'error');
    }
}

async function deleteGmailEmail(messageId, event) {
    if (event) event.stopPropagation();
    
    if (!confirm('Move this email to trash?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/api/gmail/email/${messageId}`, { 
            method: 'DELETE' 
        });
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to delete email');
        }
        
        removeEmailFromUI(messageId);
        showToast('Email moved to trash', 'success');
    } catch (error) {
        console.error('Error deleting email:', error);
        showToast('Failed to delete email: ' + error.message, 'error');
    }
}

function removeEmailFromUI(messageId) {
    const emailCard = document.querySelector(`[data-message-id="${messageId}"]`);
    if (emailCard) {
        emailCard.style.opacity = '0';
        emailCard.style.transform = 'scale(0.9)';
        setTimeout(() => {
            emailCard.remove();
            
            // Update counts
            if (gmailData && gmailData.highPriority) {
                gmailData.highPriority = gmailData.highPriority.filter(e => e.id !== messageId);
                gmailData.high = gmailData.highPriority.length;
                gmailData.total = Math.max(0, gmailData.total - 1);
                
                // Update stats
                document.getElementById('gmail-total').textContent = gmailData.total;
                document.getElementById('gmail-high').textContent = gmailData.high;
                
                // Show empty state or inbox zero if no more emails
                const emailsList = document.getElementById('gmail-emails-list');
                if (gmailData.total === 0) {
                    showInboxZero();
                } else if (gmailData.highPriority.length === 0) {
                    emailsList.innerHTML = `
                        <div class="text-center text-slate-400 py-8">
                            ✨ No high priority emails! Inbox under control.
                        </div>
                    `;
                }
            }
        }, 300);
    }
}

function setGmailFilter(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${filter}`)?.classList.add('active');
    
    displayFilteredEmails();
}

function showGmailError(message) {
    const emailsList = document.getElementById('gmail-emails-list');
    emailsList.innerHTML = `
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
            <div class="text-red-400 mb-2">⚠️ Error</div>
            <div class="text-sm text-slate-300">${escapeHtml(message)}</div>
            <div class="text-xs text-slate-400 mt-3">
                Make sure the Gmail triage service is running:
                <code class="bg-slate-800 px-2 py-1 rounded">cd skills/gmail && node serve-dashboard.js</code>
            </div>
        </div>
    `;
}

function refreshGmail() {
    loadGmail();
}

async function checkGmailNow() {
    const btn = document.getElementById('gmail-check-btn');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = '⏳ Checking...';
    
    try {
        // Trigger a fresh check via Leonardo's API
        const result = await apiCall('/api/gmail/check', { method: 'POST' });
        
        if (!result || !result.success) {
            throw new Error(result?.message || 'Failed to check Gmail');
        }
        
        // Update display with new data
        gmailData = result;
        displayGmailData();
        
        if (result.high > 0) {
            showToast(`Found ${result.total} unread emails (${result.high} high priority)`, 'success');
        } else if (result.total === 0) {
            showToast('Inbox Zero achieved! 🎉', 'success');
        } else {
            showToast('Inbox checked - all clear!', 'success');
        }
        
    } catch (error) {
        console.error('Error checking Gmail:', error);
        showToast('Failed to check Gmail: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Simple modal helper
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold text-white">${title}</h3>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="text-slate-400 hover:text-white text-2xl">×</button>
                </div>
                <div>${content}</div>
            </div>
        </div>
    `;
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}
