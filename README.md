# Homelab Dashboard 🏠

A modern, self-hosted dashboard for monitoring your homelab services. Multi-user authentication, real-time health checks, uptime tracking, webhooks, and more.

**[Quick Start](#quick-start) • [Deployment](#deployment) • [Documentation](#documentation) • [Features](#features)**

---

## Quick Start

### Local Development
```bash
npm install
npm start
# Open http://localhost:3000
```

### Docker (Recommended)
```bash
docker-compose up --build
# Open http://localhost:3395
```

### Production with HTTPS
```bash
ENABLE_HTTPS=true NODE_ENV=production npm start
# Open https://localhost:3000
```

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide including:
- Docker Compose setup
- Nginx reverse proxy configuration
- HTTPS/SSL with self-signed or custom certificates
- Environment variables
- PM2 process management
- Production security checklist

---

## Features

**Core Functionality**
- 🔐 Multi-user authentication (JWT, 7-day tokens)
- 📊 Real-time service health monitoring (10s interval)
- 📈 Service uptime tracking (7/30/90 days)
- 🎨 Dark/Light theme toggle with Auto mode
- 🏷️ Service categories and grouping
- 🔔 Custom alerts with threshold-based triggers
- 🪝 Webhook integrations for alerts
- 💾 SQLite database (persistent storage)
- 🔒 HTTPS/SSL support (auto-generated certs)
- 📱 Fully responsive design (mobile-friendly)

**Technology**
- Backend: Node.js 18+ • Express.js • SQLite3
- Frontend: Vanilla JS • HTML5 • CSS3 (glassmorphism)
- Database: 9 optimized tables with indexes
- API: 20+ endpoints (REST)

---

## Configuration

### Add Services

Edit `config/services.json`:

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

**Categories**: Media, Infrastructure, Security, Storage, Monitoring, or custom

---

## Documentation

- **[COMPLETE_GUIDE.md](COMPLETE_GUIDE.md)** - Comprehensive reference (all phases, API, development)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment instructions and best practices
- **[API.md](API.md)** - Complete API endpoint reference
- **[AGENTS.md](AGENTS.md)** - Architecture patterns for developers

---

## API Endpoints

**Key Endpoints**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/services` - Services with health status
- `GET /api/services/:name/uptime` - Uptime data
- `POST /api/alerts` - Create alert
- `POST /api/webhooks` - Create webhook
- `GET /api/system` - System metrics

See [API.md](API.md) for complete reference.

---

## Environment Variables

```bash
NODE_ENV=production              # Production mode
PORT=3000                        # Server port (default)
JWT_SECRET=your-secret-key       # JWT signing key
ENABLE_HTTPS=true                # Enable HTTPS/SSL
SSL_CERT=/path/to/cert.pem       # Custom certificate
SSL_KEY=/path/to/key.pem         # Custom key
```

---

## Features Overview

| Feature | Phase | Details |
|---------|-------|---------|
| Authentication | 1 | JWT with 7-day expiry, bcryptjs hashing |
| Database | 1 | SQLite, 9 tables, multi-user support |
| Health Checks | 1 | Every 10s, cached, 5s timeout |
| Themes | 2 | Dark/Light/Auto with CSS variables |
| Categories | 2 | Service grouping, collapsible sections |
| Alerts | 2 | Custom rules, badge counter, database |
| Uptime Tracking | 3 | 7/30/90-day tracking, auto-cleanup |
| Webhooks | 3 | Event-based, JSON payloads, logging |
| HTTPS/SSL | 3 | Auto-cert generation, env vars supported |

---

## Development

Start with these files:
- `backend/server.js` - Express API routes
- `frontend/app.js` - Main UI logic
- `config/services.json` - Service configuration

See [AGENTS.md](AGENTS.md) for architecture patterns.

---

## License

See [LICENSE](LICENSE) file.

---

**Production Ready** ✅ • **Fully Tested** ✅ • **Well Documented** ✅

