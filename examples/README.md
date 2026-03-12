# Examples Directory

This directory contains example configurations and setups for the Homelab Dashboard.

## Contents

### Service Configurations

#### `services-minimal.json`
Minimal configuration with just 2 services. Good for getting started.

**Use when:** Testing the dashboard locally or starting a new setup.

#### `services-full.json`
Complete configuration with 10+ common homelab services.

**Use when:** Setting up a production homelab with multiple services.

#### `services-docker-network.json`
Configuration for services running on Docker network instead of host ports.

**Use when:** All services are in the same Docker Compose stack using container names.

### Docker Compose Examples

#### `docker-compose-full.yml`
Complete Docker Compose stack with the dashboard and common homelab services:
- Jellyfin (Media Server)
- Portainer (Docker Management)
- Nextcloud (File Sync)
- PostgreSQL (Database)
- Pi-hole (DNS/Ad Blocking)
- Uptime Kuma (Monitoring)
- Home Assistant (Smart Home)

**Use when:** You want to spin up an entire homelab stack with one command.

**Usage:**
```bash
cp docker-compose-full.yml docker-compose.yml
docker-compose up -d
```

## Quick Start with Examples

### Option 1: Minimal Setup
```bash
# Copy minimal services config
cp examples/services-minimal.json config/services.json

# Start dashboard
docker-compose up -d

# Access at http://localhost:3395
```

### Option 2: Full Stack
```bash
# Use full docker-compose example
cp examples/docker-compose-full.yml docker-compose.yml

# Copy full services config
cp examples/services-full.json config/services.json

# Start entire stack
docker-compose up -d

# Access dashboard at http://localhost:3395
```

### Option 3: Docker Network Setup
```bash
# Use docker network services config
cp examples/services-docker-network.json config/services.json

# Adjust container names in services.json if needed

# Start with docker-compose
docker-compose up -d
```

## Customizing Examples

### Modifying Service URLs

Edit your copied config file to match your environment:

```bash
nano config/services.json
```

Common adjustments:
- Replace `192.168.1.100` with your server IP
- Adjust port numbers to your setup
- Change service names to match your labels

### Scaling Services

To add more services to a config:

```json
{
  "name": "My Service",
  "url": "http://192.168.1.100:8000",
  "icon": "emoji:🚀"
}
```

### Changing Service Order

Services are displayed in the order they appear in the JSON file. Reorder as desired:

```json
[
  { "name": "Most Important", ... },
  { "name": "Second", ... },
  { "name": "Third", ... }
]
```

## Port Reference

Services in `docker-compose-full.yml` use these ports:

| Service | Port(s) |
|---------|---------|
| Dashboard | 3395 |
| Jellyfin | 8096 |
| Portainer | 9000, 8000 |
| Nextcloud | 8080 |
| Pi-hole | 53, 8081 |
| Uptime Kuma | 3001 |
| Home Assistant | 8123 |

**Important:** Adjust ports if you have conflicts on your system.

## Database Credentials

The `docker-compose-full.yml` includes default credentials:

- **Nextcloud Admin**: admin / admin123
- **Pi-hole Password**: admin123
- **PostgreSQL User**: nextcloud
- **PostgreSQL Password**: nextcloud123

⚠️ **Change these in production!**

## Storage Volumes

Created volumes:
- `jellyfin-data` - Media server configuration
- `portainer-data` - Portainer data
- `nextcloud-data` - Nextcloud files
- `postgres-data` - Database storage
- `pihole-data` - Pi-hole configuration
- `uptime-kuma-data` - Monitoring data
- `home-assistant-data` - Home Assistant configuration

All stored in `/var/lib/docker/volumes/`

## Troubleshooting Examples

### Port Already in Use

If a port is already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "3400:3000"  # Changed from 3395
```

### Services Not Connecting

For Docker network setup, ensure container names match:

```json
{
  "name": "Jellyfin",
  "url": "http://jellyfin:8096",  // Container name, not localhost
  "icon": "jellyfin.svg"
}
```

### Stopping Everything

```bash
docker-compose down

# Also remove volumes
docker-compose down -v

# Remove all stopped containers
docker system prune
```

## Next Steps

1. Choose an example configuration
2. Copy it to your config directory
3. Modify for your environment
4. Deploy the dashboard
5. Add more services as needed

See the main README.md for more information about the dashboard.

