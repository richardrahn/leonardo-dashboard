const axios = require('axios');

const CLAWDBOT_URL = process.env.CLAWDBOT_API_URL || 'http://localhost:18789';
const CLAWDBOT_TOKEN = process.env.CLAWDBOT_TOKEN || '';

class ClawdbotHttpService {
    constructor() {
        this.agentId = 'main';
    }

    async sendMessage(message, user = 'richard-leonardo-dashboard') {
        try {
            const response = await axios.post(
                `${CLAWDBOT_URL}/v1/responses`,
                {
                    model: `clawdbot:${this.agentId}`,
                    input: message,
                    user: user,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${CLAWDBOT_TOKEN}`,
                        'Content-Type': 'application/json',
                        'x-clawdbot-agent-id': this.agentId
                    },
                    timeout: 600000 // 10 minutes - for complex tasks
                }
            );

            // Extract text from response
            if (response.data && response.data.output) {
                const textParts = [];
                for (const item of response.data.output) {
                    if (item.type === 'message' && item.content) {
                        for (const part of item.content) {
                            if ((part.type === 'output_text' || part.type === 'text') && part.text) {
                                textParts.push(part.text);
                            }
                        }
                    }
                }
                return textParts.join('\n') || 'No response';
            }

            return 'No response from Leonardo';
        } catch (error) {
            console.error('[Clawdbot HTTP] Error:', error.message);
            
            if (error.response) {
                const msg = error.response.data?.error?.message || error.message;
                return `**Error**\n\n${msg}`;
            }
            
            if (error.code === 'ECONNREFUSED') {
                return `**Connection Error**\n\nCouldn't connect to Clawdbot at \`${CLAWDBOT_URL}\`.\n\nMake sure Clawdbot is running.`;
            }
            
            return `**Error**\n\n${error.message}`;
        }
    }

    async getSessionStatus() {
        // For now, return empty - we can add sessions.list HTTP endpoint support later
        return [];
    }

    isConnected() {
        return true; // HTTP is always "connected" - we just check per-request
    }
}

module.exports = new ClawdbotHttpService();
