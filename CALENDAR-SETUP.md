# Google Calendar Integration Setup

## Prerequisites

1. **Google Cloud Project** with Calendar API enabled
2. **OAuth 2.0 Credentials** (Desktop app type)

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Desktop app" as application type
4. Name it "Leonardo Dashboard"
5. Click "Create"
6. Download the JSON file

### 3. Configure Dashboard

1. Rename downloaded JSON to `.calendar-credentials.json`
2. Place it in the `leonardo-dashboard/` directory
3. Make sure `.gitignore` includes this file (it should by default)

### 4. Authorize the App

1. Start the Leonardo Dashboard: `npm start`
2. The calendar will be disabled until authorized
3. Visit the dashboard and look for "Calendar Setup" prompt
4. Click "Authorize" and follow the OAuth flow
5. Grant calendar read permissions
6. Token will be saved to `.calendar-tokens.json`

## File Structure

```
leonardo-dashboard/
├── .calendar-credentials.json  (OAuth client credentials - DO NOT COMMIT)
├── .calendar-tokens.json       (Access/refresh tokens - DO NOT COMMIT)
├── services/
│   └── google-calendar.js      (Calendar service)
└── routes/
    └── calendar.js             (API routes)
```

## Security Notes

- **Never commit** `.calendar-credentials.json` or `.calendar-tokens.json`
- Both files are in `.gitignore` by default
- Tokens are stored locally and never shared
- Calendar data is read-only (no write permissions)

## Testing

After setup, the dashboard should show:
- **Next Meeting** card with countdown
- **Today's Schedule** in the sidebar
- Auto-refresh every 5 minutes

## Troubleshooting

### "Calendar not initialized"
- Make sure `.calendar-credentials.json` exists
- Check that the file is valid JSON
- Ensure Google Calendar API is enabled

### "Authorization failed"
- Make sure OAuth consent screen is configured
- Check that redirect URI is `http://localhost`
- Try removing `.calendar-tokens.json` and re-authorizing

### No events showing
- Verify you have events in your Google Calendar
- Check that timezone is configured correctly
- Look at server logs for API errors

## API Endpoints

- `GET /api/calendar/status` - Check if calendar is configured
- `GET /api/calendar/auth-url` - Get OAuth URL
- `POST /api/calendar/authorize` - Exchange auth code for tokens
- `GET /api/calendar/today` - Get today's events
- `GET /api/calendar/next-meeting` - Get next meeting with countdown
- `GET /api/calendar/upcoming?days=7` - Get upcoming events

---

**Note:** For now, calendar integration is optional. The dashboard works fine without it, but you'll miss the awesome calendar features!
