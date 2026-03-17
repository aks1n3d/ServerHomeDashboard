// Theme Management

async function handleThemeToggle() {
    themeManager.cycleTheme();
    updateThemeButton();
}

function updateThemeButton() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = themeManager.getThemeIcon();
        btn.title = `Theme: ${themeManager.getThemeLabel()}`;
    }
}

// Alerts Management

let alertsModalOpen = false;
let currentAlertsTab = 'create';

function openAlertsModal() {
    document.getElementById('alerts-modal').classList.remove('hidden');
    alertsModalOpen = true;
    populateAlertServices();
    loadAlertsList();
}

function closeAlertsModal() {
    document.getElementById('alerts-modal').classList.add('hidden');
    alertsModalOpen = false;
}

function switchAlertsTab(tab) {
    currentAlertsTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tab === 'create') {
        document.getElementById('create-alert-tab').classList.add('active');
    } else {
        document.getElementById('list-alerts-tab').classList.add('active');
        loadAlertsList();
    }
}

function populateAlertServices() {
    const serviceSelect = document.getElementById('alert-service');
    if (!serviceSelect || !currentServices) return;
    
    serviceSelect.innerHTML = '<option value="">Select a service...</option>';
    
    currentServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service.name;
        option.textContent = service.name;
        serviceSelect.appendChild(option);
    });
}

async function handleCreateAlert(event) {
    event.preventDefault();
    
    const serviceName = document.getElementById('alert-service').value;
    const alertType = document.getElementById('alert-type').value;
    const thresholdValue = parseInt(document.getElementById('alert-threshold').value) || 5000;
    
    if (!serviceName) {
        showError('Please select a service');
        return;
    }
    
    try {
        await alertsManager.createAlert(serviceName, alertType, thresholdValue);
        showError('Alert created successfully!');
        document.getElementById('create-alert-form').reset();
        switchAlertsTab('list');
        updateAlertBadge();
    } catch (error) {
        showError(error.message);
    }
}

async function loadAlertsList() {
    const alertsList = document.getElementById('alerts-list');
    if (!alertsList) return;
    
    await alertsManager.fetchAlerts();
    
    if (alertsManager.alerts.length === 0) {
        alertsList.innerHTML = '<p class="no-alerts">No alerts configured. Create one to get started!</p>';
        return;
    }
    
    alertsList.innerHTML = alertsManager.alerts.map(alert => `
        <div class="alert-item">
            <div class="alert-info">
                <div class="alert-service">${escapeHtml(alert.service_name)}</div>
                <div class="alert-type">${alert.alert_type === 'response_time' ? '⚡ Response Time' : '🔴 Offline'}</div>
                ${alert.threshold_value ? `<div class="alert-threshold">Threshold: ${alert.threshold_value}ms</div>` : ''}
            </div>
            <button class="btn-delete-alert" onclick="handleDeleteAlert(${alert.id})">Delete</button>
        </div>
    `).join('');
}

async function handleDeleteAlert(alertId) {
    if (!confirm('Delete this alert?')) return;
    
    try {
        await alertsManager.deleteAlert(alertId);
        showError('Alert deleted!');
        loadAlertsList();
        updateAlertBadge();
    } catch (error) {
        showError(error.message);
    }
}

function updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    const count = alertsManager.getAlertCount();
    
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Service Grouping

let categoryStates = {}; // Track expanded/collapsed state

function groupServicesByCategory(services) {
    const grouped = {};
    
    services.forEach(service => {
        const category = service.category || 'Uncategorized';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(service);
    });
    
    return grouped;
}

