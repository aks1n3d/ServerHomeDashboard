# Homelab Dashboard - Complete Implementation Guide (Phases 1-3)

**Version:** 3.0 | **Status:** Production Ready ✅  
**Last Updated:** March 17, 2026  
**All 3 Phases Complete:** ✅ Phase 1 | ✅ Phase 2 | ✅ Phase 3

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Design](#architecture--design)
3. [Phase 1: Authentication & Database](#phase-1-authentication--database-foundation)
4. [Phase 2: User Experience](#phase-2-user-experience-ui--themes)
5. [Phase 3: Production Ready](#phase-3-production-ready-https--webhooks)
6. [Installation & Deployment](#installation--deployment)
7. [API Reference](#api-reference)
8. [Development Guide](#development-guide)
9. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is Homelab Dashboard?

**Homelab Dashboard** is a modern, self-hosted homepage for homelab servers. It provides a beautiful interface to monitor and access your services, with real-time system monitoring and health checks.

**Key Features:**
- 🎨 Modern glassmorphism UI with dark/light themes
- 👤 Multi-user support with JWT authentication
- 📊 Real-time system monitoring (CPU, RAM, Disk, Docker)
- 🏥 Service health monitoring with uptime tracking
- 🔔 Custom alerts & notifications
- 🪝 Webhook integrations for external services
- 🔒 HTTPS/SSL support for secure deployment
- 💾 SQLite database with persistent storage
- 📱 Fully responsive design

### Technology Stack

**Backend:**
- Node.js 18+
- Express.js (REST API)
- SQLite3 (persistent data)
- JWT (authentication)
- bcryptjs (password hashing)

**Frontend:**
- Vanilla JavaScript (no frameworks)
- HTML5 + CSS3
- Responsive design

**Deployment:**
- Docker & Docker Compose
- Optional HTTPS/SSL
- systemd or PM2 (optional)

---

## Architecture & Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOMELAB DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (Vanilla JavaScript)                              │
│  ├─ app.js ............................ Main UI orchestration
│  ├─ auth.js ........................... User authentication
│  ├─ themes.js ......................... Dark/Light themes
│  ├─ alerts.js ......................... Alert management
│  └─ uptime.js ......................... Uptime tracking
│                                                              │
│  ↕ HTTP/HTTPS (REST API)                                    │
│                                                              │
│  BACKEND (Express.js)                                       │
│  ├─ server.js ......................... API endpoints
│  ├─ auth.js ........................... JWT handling
│  ├─ db.js ............................. Database queries
│  ├─ cert.js ........................... HTTPS support
│  └─ webhooks.js ....................... Webhook triggers
│                                                              │
│  DATABASE (SQLite)                                          │
│  ├─ users ......................... User accounts
│  ├─ alerts ........................ Alert rules
│  ├─ webhooks ..................... Webhook configs
│  ├─ uptime_history .............. Service history
│  └─ user_preferences ............ User settings
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    ↓
JavaScript Handler (app.js, auth.js, alerts.js, etc.)
    ↓
API Call (fetch to /api/...)
    ↓
Express Route Handler
    ↓
Database Query (if needed)
    ↓
Response JSON
    ↓
JavaScript Handler
    ↓
UI Update (DOM manipulation)
    ↓
User sees result
```

### Security Model

```
User Registration/Login
    ↓
Password → bcryptjs → hash stored in DB
    ↓
JWT Token Generated → httpOnly cookie
    ↓
Subsequent requests include JWT
    ↓
Middleware validates token
    ↓
Request proceeds with user context
```

---

## PHASE 1: Authentication & Database Foundation

### What Phase 1 Provides

Phase 1 establishes the core infrastructure for a production database-backed system:

**1. User Authentication**
- Registration with email validation
- Login with credentials
- JWT token generation (7-day expiry)
- Password hashing with bcryptjs (10-round salt)
- Secure httpOnly cookies
- Bearer token support for API clients

**2. Database Persistence (SQLite)**
- 9 tables with foreign keys and indexes
- Automatic schema initialization
- User account management
- Service health caching (replaces in-memory)
- Uptime history recording
- Multi-user alert system
- Webhook configuration storage

**3. Multi-User Support**
- Per-user preferences
- Isolated alert rules
- Service customizations
- Webhook management

### Phase 1 Database Schema

```
users
├─ id (PK)
├─ username (UNIQUE)
├─ email (UNIQUE)
├─ password_hash
└─ created_at

user_preferences
├─ id (PK)
├─ user_id (FK)
├─ theme
├─ layout
└─ auto_refresh_interval

services_cache
├─ id (PK)
├─ service_name
├─ status
├─ response_time
└─ error_message

uptime_history
├─ id (PK)
├─ service_name
├─ status
├─ response_time
└─ checked_at

alerts
├─ id (PK)
├─ user_id (FK)
├─ service_name
├─ alert_type
└─ threshold_value

webhooks
├─ id (PK)
├─ user_id (FK)
├─ url
├─ event_types
└─ active

[Additional tables: alert_history, webhook_logs, user_service_customizations]
```

### Phase 1 API Endpoints

**Authentication (5 endpoints)**
```
POST   /api/auth/register         Register new account
POST   /api/auth/login            Login user
POST   /api/auth/logout           Logout user
GET    /api/auth/me               Get user info
PUT    /api/auth/preferences      Update preferences
```

**Services (4 endpoints)**
```
GET    /api/services              Get all services with health
GET    /api/health                Get health status only
POST   /api/health-check          Force immediate check
GET    /api/services/:name/uptime Get uptime % and history
```

**Base Infrastructure Ready**
```
GET    /api/alerts                List user's alerts
GET    /api/webhooks              List user's webhooks
GET    /api/user/services         Get user's customizations
```

### Phase 1 Installation

```bash
# Install dependencies
npm install

# Start server
npm start

# Server initializes database automatically on first run
```

---

## PHASE 2: User Experience, UI & Themes

### What Phase 2 Provides

Phase 2 transforms the dashboard with rich user experience features:

**1. Dark/Light Theme Toggle**
- Three modes: Auto (OS preference), Light, Dark
- Instant theme switching with CSS variables
- 35+ customized colors for light mode
- Database persistence (or localStorage fallback)
- Smooth transitions between themes
- Button cycles through modes (click 🌙 in header)

**Light Mode Colors:**
- Background: #f8fafc (light gray)
- Text: #0f172a (dark navy)
- Accents: #0284c7 (sky blue)
- High contrast for readability

**2. Service Categories & Grouping**
- Services auto-grouped by `category` field in config
- Available categories: Media, Infrastructure, Security, Storage, Monitoring, Uncategorized
- Click category header to collapse/expand
- "Expand All" / "Collapse All" buttons
- Category count badges
- Smooth expand/collapse animations
- Expanded/collapsed state persists in localStorage

**3. Custom Alerts & Notifications**
- Create alerts via modal form
- Select service from dropdown
- Choose alert type:
  - Response Time Threshold (alert if > X ms)
  - Service Offline (alert if down)
- Set threshold value
- View all alerts in modal
- Delete unwanted alerts
- Alert badge shows count (red badge in header)
- Badge auto-hides when count = 0
- Animated pulse effect on badge
- Alerts persist across logout/login

### Phase 2 Features in Detail

**Theme Toggle (🌙 Button)**
```
Location: Top-right header
Click: Cycles Dark → Light → Auto → Dark
Icon: Changes based on mode
Data: Stored in database + localStorage
```

**Service Categories**
```
Location: Services section
Grouping: Automatic by category field
Expand/Collapse: Click category name
Buttons: Expand All / Collapse All
State: Persists in localStorage
Animation: Smooth 300ms transitions
```

**Alert System**
```
Modal: Two tabs (Create Alert / My Alerts)
Create: Select service, type, threshold
List: Shows all alerts with delete button
Badge: Count in header (hides when 0)
Updates: Real-time UI refresh
```

### Phase 2 Installation

```bash
npm start
# Then try:
# 1. Click 🌙 to toggle themes
# 2. Click categories to expand/collapse
# 3. Click 🔔 to create alerts
```

---

## PHASE 3: Production Ready - HTTPS/SSL & Webhooks

### What Phase 3 Provides

Phase 3 adds enterprise features for production deployment:

**1. HTTPS/SSL Support**
- Automatic self-signed certificate generation
- Environment variable support for custom certs
- Single-command HTTPS activation
- Backward compatible with HTTP
- Certificate auto-loading on startup
- OpenSSL integration

**2. Service Uptime Tracking**
- Historical data recorded automatically
- Uptime percentage calculated (7/30/90 days)
- Uptime bars visualization (30-day history)
- Uptime card on service display
- Uptime periods: 7-day, 30-day, 90-day
- Auto-cleanup of data older than 90 days
- CSV export for analysis

**3. Webhook Integrations**
- Create webhooks for alert events
- Event types: service_down, service_recovered, response_time_threshold, alert_triggered
- URL validation before saving
- Async webhook delivery (non-blocking)
- Retry logic and timeout handling
- Webhook call logging for debugging
- Test webhook functionality
- Per-user webhook management

### Phase 3 Files Created

```
backend/cert.js ...................... HTTPS/SSL certificate handling
backend/webhooks.js .................. Webhook trigger and sending
frontend/uptime.js ................... Uptime tracking and visualization
```

### Phase 3 Features in Detail

**HTTPS/SSL Setup**
```bash
# Enable HTTPS
ENABLE_HTTPS=true npm start

# Use custom certificates
SSL_CERT=/path/to/cert.pem SSL_KEY=/path/to/key.pem npm start

# Or environment variables
export SSL_CERT=$(cat cert.pem)
export SSL_KEY=$(cat key.pem)
npm start

# Self-signed certificates auto-generated if needed
```

**Uptime Tracking**
```
Automatic:
  - Every 10 seconds, health check is recorded
  - Status (online/offline) + response time logged
  - Database stores unlimited history

Display:
  - Uptime % for 7/30/90 days
  - Visual bar chart (30 checks)
  - Color-coded: Green (online), Red (offline)
  - Tooltip on hover shows timestamp & response time

Analysis:
  - Calculate uptime: (online_checks / total_checks) × 100
  - CSV export for external analysis
  - Cleanup: Auto-delete records > 90 days
```

**Webhook System**
```
Triggers:
  - Service goes offline
  - Service recovers
  - Response time exceeds threshold
  - Alert is triggered

Payload:
  {
    "timestamp": "2026-03-17T10:30:00Z",
    "event": "service_down",
    "data": {
      "serviceName": "Jellyfin",
      "health": { ... },
      "threshold": 5000
    }
  }

Configuration:
  - URL validation (http/https only)
  - Event type filtering
  - Enable/disable webhooks
  - Webhook call logging
  - Debug history available
```

### Phase 3 Installation

```bash
# Enable HTTPS
ENABLE_HTTPS=true npm start

# Access at https://localhost:3000

# For self-signed cert warnings:
# - Add to browser exceptions (development)
# - Use proper cert in production
```

---

## Installation & Deployment

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- macOS/Linux/Windows
- Optional: Docker & Docker Compose

### Local Development Setup

```bash
# 1. Clone or navigate to project
cd /path/to/homelab-dashboard

# 2. Install dependencies
npm install

# 3. Configure (optional)
export NODE_ENV=development
export JWT_SECRET=your-secret-key
export PORT=3000

# 4. Start server
npm start

# 5. Open browser
# http://localhost:3000

# 6. Create account and login
# Username: testuser
# Password: anypassword
```

### Docker Deployment

```bash
# Build and run
docker-compose up --build

# Access at http://localhost:3395

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Clean up volumes (removes database)
docker-compose down -v
```

### Production Deployment

**With HTTPS:**
```bash
# Generate self-signed certificate (or provide your own)
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes

# Start with HTTPS
ENABLE_HTTPS=true NODE_ENV=production PORT=3000 npm start

# Access at https://yourdomain.com:3000
```

**With Reverse Proxy (Recommended):**
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Environment Variables:**
```bash
NODE_ENV=production      # Enable production optimizations
PORT=3000               # Server port
JWT_SECRET=your-secret  # CRITICAL: Change this!
ENABLE_HTTPS=true       # Enable HTTPS
SSL_CERT=cert.pem       # Path to certificate
SSL_KEY=key.pem         # Path to private key
```

### Configuration

**Service Configuration** (`config/services.json`)
```json
[
  {
    "name": "Jellyfin",
    "url": "http://192.168.1.100:8096",
    "icon": "jellyfin.svg",
    "category": "Media",
    "alertThreshold": 4000
  }
]
```

**Categories** (predefined)
- Media
- Infrastructure
- Security
- Storage
- Monitoring
- Custom categories (auto-created)

---

## API Reference

### Complete API Endpoints (20+)

All endpoints return JSON. Authentication marked with 🔐.

#### Authentication (Unprotected)
```
POST /api/auth/register
  Body: { username, email, password }
  Returns: { success, userId, token }

POST /api/auth/login
  Body: { username, password }
  Returns: { success, userId, username, token }

POST /api/auth/logout
  Returns: { success, message }
```

#### User (Protected - 🔐)
```
GET /api/auth/me
  Returns: { id, username, email, preferences }

PUT /api/auth/preferences
  Body: { theme, layout, compact_mode, auto_refresh_interval }
  Returns: { success }
```

#### Services (Public)
```
GET /api/services
  Returns: Array of services with cached health status

GET /api/health
  Returns: { serviceName: { status, responseTime, error } }

POST /api/health-check
  Returns: Fresh health check results

GET /api/services/:serviceName/uptime?days=30
  Returns: { serviceName, uptime, days, totalChecks, history }
```

#### Alerts (Protected - 🔐)
```
GET /api/alerts
  Returns: Array of user's alerts

POST /api/alerts
  Body: { serviceName, alertType, thresholdValue }
  Returns: { success }

DELETE /api/alerts/:alertId
  Returns: { success }
```

#### Webhooks (Protected - 🔐)
```
GET /api/webhooks
  Returns: Array of user's webhooks

POST /api/webhooks
  Body: { url, eventTypes }
  Returns: { success }

DELETE /api/webhooks/:webhookId
  Returns: { success }
```

#### User Customizations (Protected - 🔐)
```
GET /api/user/services
  Returns: Array of service customizations

PUT /api/user/services/:serviceName
  Body: { hidden, starred, displayOrder }
  Returns: { success }
```

---

## Development Guide

### Project Structure

```
homelab-dashboard/
├─ backend/
│  ├─ server.js ................... Main Express app
│  ├─ auth.js ..................... JWT & authentication
│  ├─ db.js ....................... Database operations
│  ├─ cert.js ..................... HTTPS/SSL support
│  ├─ webhooks.js ................. Webhook handling
│  └─ db/
│     ├─ schema.sql ............... Database schema
│     └─ dashboard.db ............. SQLite database (auto-created)
│
├─ frontend/
│  ├─ index.html .................. Main HTML template
│  ├─ app.js ...................... Main UI orchestration
│  ├─ auth.js ..................... Frontend auth management
│  ├─ themes.js ................... Theme system
│  ├─ alerts.js ................... Alert management
│  ├─ uptime.js ................... Uptime tracking
│  ├─ styles.css .................. All styling (900+ lines)
│  └─ [icons].svg ................. Service icons
│
├─ config/
│  └─ services.json ............... Service registry
│
├─ package.json ................... Dependencies
├─ docker-compose.yml ............. Docker configuration
├─ Dockerfile ..................... Container image
└─ COMPLETE_GUIDE.md .............. This file
```

### Adding Features

**New Alert Type:**
1. Add to database alerts table
2. Update frontend modal options
3. Implement logic in webhooks.js

**New System Metric:**
1. Add to getSystemInfo() in server.js
2. Create GET /api/system endpoint
3. Update frontend display

**New Service Category:**
1. Add to config/services.json
2. Frontend auto-groups by category
3. No code changes needed

### Code Conventions

**JavaScript Style:**
```javascript
// Async functions with error handling
async function fetchData() {
  try {
    const response = await fetch('/api/...');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// DOM manipulation
function updateUI(data) {
  const element = document.getElementById('my-element');
  if (element) {
    element.textContent = data;
  }
}
```

**Database Usage:**
```javascript
// Prepared statements (prevent SQL injection)
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(userId);

// Transactions for consistency
const transaction = db.transaction(() => {
  db.prepare('INSERT ...').run(...);
  db.prepare('UPDATE ...').run(...);
});
transaction();
```

---

## Troubleshooting

### Common Issues

**Database errors**
```
Error: database disk image is malformed
→ Delete backend/db/dashboard.db and restart
```

**HTTPS certificate warnings**
```
Certificate self-signed
→ Expected in development
→ Use proper cert in production
→ Add to browser exceptions
```

**Webhooks not triggering**
```
Check:
1. Webhook URL is valid (http/https)
2. Webhook is enabled
3. Alert threshold matches condition
4. Check webhook logs in database
```

**Theme not persisting**
```
Check:
1. User is logged in (DB storage)
2. Or localStorage enabled (public user)
3. Try private/incognito window
```

**Services showing offline**
```
Check:
1. Service URL is correct
2. Service is actually running
3. Network connectivity
4. Firewall rules
5. Timeout is 5 seconds
```

### Performance Tips

**Optimize Database:**
```sql
-- Run periodically to optimize
VACUUM;
ANALYZE;

-- Check index usage
PRAGMA index_list(alerts);
```

**Reduce API Calls:**
```javascript
// Batch requests
Promise.all([
  fetch('/api/services'),
  fetch('/api/system'),
  fetch('/api/alerts')
]);

// Reduce poll frequency
setInterval(fetchData, 30000); // Instead of 10000
```

---

## Summary: All 3 Phases

| Feature | Phase | Status | Impact |
|---------|-------|--------|--------|
| User Authentication | 1 | ✅ Live | Multi-user support |
| SQLite Database | 1 | ✅ Live | Persistent data |
| Service Health Checks | 1 | ✅ Live | Real-time monitoring |
| API Endpoints | 1 | ✅ Live | Backend infrastructure |
| Dark/Light Themes | 2 | ✅ Live | User customization |
| Service Categories | 2 | ✅ Live | Better organization |
| Custom Alerts | 2 | ✅ Live | Notifications |
| Uptime Tracking | 3 | ✅ Live | Historical analytics |
| Webhook Integrations | 3 | ✅ Live | External notifications |
| HTTPS/SSL Support | 3 | ✅ Live | Secure production |

---

## Getting Started Now

### Quick Start (30 seconds)
```bash
npm install && npm start
# Open http://localhost:3000
# Create account → Enjoy!
```

### With Docker
```bash
docker-compose up --build
# Open http://localhost:3395
```

### With HTTPS
```bash
ENABLE_HTTPS=true npm start
# Open https://localhost:3000
```

---

## Next Steps

- **Explore the UI:** Try all features (theme toggle, categories, alerts)
- **Check the Database:** Inspect `backend/db/dashboard.db`
- **Read the Code:** Start with `frontend/app.js`
- **Deploy:** Use Docker or systemd
- **Customize:** Edit `config/services.json`

---

## Support & Questions

**Architecture Questions?** → See Architecture section
**API Questions?** → See API Reference section
**Deployment Questions?** → See Installation section
**Feature Questions?** → Search this document

---

**Thank you for using Homelab Dashboard! 🚀**

All 3 phases complete. System is production-ready.

Deploy with confidence! 💪

