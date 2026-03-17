// Backend webhook management and trigger system
const db = require('./db');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

// Webhook event types
const WEBHOOK_EVENTS = {
  SERVICE_DOWN: 'service_down',
  SERVICE_RECOVERED: 'service_recovered',
  RESPONSE_TIME_THRESHOLD: 'response_time_threshold',
  ALERT_TRIGGERED: 'alert_triggered'
};

// Trigger webhook for an event
async function triggerWebhook(userId, event, payload) {
  try {
    const webhooks = db.getUserWebhooks(userId);
    
    if (!webhooks || webhooks.length === 0) {
      return;
    }

    // Filter webhooks that are active and subscribe to this event
    const relevantWebhooks = webhooks.filter(w => 
      w.active && w.event_types && w.event_types.includes(event)
    );

    if (relevantWebhooks.length === 0) {
      return;
    }

    // Send to all relevant webhooks
    for (const webhook of relevantWebhooks) {
      sendWebhookRequest(webhook, event, payload);
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

// Send webhook request (async, don't wait for response)
async function sendWebhookRequest(webhook, event, payload) {
  try {
    const webhookPayload = {
      timestamp: new Date().toISOString(),
      event: event,
      data: payload
    };

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Homelab-Dashboard/1.0'
      },
      body: JSON.stringify(webhookPayload),
      timeout: 10000
    });

    const status = response.status;
    const responseText = await response.text();
    const success = status >= 200 && status < 300;

    // Log webhook call
    db.logWebhookCall(
      webhook.id,
      webhook.url,
      webhookPayload,
      status,
      responseText.substring(0, 500),
      success
    );

    if (!success) {
      console.warn(`Webhook request failed: ${webhook.url} (Status: ${status})`);
    }
  } catch (error) {
    console.error('Error sending webhook:', error);

    // Log failed webhook call
    db.logWebhookCall(
      webhook.id,
      webhook.url,
      payload,
      null,
      error.message.substring(0, 500),
      false
    );
  }
}

// Validate webhook URL
function isValidWebhookUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

// Check alert thresholds and trigger webhooks if needed
function checkAlertThresholds(serviceName, health) {
  try {
    // Get all alerts for this service
    const allAlerts = db.getAllAlerts();
    const serviceAlerts = allAlerts.filter(a => a.service_name === serviceName && a.enabled);

    for (const alert of serviceAlerts) {
      let shouldTrigger = false;
      let eventType = null;

      if (alert.alert_type === 'response_time' && health.responseTime) {
        if (health.responseTime > alert.threshold_value) {
          shouldTrigger = true;
          eventType = WEBHOOK_EVENTS.RESPONSE_TIME_THRESHOLD;
        }
      } else if (alert.alert_type === 'offline') {
        if (health.status === 'offline') {
          shouldTrigger = true;
          eventType = WEBHOOK_EVENTS.SERVICE_DOWN;
        }
      }

      if (shouldTrigger && eventType) {
        triggerWebhook(alert.user_id, eventType, {
          serviceName,
          alertId: alert.id,
          health,
          threshold: alert.threshold_value
        });

        // Log alert
        db.logAlertTriggered(
          alert.id,
          alert.user_id,
          serviceName,
          alert.alert_type,
          'triggered',
          `Threshold exceeded: ${health.responseTime || 'offline'}`
        );
      }
    }
  } catch (error) {
    console.error('Error checking alert thresholds:', error);
  }
}

// Get all alerts (helper for checking thresholds)
function getAllAlerts() {
  // This will be added to db.js
  const db_module = require('./db');
  // Query all alerts from database
  const database = db_module.getDatabase();
  return database.prepare('SELECT * FROM alerts WHERE enabled = 1').all();
}

module.exports = {
  triggerWebhook,
  sendWebhookRequest,
  isValidWebhookUrl,
  checkAlertThresholds,
  WEBHOOK_EVENTS
};

