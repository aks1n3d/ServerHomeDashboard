// Frontend alerts management
class AlertsManager {
  constructor() {
    this.alerts = [];
    this.alertHistory = [];
    this.listeners = [];
  }

  // Fetch user's alerts from API
  async fetchAlerts() {
    if (!authManager.isAuthenticated()) {
      this.alerts = [];
      return [];
    }

    try {
      const response = await fetch('/api/alerts', {
        headers: authManager.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.alerts = await response.json();
      this.notifyListeners('alerts-updated');
      return this.alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  // Create new alert
  async createAlert(serviceName, alertType, thresholdValue) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Must be authenticated to create alerts');
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeader()
        },
        body: JSON.stringify({
          serviceName,
          alertType,
          thresholdValue
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create alert');
      }

      await this.fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  // Delete alert
  async deleteAlert(alertId) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Must be authenticated to delete alerts');
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: authManager.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Failed to delete alert');
      }

      await this.fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }

  // Check if service should trigger an alert
  checkServiceAlert(serviceName, health, alertConfig) {
    if (!alertConfig) return false;

    const { alertType, threshold_value } = alertConfig;

    switch (alertType) {
      case 'response_time':
        return health.responseTime && health.responseTime > threshold_value;

      case 'offline':
        return health.status === 'offline';

      case 'recovery':
        // This would need state tracking across checks
        return false;

      default:
        return false;
    }
  }

  // Get alert count
  getAlertCount() {
    return this.alerts.length;
  }

  // Get alerts for a specific service
  getServiceAlerts(serviceName) {
    return this.alerts.filter(a => a.service_name === serviceName);
  }

  // Subscribe to alert changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify listeners
  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  // Log alert triggered
  logAlertTriggered(alertId, serviceName, alertType, status) {
    this.alertHistory.unshift({
      id: alertId,
      serviceName,
      alertType,
      status,
      timestamp: new Date()
    });

    // Keep only last 100 alerts in memory
    if (this.alertHistory.length > 100) {
      this.alertHistory.pop();
    }

    this.notifyListeners('alert-triggered');
  }

  // Get recent alerts (from memory)
  getRecentAlerts(limit = 10) {
    return this.alertHistory.slice(0, limit);
  }
}

// Global alerts manager instance
const alertsManager = new AlertsManager();

// Load alerts when user logs in
authManager.subscribe((state) => {
  if (state === 'authenticated') {
    alertsManager.fetchAlerts();
  } else {
    alertsManager.alerts = [];
  }
});

