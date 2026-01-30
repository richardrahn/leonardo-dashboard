# Leonardo Dashboard

A modern, full-featured web dashboard for interacting with Leonardo (Clawdbot agent) and managing business projects, tasks, and AI workflows.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Leonardo+Dashboard)

## Features

### Phase 1 - Core
- **Chat** - Real-time conversation with Leonardo via Clawdbot
- **Projects** - Kanban board with drag-and-drop (Backlog → In Progress → Blocked → Done)
- **Tasks** - Todo list with priorities, due dates, and project linking

### Phase 2 - Advanced
- **Dashboard** - Overview with stats, today's focus, and activity feed
- **Memory Hub** - Browse, search, and edit agent memory files
- **Sessions** - View, spawn, and manage AI agent sessions
- **File Browser** - Browse and edit workspace files

### Extras
- Real-time updates via WebSocket
- Dark mode UI with modern design
- Keyboard shortcuts (1-4 for nav, Cmd+K for quick nav)
- Toast notifications
- Export chat to markdown
- Mobile responsive

## Quick Start

### 1. Transfer to Linux

```bash
# Option A: Git (recommended)
cd leonardo-dashboard
git init && git add . && git commit -m "Leonardo Dashboard"
# Push to your repo, then pull on Linux

# Option B: SCP
scp -r leonardo-dashboard richard@<linux-ip>:/home/richard/clawd/
```

### 2. Install & Setup (on Linux)

```bash
cd /home/richard/clawd/leonardo-dashboard
npm install
npm run setup
```

### 3. Configure (optional)

Edit `.env` to customize paths:

```bash
PORT=3000
JWT_SECRET=your-secret-key    # CHANGE THIS!
CLAWDBOT_API_URL=http://localhost:3100
MEMORY_PATH=/home/richard/clawd/memory
FILES_PATH=/home/richard/clawd
```

### 4. Start

```bash
npm start
```

### 5. Access

Open in any browser on your network:
```
http://<linux-ip>:3000
```

**Default Login:**
- Username: `richard`
- Password: `admin123`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Dashboard |
| `2` | Chat |
| `3` | Projects |
| `4` | Tasks |
| `Cmd/Ctrl + K` | Quick navigation |
| `Escape` | Close modal |

## Architecture

```
[Browser] ──HTTP/WS──▶ [Dashboard :3000] ──localhost──▶ [Clawdbot :3100] ──▶ [Leonardo]
```

The dashboard runs on the same Linux machine as Clawdbot and communicates locally.

## Run as Service

Create `/etc/systemd/system/leonardo-dashboard.service`:

```ini
[Unit]
Description=Leonardo Dashboard
After=network.target

[Service]
Type=simple
User=richard
WorkingDirectory=/home/richard/clawd/leonardo-dashboard
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable leonardo-dashboard
sudo systemctl start leonardo-dashboard
```

## Tech Stack

- **Backend:** Node.js, Express, Socket.io, better-sqlite3
- **Frontend:** Vanilla JS, Tailwind CSS, Marked.js, SortableJS
- **Database:** SQLite (WAL mode)
- **Font:** Inter

## File Structure

```
leonardo-dashboard/
├── server.js           # Main server with Socket.io
├── setup.js            # Interactive setup script
├── package.json
├── .env                # Configuration
├── database/
│   ├── db.js           # SQLite wrapper
│   ├── schema.sql      # Tables
│   └── seed.sql        # Sample data
├── routes/
│   ├── auth.js         # Login/logout/verify
│   ├── chat.js         # Chat history/export
│   ├── projects.js     # Project CRUD
│   ├── tasks.js        # Task CRUD
│   ├── system.js       # Stats/activity/health
│   ├── memory.js       # Memory file operations
│   ├── sessions.js     # Agent session management
│   └── files.js        # File browser operations
├── middleware/
│   ├── auth.js         # JWT verification
│   └── error.js        # Error handling
├── services/
│   └── clawdbot.js     # Clawdbot API client
└── public/
    ├── index.html      # Main app
    ├── login.html      # Login page
    ├── css/styles.css  # Custom styles
    └── js/
        ├── app.js      # Main app + utilities
        ├── auth.js     # Auth utilities
        ├── chat.js     # Chat functionality
        ├── projects.js # Project board
        ├── tasks.js    # Task list
        ├── dashboard.js # Dashboard overview
        ├── memory.js   # Memory hub
        ├── sessions.js # Session manager
        └── files.js    # File browser
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change password

### Chat
- `GET /api/chat/history` - Get messages
- `GET /api/chat/export` - Export to markdown
- `DELETE /api/chat/clear` - Clear history

### Projects
- `GET /api/projects` - List all
- `POST /api/projects` - Create
- `PATCH /api/projects/:id` - Update
- `DELETE /api/projects/:id` - Delete

### Tasks
- `GET /api/tasks` - List all
- `POST /api/tasks` - Create
- `PATCH /api/tasks/:id` - Update
- `DELETE /api/tasks/:id` - Delete

### System
- `GET /api/system/stats` - Dashboard stats
- `GET /api/system/focus` - Today's focus items
- `GET /api/system/activity` - Activity feed
- `GET /api/system/health` - Health check

### Memory
- `GET /api/memory/files` - List files
- `GET /api/memory/read` - Read file
- `PUT /api/memory/write` - Write file
- `GET /api/memory/search` - Search content
- `POST /api/memory/quick-add` - Quick note

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions/spawn` - Spawn agent
- `POST /api/sessions/:key/send` - Send message
- `DELETE /api/sessions/:key` - Kill session

### Files
- `GET /api/files/list` - List directory
- `GET /api/files/read` - Read file
- `PUT /api/files/write` - Write file
- `POST /api/files/create` - Create file/folder
- `DELETE /api/files/delete` - Delete
- `POST /api/files/rename` - Rename/move

## WebSocket Events

### Client → Server
- `chat:message` - Send chat message
- `typing:start` / `typing:stop` - Typing indicators

### Server → Client
- `chat:message` - New message from Leonardo
- `chat:typing` - Leonardo typing indicator
- `project:created/updated/deleted` - Project changes
- `task:created/updated/deleted` - Task changes
- `sessions:status` - Session status updates

## Troubleshooting

**Can't connect to Clawdbot?**
- Ensure Clawdbot is running on port 3100
- Check `CLAWDBOT_API_URL` in `.env`

**Login not working?**
- Run `npm run setup` to reset the database
- Check that password hash was created

**Memory/Files not showing?**
- Check `MEMORY_PATH` and `FILES_PATH` in `.env`
- Ensure directories exist and are readable

**Real-time updates not working?**
- Check browser console for WebSocket errors
- Ensure firewall allows port 3000

## License

Private - Ezbelta LLC
