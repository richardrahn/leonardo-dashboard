require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const systemRoutes = require('./routes/system');
const memoryRoutes = require('./routes/memory');
const sessionRoutes = require('./routes/sessions');
const fileRoutes = require('./routes/files');
const settingsRoutes = require('./routes/settings');
const calendarRoutes = require('./routes/calendar');
const briefingRoutes = require('./routes/briefing');
const weatherRoutes = require('./routes/weather');

// Middleware & Services
const errorHandler = require('./middleware/error');
const db = require('./database/db');
const clawdbot = require('./services/clawdbot-http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/briefing', briefingRoutes);
app.use('/api/weather', weatherRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use(errorHandler);

// Make io accessible in routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Handle chat messages
    socket.on('chat:message', async (data) => {
        try {
            const { message } = data;

            if (!message || !message.trim()) {
                socket.emit('chat:error', { message: 'Empty message' });
                return;
            }

            // Save user message to DB
            db.saveChatMessage('main', 'user', message);

            // Emit typing indicator
            io.emit('chat:typing', { typing: true });

            // Send to Leonardo via Clawdbot
            console.log('[Chat] Sending message to Clawdbot:', message.substring(0, 50));
            const response = await clawdbot.sendMessage(message);
            console.log('[Chat] Got response:', response.substring(0, 100));

            // Stop typing indicator
            io.emit('chat:typing', { typing: false });

            // Save Leonardo's response
            db.saveChatMessage('main', 'assistant', response);

            // Emit response to all clients
            const responseData = {
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            };
            console.log('[Chat] Emitting response to clients');
            io.emit('chat:message', responseData);

            // Log activity
            db.logActivity('chat_message', 'Chat with Leonardo');

        } catch (error) {
            console.error('[Socket] Chat error:', error);
            io.emit('chat:typing', { typing: false });
            socket.emit('chat:error', { message: 'Failed to send message' });
        }
    });

    // Handle typing indicators
    socket.on('typing:start', () => {
        socket.broadcast.emit('user:typing', { typing: true });
    });

    socket.on('typing:stop', () => {
        socket.broadcast.emit('user:typing', { typing: false });
    });

    // Session events
    socket.on('session:subscribe', (sessionKey) => {
        socket.join(`session:${sessionKey}`);
    });

    socket.on('session:unsubscribe', (sessionKey) => {
        socket.leave(`session:${sessionKey}`);
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});

// Periodic session status updates (every 30 seconds)
setInterval(async () => {
    try {
        const sessions = await clawdbot.getSessionStatus();
        io.emit('sessions:status', sessions);
    } catch (error) {
        // Silently fail - don't spam logs
    }
}, 30000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   🎯  LEONARDO DASHBOARD                              ║');
    console.log('║                                                       ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║   Local:    http://localhost:${PORT}                     ║`);
    console.log(`║   Network:  http://0.0.0.0:${PORT}                       ║`);
    console.log('║                                                       ║');
    console.log('║   Access from any device on your network using        ║');
    console.log('║   your machine\'s local IP address.                    ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
});

// Graceful shutdown
const shutdown = () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
        db.close();
        console.log('Goodbye! 👋');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
