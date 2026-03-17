-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User preferences (theme, layout, etc)
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  theme TEXT DEFAULT 'auto',
  layout TEXT DEFAULT 'grid',
  compact_mode BOOLEAN DEFAULT 0,
  auto_refresh_interval INTEGER DEFAULT 10000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- Service health cache (replaces in-memory cache)
CREATE TABLE IF NOT EXISTS services_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  response_time INTEGER,
  error_message TEXT,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_name)
);

-- Service uptime history (for uptime tracking)
CREATE TABLE IF NOT EXISTS uptime_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time INTEGER,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alerts configuration (user's configured alerts)
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  threshold_value INTEGER,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Alert history (triggered alerts log)
CREATE TABLE IF NOT EXISTS alert_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER,
  user_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhooks configuration
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  event_types TEXT NOT NULL,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhook call logs (for debugging)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  payload TEXT NOT NULL,
  status_code INTEGER,
  response TEXT,
  success BOOLEAN DEFAULT 0,
  called_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- Service customizations per user (hidden services, starred, order)
CREATE TABLE IF NOT EXISTS user_service_customizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  hidden BOOLEAN DEFAULT 0,
  starred BOOLEAN DEFAULT 0,
  display_order INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, service_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_cache_name ON services_cache(service_name);
CREATE INDEX IF NOT EXISTS idx_uptime_history_service ON uptime_history(service_name);
CREATE INDEX IF NOT EXISTS idx_uptime_history_checked ON uptime_history(checked_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_user ON alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_customizations_user ON user_service_customizations(user_id);

