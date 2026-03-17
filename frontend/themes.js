// Frontend theme management
class ThemeManager {
  constructor() {
    this.currentTheme = 'dark';
    this.listeners = [];
    this.loadTheme();
  }

  // Load theme from preferences or localStorage
  async loadTheme() {
    try {
      // If authenticated, get theme from user preferences
      if (authManager.isAuthenticated()) {
        const user = await authManager.getCurrentUser();
        if (user && user.preferences) {
          this.currentTheme = user.preferences.theme || 'auto';
        }
      } else {
        // Fall back to localStorage for public users
        this.currentTheme = localStorage.getItem('theme') || 'auto';
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      this.currentTheme = localStorage.getItem('theme') || 'auto';
    }

    // Apply theme
    this.applyTheme(this.currentTheme);
  }

  // Get effective theme (resolve 'auto' to 'light' or 'dark')
  getEffectiveTheme(theme = this.currentTheme) {
    if (theme === 'auto') {
      // Check OS preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  // Apply theme to document
  applyTheme(theme) {
    const effectiveTheme = this.getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    this.currentTheme = theme;
    this.notifyListeners(theme);
  }

  // Toggle between themes
  cycleTheme() {
    const themes = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  // Set specific theme
  async setTheme(theme) {
    this.applyTheme(theme);

    // Save to localStorage
    localStorage.setItem('theme', theme);

    // If authenticated, save to database
    if (authManager.isAuthenticated()) {
      try {
        await authManager.updatePreferences({ theme });
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  }

  // Get theme icon for button
  getThemeIcon(theme = this.currentTheme) {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
        return '🔄';
      default:
        return '🌙';
    }
  }

  // Get theme label
  getThemeLabel(theme = this.currentTheme) {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto';
      default:
        return 'Auto';
    }
  }

  // Subscribe to theme changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify listeners of theme change
  notifyListeners(theme) {
    this.listeners.forEach(callback => callback(theme));
  }

  // Listen for OS theme preference changes
  watchOSPreference() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
}

// Global theme manager instance
const themeManager = new ThemeManager();

// Watch OS preference changes
themeManager.watchOSPreference();

// Initialize theme on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => themeManager.loadTheme());
} else {
  themeManager.loadTheme();
}

