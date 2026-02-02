// Google Calendar Integration

let calendarData = {
    today: null,
    nextMeeting: null,
    upcoming: null,
};

let calendarRefreshInterval = null;

/**
 * Initialize calendar (called on dashboard load)
 */
async function initializeCalendar() {
    // Check calendar status
    const status = await checkCalendarStatus();
    
    if (!status.ready) {
        console.log('[Calendar] Not configured or authorized');
        showCalendarNotConfigured();
        return false;
    }

    // Load initial data
    await refreshCalendarData();

    // Set up auto-refresh every 5 minutes
    calendarRefreshInterval = setInterval(refreshCalendarData, 5 * 60 * 1000);

    return true;
}

/**
 * Show "not configured" state in calendar widgets
 */
function showCalendarNotConfigured() {
    // Next Meeting Card
    const nextMeetingCard = document.getElementById('next-meeting-card');
    if (nextMeetingCard) {
        nextMeetingCard.innerHTML = `
            <div class="text-center text-slate-500 py-4 text-sm">
                <div class="mb-2">📅</div>
                <div>Calendar not configured</div>
                <a href="https://github.com/clawdbot/clawdbot" target="_blank" class="text-blue-400 hover:underline text-xs mt-1 inline-block">
                    Setup guide
                </a>
            </div>
        `;
    }

    // Today's Schedule
    const todayEvents = document.getElementById('calendar-today-events');
    if (todayEvents) {
        todayEvents.innerHTML = `
            <div class="text-center text-slate-500 py-4 text-sm">
                <div class="mb-2">📅</div>
                <div>Calendar not configured</div>
            </div>
        `;
    }
}

/**
 * Check if calendar is configured
 */
async function checkCalendarStatus() {
    try {
        const response = await fetch('/api/calendar/status');
        return await response.json();
    } catch (error) {
        console.error('[Calendar] Status check failed:', error);
        return { ready: false };
    }
}

/**
 * Refresh all calendar data
 */
async function refreshCalendarData() {
    try {
        // Fetch today's events
        const todayResponse = await fetch('/api/calendar/today');
        calendarData.today = await todayResponse.json();

        // Fetch next meeting
        const nextResponse = await fetch('/api/calendar/next-meeting');
        calendarData.nextMeeting = await nextResponse.json();

        // Fetch upcoming events (next 7 days)
        const upcomingResponse = await fetch('/api/calendar/upcoming?days=7');
        calendarData.upcoming = await upcomingResponse.json();

        // Update UI
        updateCalendarUI();

        return true;
    } catch (error) {
        console.error('[Calendar] Refresh failed:', error);
        return false;
    }
}

/**
 * Update calendar UI
 */
function updateCalendarUI() {
    updateTodayEvents();
    updateNextMeeting();
    updateUpcomingEvents();
}

/**
 * Update today's events display
 */
