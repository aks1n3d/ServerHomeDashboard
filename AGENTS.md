# AGENTS.md – Guidance for AI Coding Agents

## Project Overview

**Homelab Dashboard** is a self-hosted homepage/launcher for homelab services. It's a **full-stack Node.js app** with an **Express backend** serving a **vanilla JavaScript frontend** with real-time system monitoring.

**Key Architecture:**
- Backend: Express.js REST API (`backend/server.js`)
- Frontend: SPA with vanilla JS (`frontend/app.js` + `index.html`)
- Config: JSON-based service definitions (`config/services.json`)
- Deployment: Docker Compose with socket binding for Docker stats

## Critical Architecture Patterns

### Backend Structure: API-First with Cached Health Checks

The backend architecture centers on **cached health checks** to avoid overwhelming services with requests:

```javascript
// backend/server.js pattern:
- loadServices() → reads config/services.json (blocking)
- checkServiceHealth(url) → async HEAD request with 5s timeout
- performHealthChecks() → checks all services, caches results in serviceHealth object
- Runs on 10s interval (NOT on every request)
- Endpoints return cached results, allowing forced refresh via POST /api/health-check
```

**Why this matters:** When adding new monitoring features or endpoints, queries must use the cache (`serviceHealth[name]`) rather than calling `checkServiceHealth()` directly on request—heavy operations should run in the interval loop.

### Frontend: Reactive Event Loop Pattern

The frontend uses **interval-based polling** (NOT websockets):

```javascript
// frontend/app.js pattern:
- fetchServices() → GET /api/services (renders immediately)
- fetchSystemInfo() → GET /api/system
- updateDateTime() → updates clock every second
- All wrapped in setInterval() calls (typically 1-10s refresh)
```

