const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';
const SALT_ROUNDS = 10;

// Generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Hash password
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Error hashing password');
  }
}

// Compare password
async function comparePassword(password, hash) {
  try {
    return bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
}

// Register new user
async function registerUser(username, email, password) {
  // Validate input
  if (!username || !email || !password) {
    throw new Error('Username, email, and password are required');
  }
  
  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  // Check if user exists
  const existingUser = db.getUserByUsername(username) || db.getUserByEmail(email);
  if (existingUser) {
    throw new Error('Username or email already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const userId = db.createUser(username, email, passwordHash);
  
  // Initialize default preferences
  db.updateUserPreferences(userId, {
    theme: 'auto',
    layout: 'grid',
    compact_mode: false,
    auto_refresh_interval: 10000
  });
  
  return { userId, token: generateToken(userId) };
}

// Login user
async function loginUser(username, password) {
  // Validate input
  if (!username || !password) {
    throw new Error('Username and password are required');
  }
  
  // Find user
  const user = db.getUserByUsername(username);
  if (!user) {
    throw new Error('Invalid username or password');
  }
  
  // Check password
  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid username or password');
  }
  
  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    token: generateToken(user.id)
  };
}

// Middleware to verify JWT from cookies or headers
function verifyJWTMiddleware(req, res, next) {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      // Try to get token from cookies
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    // Attach user info to request
    req.userId = decoded.userId;
    req.user = db.getUserById(decoded.userId);
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Optional middleware - doesn't fail if no token
function optionalJWTMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.userId = decoded.userId;
        req.user = db.getUserById(decoded.userId);
      }
    }
  } catch (error) {
    // Silently ignore errors
  }
  
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  registerUser,
  loginUser,
  verifyJWTMiddleware,
  optionalJWTMiddleware,
  JWT_SECRET
};

