// Morning Briefing functionality

let briefingData = null;

/**
 * Load and display morning briefing
 */
async function loadMorningBriefing() {
    try {
        const response = await fetch('/api/briefing');
        briefingData = await response.json();
        displayMorningBriefing();
    } catch (error) {
        console.error('[Briefing] Failed to load:', error);
        showBriefingError();
    }
}

/**
 * Display the briefing in the UI
 */
function displayMorningBriefing() {
    const container = document.getElementById('morning-briefing-content');
    if (!container) return;

    if (!briefingData || !briefingData.success) {
        showBriefingError();
        return;
    }

    // Format the briefing text with markdown support if needed
    const briefingText = briefingData.briefing || '';
    const source = briefingData.source || 'ai';
    const sourceIcon = source === 'ai' ? '🤖' : source === 'template' ? '📋' : '💡';

    container.innerHTML = `
        <div class="mb-4">
            <p class="text-lg text-white leading-relaxed whitespace-pre-line">${escapeHtml(briefingText)}</p>
        </div>
        <div class="flex items-center justify-between text-xs text-slate-500">
            <span>${sourceIcon} Generated ${formatTimeAgo(briefingData.generatedAt)}</span>
            <button onclick="refreshBriefing()" class="text-blue-400 hover:text-blue-300 transition">
                🔄 Refresh
            </button>
        </div>
    `;
}

/**
 * Show error state
 */
function showBriefingError() {
    const container = document.getElementById('morning-briefing-content');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center text-slate-400 py-4">
            <div class="text-2xl mb-2">📋</div>
            <div class="text-sm">Unable to load briefing</div>
            <button onclick="refreshBriefing()" class="text-blue-400 hover:text-blue-300 text-xs mt-2">
                Try again
            </button>
        </div>
    `;
}

/**
 * Refresh briefing (clear cache and reload)
 */
async function refreshBriefing() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';

    try {
        const response = await fetch('/api/briefing/refresh', { method: 'POST' });
        briefingData = await response.json();
        displayMorningBriefing();
    } catch (error) {
        console.error('[Briefing] Refresh failed:', error);
        showBriefingError();
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh';
    }
}

/**
 * Format time ago helper
 */
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'just now';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'today';
}
