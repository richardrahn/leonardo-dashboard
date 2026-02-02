const WebSocket = require('ws');
const EventEmitter = require('events');

const CLAWDBOT_WS = process.env.CLAWDBOT_WS_URL || 'ws://127.0.0.1:18789';
const CLAWDBOT_TOKEN = process.env.CLAWDBOT_TOKEN || '';
const RECONNECT_DELAY = 3000;
const MESSAGE_TIMEOUT = 90000; // 90 seconds

class ClawdbotService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.connected = false;
        this.reconnecting = false;
        this.pendingMessages = new Map();
        this.messageId = 0;
        this.sessionKey = 'main';

        // Start connection
        this.connect();
    }

    connect() {
        if (this.reconnecting) return;

        this.reconnecting = true;
        this.handshakeComplete = false;
        console.log(`[Clawdbot] Connecting to ${CLAWDBOT_WS}...`);

        try {
            this.ws = new WebSocket(CLAWDBOT_WS);

            this.ws.on('open', () => {
                console.log('[Clawdbot] WebSocket opened, waiting for challenge...');
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('[Clawdbot] Received:', JSON.stringify(message).substring(0, 200));
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[Clawdbot] Failed to parse message:', error.message);
                }
            });

            this.ws.on('error', (error) => {
                console.error('[Clawdbot] WebSocket error:', error.message);
                this.connected = false;
            });

            this.ws.on('close', () => {
                console.log('[Clawdbot] WebSocket disconnected');
                this.connected = false;
                this.reconnecting = false;

                // Reject all pending messages
                for (const [id, pending] of this.pendingMessages) {
                    pending.reject(new Error('Connection closed'));
                }
                this.pendingMessages.clear();

                // Attempt to reconnect
                setTimeout(() => this.connect(), RECONNECT_DELAY);
            });

        } catch (error) {
            console.error('[Clawdbot] Connection failed:', error.message);
            this.reconnecting = false;
            setTimeout(() => this.connect(), RECONNECT_DELAY);
        }
    }

    handleMessage(message) {
        // Handle connect.challenge event
        if (message.type === 'event' && message.event === 'connect.challenge') {
            console.log('[Clawdbot] Received challenge, sending connect request...');
            const connectRequest = {
                type: 'req',
                id: 'connect-' + Date.now(),
                method: 'connect',
                params: {
                    minProtocol: 3,
                    maxProtocol: 3,
                    client: {
                        id: 'leonardo-dashboard',
                        version: '1.0.0',
                        platform: 'linux',
                        mode: 'interactive'
                    },
                    role: 'client',
                    scopes: [],
                    caps: [],
                    commands: [],
                    permissions: {},
                    auth: CLAWDBOT_TOKEN ? { token: CLAWDBOT_TOKEN } : {},
                    locale: 'en-US',
                    userAgent: 'leonardo-dashboard/1.0.0'
                }
            };
            this.ws.send(JSON.stringify(connectRequest));
            return;
        }

        // Handle connect response
        if (message.type === 'res' && message.ok && message.payload && message.payload.type === 'hello-ok') {
            console.log('[Clawdbot] Handshake complete ✓');
            this.connected = true;
            this.handshakeComplete = true;
            this.reconnecting = false;
            this.emit('connected');
            return;
        }

        // Handle different message types from Clawdbot Gateway
        if (message.type === 'res' && message.id) {
            const pending = this.pendingMessages.get(message.id);
            if (pending) {
                clearTimeout(pending.timeout);
                if (message.ok) {
                    pending.resolve(message.payload);
                } else {
                    pending.reject(new Error(message.error || 'Unknown error'));
                }
                this.pendingMessages.delete(message.id);
            }
        } else if (message.type === 'event') {
            // Unsolicited events from gateway
            console.log('[Clawdbot] Event:', message.event);
            this.emit('event', message);
        }
    }

    async sendMessage(message) {
        if (!this.connected || !this.handshakeComplete) {
            return this.formatError(new Error('Not connected to Clawdbot Gateway'));
        }

        const id = 'msg-' + (++this.messageId);
        const payload = {
            type: 'req',
            id: id,
            method: 'sessions.send',
            params: {
                sessionKey: this.sessionKey,
                message: message
            }
        };

        return new Promise((resolve, reject) => {
            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Message timeout - Leonardo is taking too long to respond'));
            }, MESSAGE_TIMEOUT);

            // Store pending message
            this.pendingMessages.set(id, { resolve, reject, timeout });

            // Send via WebSocket
            try {
                this.ws.send(JSON.stringify(payload));
                console.log(`[Clawdbot] Sent message #${id} to session "${this.sessionKey}"`);
            } catch (error) {
                clearTimeout(timeout);
                this.pendingMessages.delete(id);
                reject(error);
            }
        }).catch(error => {
            console.error('[Clawdbot] Send error:', error.message);
            return this.formatError(error);
        });
    }

    async getSessionStatus() {
        if (!this.connected || !this.handshakeComplete) {
            return [];
        }

        const id = 'sessions-' + (++this.messageId);
        const payload = {
            type: 'req',
            id: id,
            method: 'sessions.list',
            params: {}
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Timeout getting sessions'));
            }, 10000);

            this.pendingMessages.set(id, {
                resolve: (data) => resolve(Array.isArray(data) ? data : []),
                reject,
                timeout
            });

            try {
                this.ws.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingMessages.delete(id);
                reject(error);
            }
        }).catch(error => {
            console.error('[Clawdbot] Failed to get sessions:', error.message);
            return [];
        });
    }

    async getSessionDetails(sessionKey) {
        if (!this.connected) {
            throw new Error('Not connected to Clawdbot Gateway');
        }

        const id = ++this.messageId;
        const payload = {
            type: 'get_session',
            id: id,
            sessionKey: sessionKey
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Timeout getting session details'));
            }, 10000);

            this.pendingMessages.set(id, { resolve, reject, timeout });

            try {
                this.ws.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingMessages.delete(id);
                reject(error);
            }
        });
    }

    async spawnSession({ name, type, prompt }) {
        if (!this.connected) {
            throw new Error('Not connected to Clawdbot Gateway');
        }

        console.log(`[Clawdbot] Spawning session: ${name} (${type})`);

        const id = ++this.messageId;
        const payload = {
            type: 'spawn_session',
            id: id,
            name: name,
            sessionType: type || 'claude_code',
            initialPrompt: prompt
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Timeout spawning session'));
            }, 30000);

            this.pendingMessages.set(id, { resolve, reject, timeout });

            try {
                this.ws.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingMessages.delete(id);
                reject(error);
            }
        });
    }

    async sendToSession(sessionKey, message, timeout = 60) {
        if (!this.connected) {
            throw new Error('Not connected to Clawdbot Gateway');
        }

        const id = ++this.messageId;
        const payload = {
            type: 'send',
            id: id,
            sessionKey: sessionKey,
            message: message
        };

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Message timeout'));
            }, timeout * 1000);

            this.pendingMessages.set(id, { resolve, reject, timeout: timer });

            try {
                this.ws.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timer);
                this.pendingMessages.delete(id);
                reject(error);
            }
        });
    }

    async killSession(sessionKey) {
        if (!this.connected) {
            throw new Error('Not connected to Clawdbot Gateway');
        }

        console.log(`[Clawdbot] Killing session: ${sessionKey}`);

        const id = ++this.messageId;
        const payload = {
            type: 'kill_session',
            id: id,
            sessionKey: sessionKey
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Timeout killing session'));
            }, 10000);

            this.pendingMessages.set(id, { resolve, reject, timeout });

            try {
                this.ws.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingMessages.delete(id);
                reject(error);
            }
        });
    }

    async getSessionLogs(sessionKey, limit = 50) {
        if (!this.connected) {
            return [];
        }

        const id = ++this.messageId;
        const payload = {
            type: 'get_logs',
            id: id,
            sessionKey: sessionKey,
            limit: limit
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Timeout getting logs'));
            }, 10000);

            this.pendingMessages.set(id, {
                resolve: (data) => resolve(Array.isArray(data) ? data : []),
                reject,
                timeout
            });

            try {
                this.ws.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingMessages.delete(id);
                reject(error);
            }
        }).catch(error => {
            console.error(`[Clawdbot] Failed to get logs for ${sessionKey}:`, error.message);
            return [];
        });
    }

    async searchMemory(query) {
        if (!this.connected) {
            return { results: [] };
        }

        const id = ++this.messageId;
        const payload = {
            type: 'search_memory',
            id: id,
            query: query,
            limit: 20
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Memory search timeout'));
            }, 15000);

            this.pendingMessages.set(id, {
                resolve: (data) => resolve(data || { results: [] }),
                reject,
                timeout
            });

            try {
                this.ws.send(JSON.stringify(payload));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingMessages.delete(id);
                reject(error);
            }
        }).catch(error => {
            console.error('[Clawdbot] Memory search failed:', error.message);
            return { results: [] };
        });
    }

    formatError(error) {
        if (!this.connected) {
            return `**Connection Error**\n\nNot connected to Clawdbot Gateway at \`${CLAWDBOT_WS}\`.\n\nMake sure Clawdbot is running and the WebSocket endpoint is accessible.`;
        }

        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
            return `**Timeout**\n\nLeonardo is taking longer than expected to respond. The request may still be processing.`;
        }

        return `**Error**\n\n${error.message}`;
    }

    // Helper to check connection status
    isConnected() {
        return this.connected;
    }

    // Graceful shutdown
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

module.exports = new ClawdbotService();
