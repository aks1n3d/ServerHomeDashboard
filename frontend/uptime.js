// Frontend uptime tracking and visualization
class UptimeTracker {
  constructor() {
    this.uptimeData = {};
    this.selectedService = null;
  }

  // Fetch uptime data for a service
  async fetchUptime(serviceName, days = 30) {
    try {
      const response = await fetch(`/api/services/${encodeURIComponent(serviceName)}/uptime?days=${days}`, {
        headers: authManager.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.uptimeData[serviceName] = data;
      return data;
    } catch (error) {
      console.error('Error fetching uptime:', error);
      throw error;
    }
  }

  // Get uptime percentage for service
  getUptimePercentage(serviceName, days = 30) {
    const data = this.uptimeData[serviceName];
    if (!data) return null;
    return data.uptime;
  }

  // Get uptime status badge color
  getUptimeColor(uptime) {
    if (uptime >= 99.9) return '#10b981'; // Green - Excellent
    if (uptime >= 99.0) return '#3b82f6'; // Blue - Good
    if (uptime >= 95.0) return '#f59e0b'; // Amber - Fair
    return '#ef4444'; // Red - Poor
  }

  // Get uptime status text
  getUptimeStatus(uptime) {
    if (uptime >= 99.9) return 'Excellent';
    if (uptime >= 99.0) return 'Good';
    if (uptime >= 95.0) return 'Fair';
    return 'Poor';
  }

  // Calculate uptime for different periods
  calculateUptimePeriods(serviceName) {
    const periods = {};

    for (const days of [7, 30, 90]) {
      const history = this.getUptimeHistory(serviceName, days);
      if (history && history.length > 0) {
        const onlineCount = history.filter(h => h.status === 'online').length;
        const percentage = (onlineCount / history.length) * 100;
        periods[`${days}d`] = parseFloat(percentage.toFixed(2));
      }
    }

    return periods;
  }

  // Get history for a service
  getUptimeHistory(serviceName, days = 30) {
    const data = this.uptimeData[serviceName];
    if (!data || !data.history) return [];
    return data.history.slice(0, days);
  }

  // Create simple bar chart for uptime history
  createUplineChart(serviceName, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = this.uptimeData[serviceName];
    if (!data) {
      container.innerHTML = '<p>No uptime data available</p>';
      return;
    }

    const history = data.history.slice(-30).reverse(); // Last 30 checks
    const maxWidth = 100 / Math.max(history.length, 1);

    const html = `
      <div class="uptime-chart">
        <div class="uptime-bars">
          ${history.map((check, idx) => {
            const isOnline = check.status === 'online';
            const color = isOnline ? 'var(--success-color)' : 'var(--error-color)';
            const time = new Date(check.checked_at).toLocaleTimeString();
            
            return `<div 
              class="uptime-bar" 
              style="width: ${maxWidth}%; background: ${color}; margin: 1px;"
              title="${time}: ${check.status} (${check.response_time || 'N/A'}ms)"
            ></div>`;
          }).join('')}
        </div>
        <div class="uptime-legend">
          <span class="uptime-legend-item">
            <span class="legend-color" style="background: var(--success-color);"></span>
            Online
          </span>
          <span class="uptime-legend-item">
            <span class="legend-color" style="background: var(--error-color);"></span>
            Offline
          </span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Create uptime card for services grid
  createUptimeCard(serviceName) {
    const data = this.uptimeData[serviceName];
    if (!data) return '';

    const uptime = data.uptime;
    const color = this.getUptimeColor(uptime);
    const status = this.getUptimeStatus(uptime);

    return `
      <div class="uptime-card">
        <div class="uptime-percentage" style="color: ${color};">
          ${uptime.toFixed(2)}%
        </div>
        <div class="uptime-status">${status}</div>
        <div class="uptime-period">${data.days}-day uptime</div>
      </div>
    `;
  }

  // Export uptime data as CSV
  exportUptimeCSV(serviceName) {
    const data = this.uptimeData[serviceName];
    if (!data) return;

    const headers = ['Timestamp', 'Status', 'Response Time (ms)'];
    const rows = data.history.map(h => [
      h.checked_at,
      h.status,
      h.response_time || 'N/A'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceName}-uptime.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Global uptime tracker instance
const uptimeTracker = new UptimeTracker();

