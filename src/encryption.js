const crypto = require('crypto');

const GCM_PREFIX = 'gcm:';
const LEGACY_CBC_IV_PATTERN = /^[0-9a-f]{32}:[0-9a-f]+$/i;

class Encryption {
  constructor(encryptionKey) {
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${GCM_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedData) {
    if (encryptedData.startsWith(GCM_PREFIX)) {
      return this.decryptGcm(encryptedData.slice(GCM_PREFIX.length));
    }
    if (LEGACY_CBC_IV_PATTERN.test(encryptedData)) {
      return this.decryptLegacyCbc(encryptedData);
    }
    throw new Error('Invalid encrypted data format');
  }

  decryptGcm(payload) {
    const [ivHex, authTagHex, encrypted] = payload.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  decryptLegacyCbc(encryptedData) {
    const [ivHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  isEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    return value.startsWith(GCM_PREFIX) || LEGACY_CBC_IV_PATTERN.test(value);
  }
}

module.exports = Encryption;