function updateTodayEvents() {
    const container = document.getElementById('calendar-today-events');
    if (!container) return;

    if (!calendarData.today || calendarData.today.error) {
        container.innerHTML = `
            <div class="text-slate-400 text-sm text-center py-4">
                Unable to load calendar events
            </div>
        `;
        return;
    }

    const events = calendarData.today.events || [];

    if (events.length === 0) {
        container.innerHTML = `
            <div class="text-slate-400 text-sm text-center py-8">
                ✨ No events today - clear schedule!
            </div>
        `;
        return;
    }

    const eventsHtml = events.map(event => {
        const startTime = new Date(event.start);
        const endTime = new Date(event.end);
        const now = new Date();
        const isNow = now >= startTime && now <= endTime;
        const isPast = now > endTime;

        return `
            <div class="border-l-4 ${isNow ? 'border-blue-400 bg-blue-500/10' : isPast ? 'border-slate-600 bg-slate-800/50 opacity-50' : 'border-green-400 bg-slate-800'} rounded-lg p-4 mb-3 hover:bg-slate-700 transition">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                        <div class="font-semibold text-white">${escapeHtml(event.summary)}</div>
                        <div class="text-sm text-slate-400">
                            ${event.isAllDay ? 'All day' : `${formatTime(startTime)} - ${formatTime(endTime)}`}
                            ${isNow ? '<span class="ml-2 text-blue-400">● In progress</span>' : ''}
                        </div>
                    </div>
                    ${isNow ? '<span class="text-blue-400 text-xs font-semibold">NOW</span>' : ''}
                </div>
                ${event.location ? `
                    <div class="text-sm text-slate-400 mb-2">
                        📍 ${escapeHtml(event.location)}
                    </div>
                ` : ''}
                ${event.attendees > 0 ? `
                    <div class="text-sm text-slate-400 mb-2">
                        👥 ${event.attendees} ${event.attendees === 1 ? 'attendee' : 'attendees'}
                    </div>
                ` : ''}
                <div class="flex items-center gap-2 mt-2">
                    ${event.meetingLink ? `
                        <a href="${escapeHtml(event.meetingLink)}" target="_blank" 
                           class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition font-semibold">
                            🎥 Join Meeting
                        </a>
                    ` : ''}
                    <a href="${escapeHtml(event.htmlLink)}" target="_blank" 
                       class="text-xs text-blue-400 hover:text-blue-300 transition">
                        View in Calendar →
                    </a>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = eventsHtml;
}

/**
 * Update next meeting countdown
 */
function updateNextMeeting() {
    const container = document.getElementById('next-meeting-card');
    if (!container) return;

    if (!calendarData.nextMeeting || calendarData.nextMeeting.error || !calendarData.nextMeeting.nextMeeting) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-2">✨</div>
                <div class="text-slate-400">No more meetings today</div>
                <div class="text-sm text-slate-500 mt-1">Enjoy your free time!</div>
            </div>
        `;
        return;
    }

    const meeting = calendarData.nextMeeting.nextMeeting;
    const minutesUntil = calendarData.nextMeeting.minutesUntil;
    const timeUntil = calendarData.nextMeeting.timeUntil;

    let urgencyClass = 'text-green-400';
    let urgencyIcon = '🟢';
    if (minutesUntil <= 5) {
        urgencyClass = 'text-red-400';
        urgencyIcon = '🔴';
    } else if (minutesUntil <= 15) {
        urgencyClass = 'text-yellow-400';
        urgencyIcon = '🟡';
    }

    container.innerHTML = `
        <div class="text-center">
            <div class="text-5xl font-bold ${urgencyClass} mb-2">
                ${escapeHtml(timeUntil)}
            </div>
            <div class="text-slate-400 text-sm mb-4">until your next meeting</div>
            <div class="bg-slate-800 rounded-lg p-4 mb-3">
                <div class="font-semibold text-white mb-1">${escapeHtml(meeting.summary)}</div>
                <div class="text-sm text-slate-400">
                    ${formatTime(new Date(meeting.start))}
                    ${meeting.location ? `• ${escapeHtml(meeting.location)}` : ''}
                </div>
            </div>
            ${meeting.meetingLink ? `
                <a href="${escapeHtml(meeting.meetingLink)}" target="_blank" 
                   class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition font-semibold">
                    🎥 Join Meeting
                </a>
            ` : ''}
        </div>
    `;
}

/**
 * Update upcoming events list
 */
function updateUpcomingEvents() {
    const container = document.getElementById('calendar-upcoming-events');
    if (!container) return;

    if (!calendarData.upcoming || calendarData.upcoming.error) {
        container.innerHTML = `
            <div class="text-slate-400 text-sm text-center py-4">
                Unable to load upcoming events
            </div>
        `;
        return;
    }

    const events = (calendarData.upcoming.events || []).slice(0, 10); // Show max 10

    if (events.length === 0) {
        container.innerHTML = `
            <div class="text-slate-400 text-sm text-center py-4">
                No upcoming events
            </div>
        `;
        return;
    }

    const eventsHtml = events.map(event => {
        const startTime = new Date(event.start);
        const isToday = new Date().toDateString() === startTime.toDateString();
        const isTomorrow = new Date(Date.now() + 86400000).toDateString() === startTime.toDateString();

        let dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(startTime);

        return `
            <div class="bg-slate-800 rounded-lg p-3 mb-2 hover:bg-slate-700 transition">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="font-semibold text-white text-sm">${escapeHtml(event.summary)}</div>
                        <div class="text-xs text-slate-400 mt-1">
                            ${dayLabel} • ${event.isAllDay ? 'All day' : formatTime(startTime)}
                        </div>
                    </div>
                    ${event.meetingLink ? `
                        <a href="${escapeHtml(event.meetingLink)}" target="_blank" 
                           class="text-blue-400 hover:text-blue-300 text-xs">
                            Join
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = eventsHtml;
}

/**
 * Format time (e.g., "2:30 PM")
 */
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format date (e.g., "Mon, Jan 31")
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Manual refresh button handler
 */
async function refreshCalendar() {
    const btn = event.target;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Refreshing...';

    await refreshCalendarData();

    btn.disabled = false;
    btn.textContent = originalText;
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    if (calendarRefreshInterval) {
        clearInterval(calendarRefreshInterval);
    }
});
