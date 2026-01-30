const axios = require('axios');

const CLAWDBOT_API = process.env.CLAWDBOT_API_URL || 'http://localhost:3100';

class ClawdbotService {
    constructor() {
        this.client = axios.create({
            baseURL: CLAWDBOT_API,
            timeout: 65000
        });
    }

    async findLeonardoSession() {
        try {
            const sessions = await this.getSessionStatus();
            const leonardoSession = sessions.find(s =>
                s.name?.toLowerCase().includes('leonardo') ||
                s.key === 'main' ||
                s.type === 'main'
            );
            return leonardoSession?.key || 'main';
        } catch (error) {
            console.error('Failed to find Leonardo session:', error.message);
            return 'main';
        }
    }

    async sendMessage(message) {
        try {
            const sessionKey = await this.findLeonardoSession();
            console.log(`[Clawdbot] Sending to session "${sessionKey}"`);

            const response = await this.client.post('/api/sessions/send', {
                sessionKey: sessionKey,
                message: message,
                timeoutSeconds: 60
            });

            if (response.data?.response) {
                return response.data.response;
            }
            if (response.data?.message) {
                return response.data.message;
            }
            if (typeof response.data === 'string') {
                return response.data;
            }

            return JSON.stringify(response.data) || 'No response from Leonardo';
        } catch (error) {
            console.error('[Clawdbot] API error:', error.message);
            return this.formatError(error);
        }
    }

    async getSessionStatus() {
        try {
            const response = await this.client.get('/api/sessions');
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('[Clawdbot] Failed to get sessions:', error.message);
            return [];
        }
    }

    async getSessionDetails(sessionKey) {
        try {
            const response = await this.client.get(`/api/sessions/${sessionKey}`);
            return response.data;
        } catch (error) {
            console.error(`[Clawdbot] Failed to get session ${sessionKey}:`, error.message);
            throw error;
        }
    }

    async spawnSession({ name, type, prompt }) {
        try {
            console.log(`[Clawdbot] Spawning session: ${name} (${type})`);

            const response = await this.client.post('/api/sessions/spawn', {
                name,
                type: type || 'claude_code',
                initialPrompt: prompt
            });

            return response.data;
        } catch (error) {
            console.error('[Clawdbot] Failed to spawn session:', error.message);
            throw error;
        }
    }

    async sendToSession(sessionKey, message, timeout = 60) {
        try {
            const response = await this.client.post('/api/sessions/send', {
                sessionKey,
                message,
                timeoutSeconds: timeout
            }, {
                timeout: (timeout + 5) * 1000
            });

            return response.data;
        } catch (error) {
            console.error(`[Clawdbot] Failed to send to session ${sessionKey}:`, error.message);
            throw error;
        }
    }

    async killSession(sessionKey) {
        try {
            console.log(`[Clawdbot] Killing session: ${sessionKey}`);

            const response = await this.client.delete(`/api/sessions/${sessionKey}`);
            return response.data;
        } catch (error) {
            console.error(`[Clawdbot] Failed to kill session ${sessionKey}:`, error.message);
            throw error;
        }
    }

    async getSessionLogs(sessionKey, limit = 50) {
        try {
            const response = await this.client.get(`/api/sessions/${sessionKey}/logs`, {
                params: { limit }
            });
            return response.data;
        } catch (error) {
            console.error(`[Clawdbot] Failed to get logs for ${sessionKey}:`, error.message);
            return [];
        }
    }

    async searchMemory(query) {
        try {
            const response = await this.client.post('/api/memory/search', {
                query,
                limit: 20
            });
            return response.data;
        } catch (error) {
            console.error('[Clawdbot] Memory search failed:', error.message);
            return { results: [] };
        }
    }

    formatError(error) {
        if (error.code === 'ECONNREFUSED') {
            return `**Connection Error**\n\nCannot reach Clawdbot at \`${CLAWDBOT_API}\`.\n\nMake sure Clawdbot is running on the same machine.`;
        }

        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return `**Timeout**\n\nRequest to Clawdbot timed out. Leonardo might be processing a complex request.`;
        }

        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error || error.response.data?.message || 'Unknown error';

            if (status === 404) {
                return `**Not Found**\n\nThe requested session or resource was not found.`;
            }
            if (status === 503) {
                return `**Service Unavailable**\n\nClawdbot is temporarily unavailable. Try again in a moment.`;
            }

            return `**API Error (${status})**\n\n${message}`;
        }

        return `**Error**\n\n${error.message}`;
    }
}

module.exports = new ClawdbotService();
