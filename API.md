# API Documentation

## Overview

The Homelab Dashboard API provides endpoints for managing services and retrieving system information. All endpoints return JSON responses.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Services

#### GET `/services`

Retrieves all configured services with their current health status.

**Request:**
```bash
curl http://localhost:3000/api/services
```

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
  },
  {
    "name": "Portainer",
    "url": "http://localhost:9000",
    "icon": "portainer.svg",
    "health": {
      "status": "offline",
      "responseTime": null,
      "error": "Timeout"
    }
  }
]
```

**Response Fields:**
- `name` (string): Service name
- `url` (string): Service URL
- `icon` (string): Icon identifier
- `health` (object):
  - `status` (string): "online", "offline", or "unknown"
  - `responseTime` (number|null): Response time in milliseconds
  - `error` (string, optional): Error message if offline

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Server error

---

### System Information

#### GET `/system`

Retrieves current system information including CPU, memory, disk, and Docker stats.

**Request:**
```bash
curl http://localhost:3000/api/system
```

**Response:**
```json
{
  "hostname": "homeserver",
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
  "uptime": 123456789,
  "platform": "linux",
  "arch": "x64"
}
```

**Response Fields:**
- `hostname` (string): Server hostname
- `cpu` (number): CPU usage percentage (0-100)
- `memory` (object):
  - `used` (number): Used memory in MB
  - `total` (number): Total memory in MB
  - `percentage` (number): Used percentage (0-100)
- `disk` (object):
  - `used` (string): Used disk space
  - `total` (string): Total disk space
  - `percentage` (number): Used percentage (0-100)
- `dockerContainers` (number): Number of running Docker containers
- `uptime` (number): System uptime in seconds
- `platform` (string): Operating system (linux, darwin, win32)
- `arch` (string): System architecture (x64, arm64, etc.)

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: System info retrieval failed

---

### Health Status

#### GET `/health`

Returns the current health status of all monitored services from the last check.

**Request:**
```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "Jellyfin": {
    "status": "online",
    "responseTime": 245
  },
  "Filebrowser": {
    "status": "online",
    "responseTime": 128
  },
  "Pi-hole": {
    "status": "offline",
    "responseTime": null,
    "error": "Timeout"
  }
}
```

**Status Codes:**
- `200 OK`: Success

---

#### POST `/health-check`

Forces an immediate health check of all configured services.

**Request:**
```bash
curl -X POST http://localhost:3000/api/health-check
```

**Response:**
```json
{
  "Jellyfin": {
    "status": "online",
    "responseTime": 245
  },
  "Filebrowser": {
    "status": "online",
    "responseTime": 128
  }
}
```

**Status Codes:**
- `200 OK`: Health check completed
- `500 Internal Server Error`: Health check failed

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error description"
}
```

### Common Error Scenarios

**Service Offline:**
```json
{
  "status": "offline",
  "error": "ECONNREFUSED"
}
```

**Timeout:**
```json
{
  "status": "offline",
  "error": "Timeout"
}
```

**Invalid URL:**
```json
{
  "status": "offline",
  "error": "Invalid URL"
}
```

---

## Data Types & Formats

### Status Values

- `"online"`: Service is accessible and responding
- `"offline"`: Service is not responding or unreachable
- `"unknown"`: Service status has not been checked yet

### Response Time

- Measured in milliseconds (ms)
- `null` if service is offline or couldn't be determined

### CPU Usage

- Percentage value (0-100)
- Calculated as average across all CPU cores

### Memory/Disk Usage

- Disk usage returned as human-readable strings (e.g., "50G")
- Memory usage in MB
- Percentages rounded to nearest integer

---

## Rate Limiting

Currently, there is no rate limiting implemented. Consider adding rate limiting for production deployments using middleware like `express-rate-limit`.

---

## Authentication

The API currently has no authentication. For production use, implement authentication through:
- Reverse proxy (Nginx, Apache)
- API key middleware
- JWT tokens
- OAuth2

---

## CORS

CORS is enabled for localhost by default. Modify in `backend/server.js` for different origins:

```javascript
app.use(cors({
    origin: ['http://localhost:3000', 'http://example.com'],
    credentials: true
}));
```

---

## Examples

### JavaScript/Fetch

```javascript
// Get all services
fetch('/api/services')
    .then(res => res.json())
    .then(data => console.log(data));

// Get system info
fetch('/api/system')
    .then(res => res.json())
    .then(data => console.log(data));

// Force health check
fetch('/api/health-check', { method: 'POST' })
    .then(res => res.json())
    .then(data => console.log(data));
```

### cURL

```bash
# Get services with formatted output
curl -s http://localhost:3000/api/services | jq

# Get system info
curl -s http://localhost:3000/api/system | jq

# Health check with verbose output
curl -v -X POST http://localhost:3000/api/health-check
```

### Python

```python
import requests
import json

# Get services
response = requests.get('http://localhost:3000/api/services')
services = response.json()
print(json.dumps(services, indent=2))

# Get system info
response = requests.get('http://localhost:3000/api/system')
system_info = response.json()
print(json.dumps(system_info, indent=2))

# Force health check
response = requests.post('http://localhost:3000/api/health-check')
health = response.json()
print(json.dumps(health, indent=2))
```

### Node.js

```javascript
const http = require('http');

function getJSON(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api${path}`,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);
        req.end();
    });
}

// Usage
getJSON('/services')
    .then(services => console.log(services))
    .catch(err => console.error(err));
```

---

## Webhooks & Integrations

To integrate with other systems, periodically poll the API:

```javascript
// Check service status every 30 seconds
setInterval(async () => {
    const response = await fetch('/api/services');
    const services = await response.json();
    
    services.forEach(service => {
        if (service.health.status === 'offline') {
            // Send notification, alert, etc.
            console.log(`Service ${service.name} is offline!`);
        }
    });
}, 30000);
```

---

## Version

Current API Version: **1.0**

---

## Support

For API questions or issues, please refer to the main README or open an issue on GitHub.

