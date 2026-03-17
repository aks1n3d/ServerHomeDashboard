const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const cookieParser = require('cookie-parser');
const https = require('https');
const http = require('http');

const app = express();
const execAsync = promisify(exec);

// Database and Auth modules
const db = require('./db');
const auth = require('./auth');
const cert = require('./cert');
const webhooks = require('./webhooks');

// Initialize database
db.initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend')));

// Optional JWT middleware for tracking user (doesn't fail if no token)
app.use(auth.optionalJWTMiddleware);

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
    await Promise.race([
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

// Store service health in database instead of memory
async function performHealthChecks() {
  const services = loadServices();
  
  for (const service of services) {
    const result = await checkServiceHealth(service.url);
    
    // Store in database
    db.updateServiceHealth(
      service.name,
      result.status,
      result.responseTime,
      result.error || null
    );
    
    // Record uptime history
    db.recordUptimeCheck(
      service.name,
      result.status,
      result.responseTime
    );
    
    // Check alert thresholds and trigger webhooks
    webhooks.checkAlertThresholds(service.name, result);
  }
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

// Authentication endpoints

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await auth.registerUser(username, email, password);
    
    // Set secure httpOnly cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      success: true,
      userId: result.userId,
      token: result.token,
      message: 'Registration successful'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await auth.loginUser(username, password);
    
    // Set secure httpOnly cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      success: true,
      userId: result.userId,
      username: result.username,
      token: result.token,
      message: 'Login successful'
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Logout user
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logout successful' });
});

// Get current user info
app.get('/api/auth/me', auth.verifyJWTMiddleware, (req, res) => {
  try {
    const user = db.getUserById(req.userId);
    const preferences = db.getUserPreferences(req.userId);
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      preferences: preferences
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user preferences
app.put('/api/auth/preferences', auth.verifyJWTMiddleware, (req, res) => {
  try {
    const {theme, layout, compact_mode, auto_refresh_interval} = req.body;

    db.updateUserPreferences(req.userId, {
      theme: theme || 'auto',
      layout: layout || 'grid',
      compact_mode: compact_mode || false,
      auto_refresh_interval: auto_refresh_interval || 10000
    });

    res.json({success: true, message: 'Preferences updated'});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
// Service endpoints

// Get all services with their health status
  app.get('/api/services', (req, res) => {
    const services = loadServices();
    const enrichedServices = services.map(service => {
      const cachedHealth = db.getCachedServiceHealth(service.name);
      return {
        ...service,
        health: cachedHealth ? {
          status: cachedHealth.status,
          responseTime: cachedHealth.response_time,
          error: cachedHealth.error_message
        } : {status: 'unknown', responseTime: null}
      };
    });
    res.json(enrichedServices);
  });

// Get system information
  app.get('/api/system', async (req, res) => {
    try {
      const systemInfo = await getSystemInfo();
      res.json(systemInfo);
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Get health status of all services
  app.get('/api/health', (req, res) => {
    const cachedHealthList = db.getAllCachedHealth();
    const serviceHealth = {};

    cachedHealthList.forEach(item => {
      serviceHealth[item.service_name] = {
        status: item.status,
        responseTime: item.response_time,
        error: item.error_message
      };
    });

    res.json(serviceHealth);
  });

// Force health check
  app.post('/api/health-check', async (req, res) => {
    try {
      await performHealthChecks();
      const cachedHealthList = db.getAllCachedHealth();
      const results = {};

      cachedHealthList.forEach(item => {
        results[item.service_name] = {
          status: item.status,
          responseTime: item.response_time,
          error: item.error_message
        };
      });

      res.json(results);
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Get service uptime
  app.get('/api/services/:serviceName/uptime', (req, res) => {
    try {
      const {serviceName} = req.params;
      const days = parseInt(req.query.days) || 30;

      const uptime = db.calculateUptime(serviceName, days);
      const history = db.getUptimeHistory(serviceName, days);

      res.json({
        serviceName,
        uptime,
        days,
        totalChecks: history.length,
        history: history.slice(0, 100) // Return last 100 checks
      });
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// User service customizations (requires auth)
  app.get('/api/user/services', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const customizations = db.getUserServices(req.userId);
      res.json(customizations);
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Update service customization (hide, star, reorder)
  app.put('/api/user/services/:serviceName', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const {serviceName} = req.params;
      const {hidden, starred, displayOrder} = req.body;

      db.updateUserServiceCustomization(
          req.userId,
          serviceName,
          hidden || false,
          starred || false,
          displayOrder || 0
      );

      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Get user alerts
  app.get('/api/alerts', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const alerts = db.getUserAlerts(req.userId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Create alert
  app.post('/api/alerts', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const {serviceName, alertType, thresholdValue} = req.body;

      if (!serviceName || !alertType) {
        return res.status(400).json({error: 'Missing required fields'});
      }

      db.createAlert(req.userId, serviceName, alertType, thresholdValue);
      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Delete alert
  app.delete('/api/alerts/:alertId', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const {alertId} = req.params;
      db.deleteAlert(alertId);
      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Get user webhooks
  app.get('/api/webhooks', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const webhooks = db.getUserWebhooks(req.userId);
      res.json(webhooks);
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Create webhook
  app.post('/api/webhooks', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const {url, eventTypes} = req.body;

      if (!url || !eventTypes) {
        return res.status(400).json({error: 'Missing required fields'});
      }

      // Validate webhook URL
      if (!webhooks.isValidWebhookUrl(url)) {
        return res.status(400).json({error: 'Invalid webhook URL'});
      }

      db.createWebhook(req.userId, url, eventTypes);
      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Delete webhook
  app.delete('/api/webhooks/:webhookId', auth.verifyJWTMiddleware, (req, res) => {
    try {
      const {webhookId} = req.params;
      db.deleteWebhook(webhookId);
      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: error.message});
    }
  });

// Serve index.html for all other routes (SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });

// Error handling
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({error: 'Internal server error'});
  });

// Start server
  const PORT = process.env.PORT || 3395;
  let server;

  try {
    if (cert.isHttpsEnabled()) {
      // Start HTTPS server
      console.log('🔐 HTTPS is enabled');
      const certificates = cert.getCertificates();
      server = https.createServer(certificates, app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🔒 Secure Dashboard running on https://localhost:${PORT}`);
      });
    } else {
      // Start HTTP server
      server = http.createServer(app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Dashboard server running on http://localhost:${PORT}`);
        console.log(`Access at http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('❌ Error starting server:', error.message);
    process.exit(1);
  }

// Cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

