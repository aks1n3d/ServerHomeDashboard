const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = path.join(__dirname, 'dashboard.db');

// Initialize database
function initializeDatabase() {
  try {
    const db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split and execute statements
    schema.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
      .forEach(stmt => {
        db.exec(stmt);
      });
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Get database instance (singleton)
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

// Query helpers
function getAllUsers() {
  const db = getDatabase();
  return db.prepare('SELECT id, username, email, created_at FROM users').all();
}

function getUserById(userId) {
  const db = getDatabase();
  return db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(userId);
}

function getUserByUsername(username) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserByEmail(email) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function createUser(username, email, passwordHash) {
  const db = getDatabase();
  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(username, email, passwordHash);
    return result.lastInsertRowid;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
}

function getUserPreferences(userId) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
}

function updateUserPreferences(userId, preferences) {
  const db = getDatabase();
  const existing = getUserPreferences(userId);
  
  if (!existing) {
    const stmt = db.prepare(`
      INSERT INTO user_preferences (user_id, theme, layout, compact_mode, auto_refresh_interval)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId, preferences.theme, preferences.layout, preferences.compact_mode, preferences.auto_refresh_interval);
  } else {
    const stmt = db.prepare(`
      UPDATE user_preferences
      SET theme = ?, layout = ?, compact_mode = ?, auto_refresh_interval = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    stmt.run(preferences.theme, preferences.layout, preferences.compact_mode, preferences.auto_refresh_interval, userId);
  }
}

// Service health cache
function getCachedServiceHealth(serviceName) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM services_cache WHERE service_name = ?').get(serviceName);
}

function updateServiceHealth(serviceName, status, responseTime, errorMessage) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO services_cache (service_name, status, response_time, error_message, checked_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(service_name) DO UPDATE SET
      status = excluded.status,
      response_time = excluded.response_time,
      error_message = excluded.error_message,
      checked_at = CURRENT_TIMESTAMP
  `);
  stmt.run(serviceName, status, responseTime, errorMessage);
}

function getAllCachedHealth() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM services_cache').all();
}

// Uptime history
function recordUptimeCheck(serviceName, status, responseTime) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO uptime_history (service_name, status, response_time, checked_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(serviceName, status, responseTime);
}

function getUptimeHistory(serviceName, days = 30) {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM uptime_history
    WHERE service_name = ? AND checked_at > datetime('now', '-' || ? || ' days')
    ORDER BY checked_at DESC
  `).all(serviceName, days);
}

function calculateUptime(serviceName, days = 30) {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_count
    FROM uptime_history
    WHERE service_name = ? AND checked_at > datetime('now', '-' || ? || ' days')
  `).get(serviceName, days);
  
  if (result.total === 0) return 100;
  return Math.round((result.online_count / result.total) * 100);
}

// Alerts
function createAlert(userId, serviceName, alertType, thresholdValue) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO alerts (user_id, service_name, alert_type, threshold_value)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(userId, serviceName, alertType, thresholdValue);
}

function getUserAlerts(userId) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function getAllAlerts() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM alerts WHERE enabled = 1').all();
}

function disableAlert(alertId) {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE alerts SET enabled = 0 WHERE id = ?');
  stmt.run(alertId);
}

function deleteAlert(alertId) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM alerts WHERE id = ?');
  stmt.run(alertId);
}

function logAlertTriggered(alertId, userId, serviceName, alertType, status, message) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO alert_history (alert_id, user_id, service_name, alert_type, status, message, triggered_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(alertId, userId, serviceName, alertType, status, message);
}

// Webhooks
function createWebhook(userId, url, eventTypes) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO webhooks (user_id, url, event_types)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, url, JSON.stringify(eventTypes));
}

function getUserWebhooks(userId) {
  const db = getDatabase();
  const webhooks = db.prepare('SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return webhooks.map(w => ({
    ...w,
    event_types: JSON.parse(w.event_types)
  }));
}

function deleteWebhook(webhookId) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM webhooks WHERE id = ?');
  stmt.run(webhookId);
}

function logWebhookCall(webhookId, url, payload, statusCode, response, success) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO webhook_logs (webhook_id, url, payload, status_code, response, success, called_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(webhookId, url, JSON.stringify(payload), statusCode, response, success ? 1 : 0);
}

// User service customizations
function getUserServiceCustomizations(userId, serviceName) {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM user_service_customizations 
    WHERE user_id = ? AND service_name = ?
  `).get(userId, serviceName);
}

function updateUserServiceCustomization(userId, serviceName, hidden, starred, displayOrder) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO user_service_customizations (user_id, service_name, hidden, starred, display_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, service_name) DO UPDATE SET
      hidden = excluded.hidden,
      starred = excluded.starred,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(userId, serviceName, hidden ? 1 : 0, starred ? 1 : 0, displayOrder);
}

function getUserServices(userId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM user_service_customizations
    WHERE user_id = ?
    ORDER BY display_order ASC
  `).all(userId);
}

// Cleanup old uptime history (keep 90 days)
function cleanupOldUptimeHistory(daysToKeep = 90) {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM uptime_history
    WHERE checked_at < datetime('now', '-' || ? || ' days')
  `);
  stmt.run(daysToKeep);
}

module.exports = {
  initializeDatabase,
  getDatabase,
  // Users
  getAllUsers,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  createUser,
  // Preferences
  getUserPreferences,
  updateUserPreferences,
  // Service health cache
  getCachedServiceHealth,
  updateServiceHealth,
  getAllCachedHealth,
  // Uptime history
  recordUptimeCheck,
  getUptimeHistory,
  calculateUptime,
  // Alerts
  createAlert,
  getUserAlerts,
  getAllAlerts,
  disableAlert,
  deleteAlert,
  logAlertTriggered,
  // Webhooks
  createWebhook,
  getUserWebhooks,
  deleteWebhook,
  logWebhookCall,
  // Service customizations
  getUserServiceCustomizations,
  updateUserServiceCustomization,
  getUserServices,
  // Cleanup
  cleanupOldUptimeHistory
};

