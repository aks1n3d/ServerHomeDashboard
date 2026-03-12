# Deployment Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Reverse Proxy Setup](#reverse-proxy-setup)
5. [Monitoring](#monitoring)
6. [Backup & Restore](#backup--restore)

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/homelab-dashboard.git
cd homelab-dashboard

# Make setup script executable
chmod +x setup.sh

# Run setup script
./setup.sh
```

Choose option 1 when prompted.

### Option 2: Manual Docker Compose

```bash
# Edit services configuration
nano config/services.json

# Start services
docker-compose up -d

# View logs
docker-compose logs -f dashboard

# Stop services
docker-compose down
```

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Edit services configuration
nano config/services.json

# Start the server
npm start
```

## Docker Deployment

### Building the Image

```bash
docker build -t homelab-dashboard:latest .
```

### Running a Container

```bash
docker run -d \
  --name homelab-dashboard \
  -p 3395:3000 \
  -v $(pwd)/config:/app/config \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  homelab-dashboard:latest
```

### Environment Variables

```bash
docker run -d \
  --name homelab-dashboard \
  -p 3395:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -v $(pwd)/config:/app/config \
  -v /var/run/docker.sock:/var/run/docker.sock \
  homelab-dashboard:latest
```

### Docker Compose Services

To use Docker Compose with other services:

```yaml
version: '3.8'

services:
  dashboard:
    build: ./homelab-dashboard
    container_name: homelab-dashboard
    ports:
      - "3395:3000"
    volumes:
      - ./homelab-dashboard/config:/app/config
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - homelab

  # Your other services
  jellyfin:
    image: jellyfin/jellyfin:latest
    ports:
      - "8096:8096"
    networks:
      - homelab

networks:
  homelab:
    driver: bridge
```

## Kubernetes Deployment

### Create Namespace

```bash
kubectl create namespace homelab
```

### Create ConfigMap

```bash
kubectl create configmap dashboard-config \
  --from-file=services.json=config/services.json \
  -n homelab
```

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: homelab-dashboard
  namespace: homelab
  labels:
    app: homelab-dashboard
spec:
  replicas: 1
  selector:
    matchLabels:
      app: homelab-dashboard
  template:
    metadata:
      labels:
        app: homelab-dashboard
    spec:
      containers:
      - name: dashboard
        image: homelab-dashboard:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        volumeMounts:
        - name: config
          mountPath: /app/config
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
      volumes:
      - name: config
        configMap:
          name: dashboard-config
---
apiVersion: v1
kind: Service
metadata:
  name: homelab-dashboard
  namespace: homelab
spec:
  selector:
    app: homelab-dashboard
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Deploy to Kubernetes

```bash
# Apply deployment
kubectl apply -f deployment.yaml

# Check status
kubectl get pods -n homelab

# View logs
kubectl logs -f deployment/homelab-dashboard -n homelab

# Port forward for access
kubectl port-forward svc/homelab-dashboard 3395:80 -n homelab
```

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name dashboard.example.com;

    location / {
        proxy_pass http://localhost:3395;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Apache

```apache
<VirtualHost *:80>
    ServerName dashboard.example.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:3395/
    ProxyPassReverse / http://localhost:3395/

    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
</VirtualHost>

a2enmod proxy
a2enmod proxy_http
systemctl restart apache2
```

### Traefik

```yaml
# docker-compose.yml with Traefik
version: '3.8'

services:
  traefik:
    image: traefik:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"

  dashboard:
    image: homelab-dashboard:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`dashboard.example.com`)"
      - "traefik.http.services.dashboard.loadbalancer.server.port=3000"
    volumes:
      - ./config:/app/config
      - /var/run/docker.sock:/var/run/docker.sock
```

## Monitoring

### Docker Stats

```bash
# View container stats
docker stats homelab-dashboard

# View specific container
docker stats homelab-dashboard --no-stream
```

### Logs

```bash
# Docker Compose
docker-compose logs dashboard
docker-compose logs -f dashboard  # Follow logs
docker-compose logs dashboard --tail 100  # Last 100 lines

# Docker
docker logs homelab-dashboard
docker logs -f homelab-dashboard
```

### Health Check

```bash
# Check service health
curl http://localhost:3395/api/health

# Check system info
curl http://localhost:3395/api/system

# Check services
curl http://localhost:3395/api/services
```

## Backup & Restore

### Backup Configuration

```bash
# Backup services configuration
cp config/services.json config/services.json.backup

# Backup entire config directory
tar -czf config-backup.tar.gz config/

# Scheduled backup (cron)
0 2 * * * tar -czf /backup/dashboard-$(date +\%Y\%m\%d).tar.gz -C /path/to/dashboard config/
```

### Restore Configuration

```bash
# Restore from backup
cp config/services.json.backup config/services.json

# Restart container
docker-compose restart dashboard

# Or for Docker
docker restart homelab-dashboard
```

## Security Considerations

### Enable HTTPS with Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3395;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name dashboard.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Authentication (with Nginx auth_request)

Add authentication via a reverse proxy before deploying publicly.

### Network Isolation

```yaml
# docker-compose.yml - Use specific network
services:
  dashboard:
    networks:
      - dashboard-network

networks:
  dashboard-network:
    internal: true  # Only internal communication
```

## Troubleshooting

### Container fails to start

```bash
# Check logs
docker logs homelab-dashboard

# Check image exists
docker images | grep homelab

# Rebuild image
docker-compose build --no-cache
```

### Port already in use

```bash
# Find process using port 3395
lsof -i :3395

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
# ports:
#   - "3400:3000"
```

### Services showing offline

1. Check service URLs in config/services.json
2. Verify services are running
3. Check network connectivity
4. View container logs for errors

### High memory usage

```bash
# Check resource limits
docker stats homelab-dashboard

# Set limits in docker-compose.yml
services:
  dashboard:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

## Performance Tuning

### Reduce Health Check Frequency

Edit `backend/server.js`:
```javascript
// Change from 10000 to 30000 for 30-second checks
setInterval(() => performHealthChecks(), 30000);
```

### Optimize for Low-Resource Environments

```yaml
# docker-compose.yml
services:
  dashboard:
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M
```

## Advanced Deployment

### High Availability

Use multiple instances behind a load balancer:

```yaml
version: '3.8'

services:
  loadbalancer:
    image: nginx:latest
    ports:
      - "3395:80"
    volumes:
      - ./nginx-ha.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - dashboard-1
      - dashboard-2

  dashboard-1:
    image: homelab-dashboard:latest
    volumes:
      - ./config:/app/config
    networks:
      - internal

  dashboard-2:
    image: homelab-dashboard:latest
    volumes:
      - ./config:/app/config
    networks:
      - internal

networks:
  internal:
    internal: true
```

---

For additional support, refer to the main README.md or open an issue on GitHub.

