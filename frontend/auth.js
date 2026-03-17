// Frontend authentication management
class AuthManager {
  constructor() {
    this.token = this.getStoredToken();
    this.user = null;
    this.listeners = [];
  }

  // Get token from localStorage
  getStoredToken() {
    return localStorage.getItem('auth_token');
  }

  // Store token
  setStoredToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
    this.token = token;
  }

  // Check if authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Get auth header for fetch
  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  // Register user
  async register(username, email, password) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      this.setStoredToken(data.token);
      this.token = data.token;
      this.notifyListeners('authenticated');
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      this.setStoredToken(data.token);
      this.token = data.token;
      this.user = { id: data.userId, username: data.username };
      this.notifyListeners('authenticated');
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getAuthHeader()
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setStoredToken(null);
      this.token = null;
      this.user = null;
      this.notifyListeners('unauthenticated');
    }
  }

  // Get current user
  async getCurrentUser() {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: this.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Failed to get user');
      }

      const user = await response.json();
      this.user = user;
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      this.logout();
      return null;
    }
  }

  // Update preferences
  async updatePreferences(preferences) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  }

  // Subscribe to auth changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify listeners
  notifyListeners(state) {
    this.listeners.forEach(callback => callback(state));
  }
}

// Global auth manager instance
const authManager = new AuthManager();

// Check if user is already authenticated on page load
async function initializeAuth() {
  if (authManager.isAuthenticated()) {
    const user = await authManager.getCurrentUser();
    if (user) {
      console.log('User authenticated:', user.username);
    }
  }
}

// Initialize auth on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
  initializeAuth();
}