function renderServicesByCategory(services) {
    const container = document.getElementById('services-container');
    if (!container) return;
    
    const grouped = groupServicesByCategory(services);
    const categories = Object.keys(grouped).sort();
    
    if (categories.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary);">No services configured</p>';
        return;
    }
    
    container.innerHTML = categories.map(category => {
        const isExpanded = categoryStates[category] !== false; // Default to expanded
        const categoryServices = grouped[category];
        
        return `
            <div class="category-section">
                <div class="category-header" onclick="toggleCategory('${escapeHtml(category)}')">
                    <span class="category-toggle">${isExpanded ? '▼' : '▶'}</span>
                    <h3 class="category-title">${escapeHtml(category)}</h3>
                    <span class="category-count">${categoryServices.length}</span>
                </div>
                <div class="category-content ${isExpanded ? '' : 'collapsed'}">
                    <div class="services-grid">
                        ${categoryServices.map(service => renderServiceCard(service)).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleCategory(category) {
    categoryStates[category] = !categoryStates[category];
    
    // Save to localStorage
    localStorage.setItem('categoryStates', JSON.stringify(categoryStates));
    
    // Re-render services
    renderServicesByCategory(currentServices);
}

function expandAllCategories() {
    const categories = Object.keys(groupServicesByCategory(currentServices || []));
    categories.forEach(cat => {
        categoryStates[cat] = true;
    });
    localStorage.setItem('categoryStates', JSON.stringify(categoryStates));
    renderServicesByCategory(currentServices);
}

function collapseAllCategories() {
    const categories = Object.keys(groupServicesByCategory(currentServices || []));
    categories.forEach(cat => {
        categoryStates[cat] = false;
    });
    localStorage.setItem('categoryStates', JSON.stringify(categoryStates));
    renderServicesByCategory(currentServices);
}

function renderServiceCard(service) {
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
}

// Store current services for grouping
let currentServices = [];

// Authentication UI Management

let authMode = 'login'; // 'login' or 'register'

function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('auth-form').reset();
    authMode = 'login';
    updateAuthForm();
}

function toggleAuthMode(event) {
    event.preventDefault();
    authMode = authMode === 'login' ? 'register' : 'login';
    updateAuthForm();
}

function updateAuthForm() {
    const titleEl = document.getElementById('auth-title');
    const emailInput = document.getElementById('auth-email');
    const submitBtn = document.querySelector('#auth-form button[type="submit"]');
    const toggleLink = document.querySelector('.auth-toggle a');
    
    if (authMode === 'register') {
        titleEl.textContent = 'Register';
        emailInput.style.display = 'block';
        emailInput.required = true;
        submitBtn.textContent = 'Register';
        toggleLink.textContent = 'Already have an account? Login';
    } else {
        titleEl.textContent = 'Login';
        emailInput.style.display = 'none';
        emailInput.required = false;
        submitBtn.textContent = 'Login';
        toggleLink.textContent = "Don't have an account? Register";
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    
    const username = document.getElementById('auth-username').value;
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    try {
        if (authMode === 'register') {
            await authManager.register(username, email, password);
            showError('Registration successful!');
        } else {
            await authManager.login(username, password);
            showError('Login successful!');
        }
        
        closeAuthModal();
        updateAuthUI();
    } catch (error) {
        showError(error.message);
    }
}

async function handleLogout() {
    await authManager.logout();
    updateAuthUI();
    closeAuthModal();
}

function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userInfo = document.getElementById('user-info');
    const userDisplay = document.getElementById('user-display');
    
    if (authManager.isAuthenticated() && authManager.user) {
        authBtn.style.display = 'none';
        userInfo.classList.remove('hidden');
        userDisplay.textContent = `${authManager.user.username} 👤`;
    } else {
        authBtn.style.display = 'block';
        userInfo.classList.add('hidden');
    }
}

// Subscribe to auth changes
authManager.subscribe((state) => {
    updateAuthUI();
    if (state === 'authenticated') {
        alertsManager.fetchAlerts().then(() => {
            updateAlertBadge();
        });
    } else {
        updateAlertBadge();
    }
});

// Subscribe to alerts changes
alertsManager.subscribe((event) => {
    if (event === 'alerts-updated' || event === 'alert-triggered') {
        updateAlertBadge();
    }
});
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
        currentServices = services;
        renderServicesByCategory(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        showError('Failed to load services');
    }
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
    // Load category states from localStorage
    const savedStates = localStorage.getItem('categoryStates');
    if (savedStates) {
        try {
            categoryStates = JSON.parse(savedStates);
        } catch (error) {
            console.error('Error loading category states:', error);
        }
    }
    
    // Update auth UI and theme button
    updateAuthUI();
    updateThemeButton();
    
    // Update date/time immediately and every second
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Fetch services and system info immediately
    fetchServices();
    fetchSystemInfo();
    
    // Load alerts if authenticated
    if (authManager.isAuthenticated()) {
        alertsManager.fetchAlerts().then(() => {
            updateAlertBadge();
        });
    }
    
    // Refresh every 10 seconds
    setInterval(() => {
        fetchServices();
        fetchSystemInfo();
        if (authManager.isAuthenticated()) {
            alertsManager.fetchAlerts();
        }
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

