/**
 * Google Calendar Service
 * Integrates with Google Calendar API to fetch today's events and upcoming meetings
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleCalendarService {
    constructor() {
        this.calendar = null;
        this.oauth2Client = null;
        this.initialized = false;
        this.tokenPath = path.join(__dirname, '../.calendar-tokens.json');
        this.credentialsPath = path.join(__dirname, '../.calendar-credentials.json');
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            // Check if credentials file exists
            const credentialsExist = await fs.access(this.credentialsPath).then(() => true).catch(() => false);
            if (!credentialsExist) {
                console.log('[Calendar] No credentials file found. Calendar integration disabled.');
                return false;
            }

            // Load credentials
            const credentials = JSON.parse(await fs.readFile(this.credentialsPath, 'utf8'));
            const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

            // Create OAuth2 client
            this.oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

            // Check if we have stored tokens
            const tokensExist = await fs.access(this.tokenPath).then(() => true).catch(() => false);
            if (tokensExist) {
                const tokens = JSON.parse(await fs.readFile(this.tokenPath, 'utf8'));
                this.oauth2Client.setCredentials(tokens);
            } else {
                console.log('[Calendar] No tokens found. User needs to authorize.');
                return false;
            }

            // Initialize calendar API
            this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            this.initialized = true;

            console.log('[Calendar] ✓ Initialized successfully');
            return true;
        } catch (error) {
            console.error('[Calendar] Initialization error:', error.message);
            return false;
        }
    }

    /**
     * Get authorization URL for OAuth flow
     */
    getAuthUrl() {
        const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async authorize(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // Save tokens for future use
            await fs.writeFile(this.tokenPath, JSON.stringify(tokens));

            this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            this.initialized = true;

            console.log('[Calendar] ✓ Authorization complete');
            return { success: true };
        } catch (error) {
            console.error('[Calendar] Authorization error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get today's events
     */
    async getTodayEvents() {
        if (!this.initialized) {
            await this.initialize();
            if (!this.initialized) {
                return { error: 'Calendar not initialized' };
            }
        }

        try {
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));

            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items || [];

            return {
                success: true,
                count: events.length,
                events: events.map(event => this.formatEvent(event)),
            };
        } catch (error) {
            console.error('[Calendar] Error fetching today\'s events:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Get upcoming events (next 7 days)
     */
    async getUpcomingEvents(days = 7) {
        if (!this.initialized) {
            await this.initialize();
            if (!this.initialized) {
                return { error: 'Calendar not initialized' };
            }
        }

        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + days);

            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: now.toISOString(),
                timeMax: futureDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 20,
            });

            const events = response.data.items || [];

            return {
                success: true,
                count: events.length,
                events: events.map(event => this.formatEvent(event)),
            };
        } catch (error) {
            console.error('[Calendar] Error fetching upcoming events:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Get next meeting
     */
    async getNextMeeting() {
        if (!this.initialized) {
            await this.initialize();
            if (!this.initialized) {
                return { error: 'Calendar not initialized' };
            }
        }

        try {
            const now = new Date();
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: now.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 1,
            });

            const events = response.data.items || [];

            if (events.length === 0) {
                return { success: true, nextMeeting: null };
            }

            const event = this.formatEvent(events[0]);
            const startTime = new Date(event.start);
            const minutesUntil = Math.round((startTime - now) / 1000 / 60);

            return {
                success: true,
                nextMeeting: event,
                minutesUntil: minutesUntil,
                timeUntil: this.formatTimeUntil(minutesUntil),
            };
        } catch (error) {
            console.error('[Calendar] Error fetching next meeting:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Format event data
     */
    formatEvent(event) {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        const isAllDay = !event.start.dateTime;

        // Extract meeting link (Google Meet, Zoom, etc.)
        let meetingLink = null;
        if (event.hangoutLink) {
            meetingLink = event.hangoutLink;
        } else if (event.conferenceData && event.conferenceData.entryPoints) {
            const videoEntry = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
            if (videoEntry) meetingLink = videoEntry.uri;
        } else if (event.description) {
            // Try to extract Zoom/Meet links from description
            const zoomMatch = event.description.match(/https:\/\/[^\s]*zoom\.us\/[^\s]*/i);
            const meetMatch = event.description.match(/https:\/\/meet\.google\.com\/[^\s]*/i);
            meetingLink = zoomMatch ? zoomMatch[0] : (meetMatch ? meetMatch[0] : null);
        }

        return {
            id: event.id,
            summary: event.summary || '(No title)',
            description: event.description || '',
            start: start,
            end: end,
            isAllDay: isAllDay,
            location: event.location || null,
            meetingLink: meetingLink,
            attendees: event.attendees ? event.attendees.length : 0,
            status: event.status,
            htmlLink: event.htmlLink,
        };
    }

    /**
     * Format time until meeting
     */
    formatTimeUntil(minutes) {
        if (minutes < 0) return 'In progress';
        if (minutes === 0) return 'Starting now';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    /**
     * Check if calendar is configured
     */
    async isConfigured() {
        const credentialsExist = await fs.access(this.credentialsPath).then(() => true).catch(() => false);
        const tokensExist = await fs.access(this.tokenPath).then(() => true).catch(() => false);
        return credentialsExist && tokensExist;
    }
}

module.exports = new GoogleCalendarService();
