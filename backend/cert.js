// Backend certificate management for HTTPS/SSL
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CERT_DIR = path.join(__dirname, '../certs');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');

// Ensure cert directory exists
function ensureCertDir() {
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }
}

// Check if certificates exist
function certificatesExist() {
  return fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);
}

// Generate self-signed certificate
function generateSelfSignedCert() {
  ensureCertDir();

  if (certificatesExist()) {
    console.log('✅ Certificates already exist');
    return true;
  }

  try {
    console.log('🔐 Generating self-signed certificate...');
    
    // Generate self-signed cert valid for 365 days
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -nodes -subj "/CN=localhost"`, {
      stdio: 'inherit'
    });

    console.log('✅ Self-signed certificate generated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error generating certificate:', error.message);
    return false;
  }
}

// Load certificates from files
function loadCertificates() {
  ensureCertDir();

  if (!certificatesExist()) {
    console.warn('⚠️  Certificates not found. Generating self-signed certificates...');
    if (!generateSelfSignedCert()) {
      throw new Error('Failed to generate certificates');
    }
  }

  try {
    return {
      key: fs.readFileSync(KEY_FILE, 'utf8'),
      cert: fs.readFileSync(CERT_FILE, 'utf8')
    };
  } catch (error) {
    throw new Error(`Failed to load certificates: ${error.message}`);
  }
}

// Load certificates from environment variables
function loadCertificatesFromEnv() {
  const cert = process.env.SSL_CERT;
  const key = process.env.SSL_KEY;

  if (!cert || !key) {
    return null;
  }

  return { cert, key };
}

// Get certificates (environment variables take precedence)
function getCertificates() {
  // Try environment variables first
  const envCerts = loadCertificatesFromEnv();
  if (envCerts) {
    console.log('✅ Using SSL certificates from environment variables');
    return envCerts;
  }

  // Fall back to files
  return loadCertificates();
}

// Check if HTTPS is enabled
function isHttpsEnabled() {
  return process.env.ENABLE_HTTPS === 'true' || process.env.SSL_CERT || process.env.SSL_KEY;
}

module.exports = {
  getCertificates,
  isHttpsEnabled,
  generateSelfSignedCert,
  certificatesExist,
  ensureCertDir
};

