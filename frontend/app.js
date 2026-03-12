// Service icons mapping
const ICON_MAP = {
    'jellyfin': '🎬',
    'filebrowser': '📁',
    'pi-hole': '🛡️',
    'portainer': '🐳',
    'nextcloud': '☁️',
    'uptime-kuma': '📊',
    'home': '🏠',
    'media': '🎥',
    'storage': '💾',
    'security': '🔒',
    'monitoring': '📈',
    'docker': '🐳',
    'network': '🌐',
    'terminal': '⌨️',
    'backup': '💾',
    'default': '⚙️'
};

// Get icon for service
function getServiceIcon(serviceName) {
    const lowerName = serviceName.toLowerCase();
    
    // Check for direct match
    if (ICON_MAP[lowerName]) {
        return ICON_MAP[lowerName];
    }
    
    // Check for partial matches
    for (const [key, icon] of Object.entries(ICON_MAP)) {
        if (lowerName.includes(key)) {
            return icon;
        }
    }
    
    // Check if icon is provided in service config
    if (serviceName.includes('emoji:')) {
        return serviceName.split('emoji:')[1];
    }
    
    return ICON_MAP['default'];
}

// Format response time
function formatResponseTime(ms) {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// Update datetime
function updateDateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    
    const datetimeElement = document.getElementById('datetime');
    if (datetimeElement) {
        datetimeElement.textContent = `${dateString} ${timeString}`;
    }
}

// Fetch services and update UI
async function fetchServices() {
    try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const services = await response.json();
        renderServices(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        showError('Failed to load services');
    }
}

// Render services grid
function renderServices(services) {
    const grid = document.getElementById('services-grid');
    
    if (!services || services.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary);">No services configured</p>';
        return;
    }
    
    grid.innerHTML = services.map(service => {
        const isOnline = service.health?.status === 'online';
        const statusClass = service.health?.status || 'unknown';
        const statusText = service.health?.status || 'Unknown';
        const responseTime = service.health?.responseTime;
        
        return `
            <div class="service-card" data-service="${service.name}">
                <div class="service-icon">${getServiceIcon(service.name)}</div>
                <div class="service-header">
                    <div class="service-name">${escapeHtml(service.name)}</div>
                    <div class="service-status ${statusClass}">
                        <span class="status-indicator"></span>
                        ${statusText}
                    </div>
                </div>
                <div class="service-url">${escapeHtml(service.url)}</div>
                ${responseTime ? `<div class="service-response-time">⚡ ${formatResponseTime(responseTime)}</div>` : ''}
                <div class="service-actions">
                    <a href="${escapeHtml(service.url)}" target="_blank" rel="noopener noreferrer" class="service-open-btn">
                        Open
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Fetch system information
async function fetchSystemInfo() {
    try {
        const response = await fetch('/api/system');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const systemInfo = await response.json();
        updateSystemInfo(systemInfo);
    } catch (error) {
        console.error('Error fetching system info:', error);
    }
}

// Update system information display
function updateSystemInfo(systemInfo) {
    // Update hostname
    const hostnameElement = document.getElementById('hostname');
    if (hostnameElement) {
        hostnameElement.textContent = systemInfo.hostname || 'Server';
    }
    
    // Update CPU
    updateProgressBar('cpu-progress', systemInfo.cpu);
    updateValue('cpu-value', `${systemInfo.cpu}%`);
    updateValue('cpu-badge', `${systemInfo.cpu}`);
    
    // Update Memory
    const memoryPercent = systemInfo.memory.percentage;
    updateProgressBar('memory-progress', memoryPercent);
    updateValue('memory-value', `${memoryPercent}% (${systemInfo.memory.used}/${systemInfo.memory.total} MB)`);
    updateValue('ram-badge', `${memoryPercent}`);
    
    // Update Disk
    const diskPercent = systemInfo.disk.percentage;
    updateProgressBar('disk-progress', diskPercent);
    updateValue('disk-value', `${diskPercent}% (${systemInfo.disk.used} / ${systemInfo.disk.total})`);
    updateValue('disk-badge', `${diskPercent}`);
    
    // Update Docker
    updateValue('docker-value', systemInfo.dockerContainers);
}

// Update progress bar width
function updateProgressBar(id, percent) {
    const element = document.getElementById(id);
    if (element) {
        element.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
}

// Update element text content
function updateValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Show error message
function showError(message) {
    console.error(message);
    // You can enhance this with a toast notification if desired
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize dashboard
function init() {
    // Update date/time immediately and every second
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Fetch services and system info immediately
    fetchServices();
    fetchSystemInfo();
    
    // Refresh every 10 seconds
    setInterval(() => {
        fetchServices();
        fetchSystemInfo();
    }, 10000);
}

// Update last updated time
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = timeString;
    }
}

// Start the dashboard
document.addEventListener('DOMContentLoaded', () => {
    init();
    updateLastUpdated();
    setInterval(updateLastUpdated, 5000);
});