**Why this matters:** Performance optimization should preserve polling intervals (don't add too many concurrent fetches). If adding real-time updates, consider batching into existing fetch calls rather than creating new intervals.

### Service Card Rendering: Icon Fallback Chain

The frontend uses a **priority-based icon resolution**:

```javascript
// ICON_MAP lookup → partial string match → "emoji:" prefix → default fallback
// Example: "Jellyfin" → ICON_MAP["jellyfin"] → 🎬
// Example: "MyMonitoring" → checks if contains "monitoring" → 📈
// Example: "emoji:🎯" → extracts emoji → 🎯
```

**Convention:** Keep `ICON_MAP` in `frontend/app.js` synchronized with common homelab services. Icons in `frontend/` are SVG files but many are never used—use emoji mapping instead for new services.

## Workflows & Commands

### Local Development

```bash
npm install                # Install dependencies
npm start                  # Run backend at localhost:3000
npm run dev               # Run with nodemon auto-reload
```

Access frontend at `http://localhost:3000`. Edit `config/services.json` to test different service configurations.

### Docker Development

```bash
docker-compose up --build  # Build and start the container
docker-compose logs -f     # Follow logs
docker-compose down        # Stop and clean up
```

**Docker Compose exposes:**
- Port `3395` → container port `3000`
- Volume: `./config` mounted to `/app/config` (config changes persist)
- Socket: `/var/run/docker.sock` for Docker stats

### Testing Service Configuration

When testing health checks, remember:
- `checkServiceHealth()` uses a **5-second timeout**
- Responses that take >5s will show as "offline" with "Timeout" error
- Health checks happen **every 10 seconds globally**, not per-request
- Test with `POST /api/health-check` to force an immediate check

## Project-Specific Conventions

### Configuration as Law

- **Single source of truth:** `config/services.json`
- Changes take effect on next health check cycle (~10s later)
- No database—reload config on every `loadServices()` call (acceptable performance for small lists)
- Services schema: `{ name, url, icon }` (icon field can be filename or "emoji:icon" prefix)

### System Metrics via Shell Commands

- CPU: Calculated from `os.cpus()` per-core average
- Memory: Uses `os.totalmem() / os.freemem()` from Node.js
- Disk: Uses `df -h /` command (macOS/Linux specific)
- Docker: Uses `docker ps -q | wc -l` command (requires Docker socket)

**When adding metrics:** Prefer Node.js `os` module for portability. Shell commands (`execAsync`) should have try/catch returning fallback values (e.g., `{ used: 'N/A', percentage: 0 }`).

### Frontend Error Handling Pattern

```javascript
// Fetch pattern in frontend/app.js:
try {
  const response = await fetch('/api/...');
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  // process response
} catch (error) {
  console.error('Error message:', error);
  showError('User-friendly message');  // utility function
}
```

## Cross-Component Communication

### Frontend ↔ Backend Flow

1. **Frontend reads config display:**
   - `GET /api/services` → returns all services + cached health status
   - Renders service cards immediately with latest cached health

2. **System metrics:**
   - `GET /api/system` → CPU, memory, disk, Docker count, uptime, hostname
   - Runs on 1-10s intervals in `fetchSystemInfo()`

3. **Health check triggering:**
   - `POST /api/health-check` (optional force refresh)
   - Returns fresh results after ~5s per service

### Service Definition Impact

- Service `name` affects: card display, health cache key, UI label
- Service `url` affects: health check target, link destination, display
- Service `icon` affects: emoji resolution chain, SVG fallback loading

## Key Files & Their Responsibilities

| File | Purpose | Key Functions |
|------|---------|---|
| `backend/server.js` | REST API, health checks, system metrics | `loadServices()`, `checkServiceHealth()`, `getSystemInfo()`, `performHealthChecks()` |
| `frontend/app.js` | UI rendering, polling loops, icons | `fetchServices()`, `renderServices()`, `getServiceIcon()`, `updateDateTime()` |
| `config/services.json` | Service registry | Define all services (name, url, icon) |
| `frontend/index.html` | DOM structure | Elements with IDs like `services-grid`, `hostname`, CPU/memory/disk progress |
| `docker-compose.yml` | Container config | Port mapping (3395→3000), socket mount, config mount |

## Common Modification Patterns

**Adding a new status indicator:**
1. Add metric to `getSystemInfo()` in `backend/server.js`
2. Add `GET /api/system` response field
3. Add display element to `frontend/index.html`
4. Update `fetchSystemInfo()` and `updateSystemInfo()` in `frontend/app.js`

**Adding a new API endpoint:**
1. Create async handler in `backend/server.js`
2. Cache results in module scope if called frequently (like `serviceHealth`)
3. Frontend: Add `fetch()` call + interval trigger + rendering function

**Modifying health check logic:**
- Changes to timeout, retry count, or HEAD vs GET should happen in `checkServiceHealth()`
- All health check results flow through `performHealthChecks()` → `serviceHealth` cache
- Frontend always reads from cache via `GET /api/services`

## Deployment Considerations

- **Docker image:** Node.js 18-alpine (lean, production-ready)
- **Health check:** Pings `GET /api/health` every 30s (Docker HEALTHCHECK)
- **Environment variables:** `NODE_ENV=production`, `PORT=3000`
- **Volume mounts:** Config changes persist; socket mount enables Docker stats

When modifying, ensure changes remain compatible with both local development (`npm start`) and containerized deployment.

## Deployment Architecture

### Deployment Options

**Development:**
```bash
npm start → http://localhost:3000 (HTTP)
```

**Docker (Recommended):**
```bash
docker-compose up --build → http://localhost:3395
- Volumes: config/ mounted for persistence
- Socket: /var/run/docker.sock for container stats
- Network: Isolated, public port 3395
```

**Production with HTTPS:**
```bash
ENABLE_HTTPS=true npm start → https://localhost:3000
- Self-signed certs auto-generated in certs/
- Or use SSL_CERT/SSL_KEY env vars for custom certs
```

**Production with Nginx (Recommended):**
```
nginx (reverse proxy on :443 HTTPS)
↓ (proxy_pass to :3000 HTTP)
app (Node.js on :3000)
↓
SQLite database (backend/db/dashboard.db)
```

### Environment Variables

```bash
NODE_ENV=production              # Enable production optimizations
PORT=3000                        # Server port
JWT_SECRET=your-secret-key       # CRITICAL: Change in production!
ENABLE_HTTPS=true                # Enable HTTPS/SSL
SSL_CERT=/path/to/cert.pem       # Custom certificate
SSL_KEY=/path/to/key.pem         # Custom key
```

### Security Checklist

- ✅ Change JWT_SECRET to strong random value
- ✅ Use HTTPS in production (via nginx or ENABLE_HTTPS)
- ✅ Set NODE_ENV=production
- ✅ Enable Docker container resource limits
- ✅ Use firewall to restrict access
- ✅ Keep dependencies updated (npm audit fix)
- ✅ Configure rate limiting (recommended: nginx-module-vts)
- ✅ Monitor logs for suspicious activity

### Database

**Location:**
- Local: `backend/db/dashboard.db` (auto-created)
- Docker: In container volume (persists across restarts)

**Cleanup:**
```bash
# Auto-cleanup: Uptime history kept for 90 days
# Manual reset: Delete dashboard.db and restart
```
