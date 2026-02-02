// Gmail Triage functionality

let gmailData = null;

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
    
    // Display high priority emails
    const emailsList = document.getElementById('gmail-emails-list');
    
    if (!gmailData.highPriority || gmailData.highPriority.length === 0) {
        emailsList.innerHTML = `
            <div class="text-center text-slate-400 py-8">
                ✨ No high priority emails! Inbox under control.
            </div>
        `;
        return;
    }
    
    const emailsHtml = gmailData.highPriority.map(email => `
        <div class="border-l-4 border-red-400 bg-slate-700/50 rounded-lg p-4 mb-3 hover:bg-slate-700 transition">
            <div class="font-semibold text-white mb-2">${escapeHtml(email.subject)}</div>
            <div class="text-sm text-slate-400 mb-2">From: ${escapeHtml(email.from)}</div>
            <div class="flex flex-wrap gap-2 mb-2">
                ${email.reasons.map(reason => `
                    <span class="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                        ${escapeHtml(reason)}
                    </span>
                `).join('')}
            </div>
            <div class="flex items-center gap-3 text-xs">
                <span class="text-slate-500">Score: ${email.score}</span>
                <a href="${email.link}" target="_blank" 
                   class="text-blue-400 hover:text-blue-300 transition">
                    Open in Gmail →
                </a>
            </div>
        </div>
    `).join('');
    
    emailsList.innerHTML = emailsHtml;
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
