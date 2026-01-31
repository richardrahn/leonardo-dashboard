/**
 * Morning Briefing Service
 * Generates AI-powered daily briefings aggregating calendar, tasks, emails, weather, etc.
 */

const clawdbot = require('./clawdbot');
const calendarService = require('./google-calendar');

class MorningBriefingService {
    constructor() {
        this.cache = {
            lastBriefing: null,
            lastGenerated: null,
            cacheDuration: 30 * 60 * 1000, // 30 minutes
        };
    }

    /**
     * Generate morning briefing
     */
    async generateBriefing() {
        // Check cache first
        if (this.cache.lastBriefing &&
            this.cache.lastGenerated &&
            Date.now() - this.cache.lastGenerated < this.cache.cacheDuration) {
            console.log('[Briefing] Returning cached briefing');
            return this.cache.lastBriefing;
        }

        console.log('[Briefing] Generating fresh briefing...');

        try {
            // Gather data from various sources
            const data = await this.gatherBriefingData();

            // Generate AI briefing
            const briefing = await this.generateAIBriefing(data);

            // Cache the result
            this.cache.lastBriefing = briefing;
            this.cache.lastGenerated = Date.now();

            return briefing;
        } catch (error) {
            console.error('[Briefing] Generation failed:', error.message);
            return this.generateFallbackBriefing();
        }
    }

