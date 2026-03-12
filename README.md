# Homelab Dashboard 🏠

A modern, self-hosted homepage dashboard for your homelab server. Built with Node.js, Express, and vanilla JavaScript with a beautiful glassmorphism UI.

![Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Development](#development) • [Docker](#docker)

## Features

✨ **Modern UI**
- Dark theme with glassmorphism design
- Smooth animations and transitions
- Responsive layout (mobile, tablet, desktop)
- Real-time status updates

🚀 **Service Management**
- Grid layout of service cards
- Customizable icons and URLs
- Service health status indicators
- One-click quick-open buttons
- Response time tracking

💻 **System Monitoring**
- CPU usage monitoring
- RAM usage tracking
- Disk space information
- Docker container count
- Automatic refresh every 10 seconds

🔧 **Easy Configuration**
- Simple JSON-based service configuration
- No database required
- Add/remove services by editing `config/services.json`
- Environment-based settings

🐳 **Docker Ready**
- Pre-built Docker image
- Docker Compose for easy deployment
- Access to host Docker socket for container stats
- Single command deployment

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js + Express.js
- **Containerization**: Docker & Docker Compose
- **System Monitoring**: Native Node.js `os` module

## Installation

### Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- Git

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/yourusername/homelab-dashboard.git
cd homelab-dashboard

# Edit services configuration
nano config/services.json

# Start with Docker Compose
docker-compose up -d

# Access the dashboard
# Open browser and navigate to: http://localhost:3395
```

### Local Development

```bash
# Install dependencies
npm install

# Edit services configuration
nano config/services.json

# Start the development server
npm start

# Access the dashboard
# Open browser and navigate to: http://localhost:3000
```

## Configuration

### Services Configuration

Edit `config/services.json` to add or remove services:

```json
[
  {
    "name": "Jellyfin",
    "url": "http://192.168.1.100:8096",
    "icon": "jellyfin.svg"
  },
  {
    "name": "Portainer",
    "url": "http://192.168.1.100:9000",
    "icon": "portainer.svg"
  },
  {
    "name": "Pi-hole",
    "url": "http://192.168.1.100:80",
    "icon": "pihole.svg"
  }
]
```

### Environment Variables

Set environment variables in `docker-compose.yml`:

- `PORT`: Dashboard port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Service Icons

Services use emoji icons automatically based on the service name. You can customize by:

1. **Auto-detection**: Service names like "Jellyfin", "Portainer", etc. are automatically mapped to relevant emojis
2. **Custom mapping**: Edit the `ICON_MAP` in `frontend/app.js`

Supported auto-detected services:
- jellyfin 🎬
- filebrowser 📁
- pi-hole 🛡️
- portainer 🐳
- nextcloud ☁️
- uptime-kuma 📊

## Development

### Project Structure

```
homelab-dashboard/
├── frontend/
│   ├── index.html          # Main HTML
│   ├── styles.css          # Styling (glassmorphism)
│   └── app.js              # Frontend logic
├── backend/
│   └── server.js           # Express server
├── config/
│   └── services.json       # Service configuration
├── Dockerfile              # Container image
├── docker-compose.yml      # Docker Compose config
├── package.json            # Dependencies
└── README.md               # Documentation
```

### Backend API Endpoints

#### `GET /api/services`
Returns all configured services with their health status.

**Response:**
```json
[
  {
    "name": "Jellyfin",
    "url": "http://localhost:8096",
    "icon": "jellyfin.svg",
    "health": {
      "status": "online",
      "responseTime": 245
    }
  }
]
```

#### `GET /api/system`
Returns system information including CPU, RAM, disk, and Docker stats.

**Response:**
```json
{
  "hostname": "my-server",
  "cpu": 35,
  "memory": {
    "used": 2048,
    "total": 8192,
    "percentage": 25
  },
  "disk": {
    "used": "50G",
    "total": "500G",
    "percentage": 10
  },
  "dockerContainers": 5,
  "uptime": 123456,
  "platform": "linux",
  "arch": "x64"
}
```

#### `GET /api/health`
Returns current health status of all services.

#### `POST /api/health-check`
Forces an immediate health check of all services.

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm start

# The app will be available at http://localhost:3000
```

### Building Docker Image

```bash
# Build the image
docker build -t homelab-dashboard:latest .

# Run the container
docker run -p 3395:3000 \
  -v $(pwd)/config:/app/config \
  -v /var/run/docker.sock:/var/run/docker.sock \
  homelab-dashboard:latest
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f dashboard

# Stop services
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d
```

### Docker Compose Features

- **Port Mapping**: `3395:3000` - Accessible on port 3395
- **Volume Mounts**:
  - `./config:/app/config` - Service configuration
  - `/var/run/docker.sock:/var/run/docker.sock` - Docker stats
- **Auto-restart**: Service restarts on failure
- **Health Check**: Built-in health check endpoint

### Network Modes

The default compose file uses a bridge network. For services on the host machine, uncomment the `network_mode: host` line in `docker-compose.yml`:

```yaml
# docker-compose.yml
services:
  dashboard:
    network_mode: host
```

## Customization

### Styling

Edit `frontend/styles.css` to customize colors and styles:

```css
:root {
    --primary-color: #0f172a;
    --accent-color: #06b6d4;
    --text-primary: #f1f5f9;
    /* ... more variables */
}
```

### Icons

Modify the `ICON_MAP` in `frontend/app.js` to add custom icons:

```javascript
const ICON_MAP = {
    'jellyfin': '🎬',
    'custom-service': '📱',
    // Add your custom services
};
```

### Health Check Interval

Change the health check interval in `backend/server.js`:

```javascript
// Currently: 10000ms (10 seconds)
setInterval(() => {
    performHealthChecks().catch(error => {
        console.error('Health check error:', error);
    });
}, 10000); // Change this value
```

### Frontend Refresh Rate

Change the frontend refresh rate in `frontend/app.js`:

```javascript
// Currently: 10000ms (10 seconds)
setInterval(() => {
    fetchServices();
    fetchSystemInfo();
}, 10000); // Change this value
```

## Troubleshooting

### Services showing as offline

1. **Check service URLs**: Ensure URLs in `config/services.json` are correct
2. **Network connectivity**: Verify services are accessible from the container
3. **Firewall**: Check firewall rules allow connections
4. **Container network**: For host services, use `network_mode: host` in compose file

### CPU/Memory showing as 0%

This is normal behavior when using the `os` module in certain environments. It's a limitation that can be worked around with system-level tools.

### Docker stats not working

Ensure Docker socket is mounted:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### Port already in use

Change the port in `docker-compose.yml`:
```yaml
ports:
  - "3400:3000"  # Change 3400 to your desired port
```

## Performance

- **Frontend**: Lightweight vanilla JavaScript, no frameworks
- **Backend**: Efficient Node.js with minimal dependencies
- **Network**: Only 10-second refresh cycles
- **CPU**: Minimal overhead for health checks
- **Memory**: ~50-100MB typical usage in container

## Security Considerations

- ✅ HTTPS ready (can be added with reverse proxy)
- ✅ CORS enabled for localhost
- ✅ XSS protection via HTML escaping
- ⚠️ No authentication (add reverse proxy for protection)
- ⚠️ No validation on service URLs (add whitelist if needed)

## Future Enhancements

- [ ] Authentication & user management
- [ ] HTTPS/SSL support
- [ ] Database persistence
- [ ] Service grouping/categories
- [ ] Custom alerts/notifications
- [ ] Dark/Light theme toggle
- [ ] Service uptime tracking
- [ ] Webhook integrations

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review Docker logs: `docker-compose logs dashboard`

## Acknowledgments

- Inspired by [Homarr](https://homarr.io/), [Homepage](https://gethomepage.dev/), and [Dashy](https://dashy.to/)
- Built with ❤️ for homelab enthusiasts

---

**Happy homelabing!** 🚀

