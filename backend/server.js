const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const app = express();
const execAsync = promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Load services configuration
function loadServices() {
  try {
    const configPath = path.join(__dirname, '../config/services.json');
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading services:', error);
    return [];
  }
}

// Health check for a single service
async function checkServiceHealth(url) {
  const startTime = Date.now();
  try {
    const response = await Promise.race([
      fetch(url, { method: 'HEAD', timeout: 5000 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    const responseTime = Date.now() - startTime;
    return {
      status: 'online',
      responseTime: responseTime
    };
  } catch (error) {
    return {
      status: 'offline',
      responseTime: null,
      error: error.message
    };
  }
}

// Get CPU usage
function getCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);
  
  return Math.max(0, Math.min(100, usage));
}

// Get memory usage
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usage = (usedMem / totalMem) * 100;
  
  return {
    used: Math.round(usedMem / (1024 * 1024)), // MB
    total: Math.round(totalMem / (1024 * 1024)), // MB
    percentage: Math.round(usage)
  };
}

// Get disk usage
async function getDiskUsage() {
  try {
    const { stdout } = await execAsync('df -h / | tail -1');
    const parts = stdout.trim().split(/\s+/);
    const used = parts[2];
    const total = parts[1];
    const percent = parseInt(parts[4]);
    
    return {
      used: used,
      total: total,
      percentage: percent
    };
  } catch (error) {
    return {
      used: 'N/A',
      total: 'N/A',
      percentage: 0
    };
  }
}

// Get Docker container count
async function getDockerContainers() {
  try {
    const { stdout } = await execAsync('docker ps -q 2>/dev/null | wc -l');
    return parseInt(stdout.trim()) || 0;
  } catch (error) {
    return 0;
  }
}

// Get system info
async function getSystemInfo() {
  const diskUsage = await getDiskUsage();
  const dockerContainers = await getDockerContainers();
  
  return {
    hostname: os.hostname(),
    cpu: getCPUUsage(),
    memory: getMemoryUsage(),
    disk: diskUsage,
    dockerContainers: dockerContainers,
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch()
  };
}

// Store service health
let serviceHealth = {};

// Perform health checks for all services
async function performHealthChecks() {
  const services = loadServices();
  const results = {};
  
  for (const service of services) {
    results[service.name] = await checkServiceHealth(service.url);
  }
  
  serviceHealth = results;
  return results;
}

// Initialize health checks on startup
performHealthChecks();

// Perform health checks every 10 seconds
setInterval(() => {
  performHealthChecks().catch(error => {
    console.error('Health check error:', error);
  });
}, 10000);

// Routes

// Get all services with their health status
app.get('/api/services', (req, res) => {
  const services = loadServices();
  const enrichedServices = services.map(service => ({
    ...service,
    health: serviceHealth[service.name] || { status: 'unknown', responseTime: null }
  }));
  res.json(enrichedServices);
});

// Get system information
app.get('/api/system', async (req, res) => {
  try {
    const systemInfo = await getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get health status of all services
app.get('/api/health', (req, res) => {
  res.json(serviceHealth);
});

// Force health check
app.post('/api/health-check', async (req, res) => {
  try {
    const results = await performHealthChecks();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
});