    /**
     * Gather data for briefing
     */
    async gatherBriefingData() {
        const now = new Date();
        const hour = now.getHours();

        // Determine time of day
        let timeOfDay = 'day';
        let greeting = 'Hello';
        if (hour < 12) {
            timeOfDay = 'morning';
            greeting = 'Good morning';
        } else if (hour < 17) {
            timeOfDay = 'afternoon';
            greeting = 'Good afternoon';
        } else if (hour < 22) {
            timeOfDay = 'evening';
            greeting = 'Good evening';
        } else {
            timeOfDay = 'night';
            greeting = 'Good evening';
        }

        const data = {
            timeOfDay,
            greeting,
            date: now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
            }),
        };

        // Try to get calendar data
        try {
            if (await calendarService.isConfigured()) {
                await calendarService.initialize();
                data.calendar = {
                    today: await calendarService.getTodayEvents(),
                    nextMeeting: await calendarService.getNextMeeting(),
                };
            }
        } catch (error) {
            console.error('[Briefing] Failed to get calendar data:', error.message);
        }

        // Try to get tasks data (from database)
        try {
            const db = require('../database/db');
            data.tasks = {
                dueToday: db.getTasksDueToday(),
                overdue: db.getOverdueTasks(),
                high: db.getHighPriorityTasks(),
            };
        } catch (error) {
            console.error('[Briefing] Failed to get tasks data:', error.message);
        }

        // Try to get project stats
        try {
            const db = require('../database/db');
            data.projects = {
                active: db.getActiveProjects(),
                blocked: db.getBlockedProjects(),
            };
        } catch (error) {
            console.error('[Briefing] Failed to get projects data:', error.message);
        }

        // Weather (placeholder - would integrate with weather skill)
        // data.weather = await this.getWeather();

        return data;
    }

    /**
     * Generate AI-powered briefing using Leonardo
     */
    async generateAIBriefing(data) {
        // Build context for Leonardo
        const context = this.buildContextString(data);

        const prompt = `Generate a personalized morning briefing for Richard. Be concise, actionable, and friendly.

${context}

Format your response as a brief, conversational briefing that:
1. Starts with a warm greeting
2. Highlights the most important 2-3 things for today
3. Mentions any urgent items (overdue tasks, soon meetings)
4. Ends with an encouraging note

Keep it under 100 words. Be specific with numbers and times.`;

        try {
            // Call Leonardo via Clawdbot
            const response = await clawdbot.sendMessage(prompt);

            if (response && response.message) {
                return {
                    success: true,
                    briefing: response.message,
                    generatedAt: Date.now(),
                    source: 'ai',
                };
            } else {
                throw new Error('No response from Leonardo');
            }
        } catch (error) {
            console.error('[Briefing] AI generation failed:', error.message);
            // Fall back to template-based briefing
            return this.generateTemplateBriefing(data);
        }
    }

    /**
     * Build context string from gathered data
     */
    buildContextString(data) {
        let context = `Today is ${data.date}.\n\n`;

        // Calendar
        if (data.calendar) {
            if (data.calendar.today && data.calendar.today.events) {
                context += `📅 Calendar: ${data.calendar.today.events.length} events today\n`;
                if (data.calendar.nextMeeting && data.calendar.nextMeeting.nextMeeting) {
                    const next = data.calendar.nextMeeting;
                    context += `⏰ Next meeting: "${next.nextMeeting.summary}" in ${next.timeUntil}\n`;
                }
            } else {
                context += `📅 Calendar: No events scheduled today\n`;
            }
        }

        // Tasks
        if (data.tasks) {
            const { dueToday = [], overdue = [], high = [] } = data.tasks;
            if (overdue.length > 0) {
                context += `⚠️ ${overdue.length} overdue tasks need attention!\n`;
            }
            if (dueToday.length > 0) {
                context += `✅ ${dueToday.length} tasks due today\n`;
            }
            if (high.length > 0) {
                context += `🔥 ${high.length} high-priority tasks\n`;
            }
        }

        // Projects
        if (data.projects) {
            const { active = [], blocked = [] } = data.projects;
            if (active.length > 0) {
                context += `📊 ${active.length} active projects\n`;
            }
            if (blocked.length > 0) {
                context += `🚧 ${blocked.length} blocked projects need unblocking\n`;
            }
        }

        return context;
    }

    /**
     * Generate template-based briefing (fallback)
     */
    generateTemplateBriefing(data) {
        let briefing = `${data.greeting} Richard! `;

        const parts = [];

        // Calendar
        if (data.calendar) {
            if (data.calendar.today && data.calendar.today.events) {
                const count = data.calendar.today.events.length;
                if (count > 0) {
                    parts.push(`You have ${count} ${count === 1 ? 'meeting' : 'meetings'} today`);
                    if (data.calendar.nextMeeting && data.calendar.nextMeeting.nextMeeting) {
                        const next = data.calendar.nextMeeting;
                        parts.push(`starting with "${next.nextMeeting.summary}" in ${next.timeUntil}`);
                    }
                } else {
                    parts.push("Your calendar is clear today");
                }
            }
        }

        // Tasks
        if (data.tasks) {
            const { dueToday = [], overdue = [] } = data.tasks;
            if (overdue.length > 0) {
                parts.push(`**${overdue.length} overdue tasks** need your attention`);
            } else if (dueToday.length > 0) {
                parts.push(`${dueToday.length} tasks are due today`);
            }
        }

        // Projects
        if (data.projects) {
            const { blocked = [] } = data.projects;
            if (blocked.length > 0) {
                parts.push(`${blocked.length} ${blocked.length === 1 ? 'project is' : 'projects are'} blocked`);
            }
        }

        if (parts.length > 0) {
            briefing += parts.join('. ') + '.';
        } else {
            briefing += "You have a clear schedule today. Perfect time for focused work!";
        }

        // Add encouraging note
        if (data.timeOfDay === 'morning') {
            briefing += " Let's make it a great day! 🚀";
        } else if (data.timeOfDay === 'afternoon') {
            briefing += " Keep up the great work! 💪";
        } else {
            briefing += " Time to wind down. 🌙";
        }

        return {
            success: true,
            briefing: briefing,
            generatedAt: Date.now(),
            source: 'template',
        };
    }

    /**
     * Generate fallback briefing when all else fails
     */
    generateFallbackBriefing() {
        const hour = new Date().getHours();
        let greeting = 'Hello';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 17) greeting = 'Good afternoon';
        else greeting = 'Good evening';

        return {
            success: true,
            briefing: `${greeting} Richard! Ready to tackle the day? Check your calendar and tasks to see what's ahead. 🎯`,
            generatedAt: Date.now(),
            source: 'fallback',
        };
    }

    /**
     * Clear cache (force refresh)
     */
    clearCache() {
        this.cache.lastBriefing = null;
        this.cache.lastGenerated = null;
    }
}

module.exports = new MorningBriefingService();
