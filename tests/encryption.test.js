const crypto = require('crypto');
const Encryption = require('../src/encryption');

const KEY = crypto.randomBytes(32).toString('hex');

describe('Encryption', () => {
  let encryption;

  beforeAll(() => {
    encryption = new Encryption(KEY);
  });

  test('encrypts and decrypts with AES-256-GCM', () => {
    const plaintext = 'sensitive@example.com';
    const encrypted = encryption.encrypt(plaintext);
    expect(encrypted.startsWith('gcm:')).toBe(true);
    expect(encryption.decrypt(encrypted)).toBe(plaintext);
  });

  test('decrypts legacy AES-256-CBC ciphertext', () => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(KEY, 'hex'), iv);
    let encrypted = cipher.update('legacy data', 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const legacy = `${iv.toString('hex')}:${encrypted}`;

    expect(encryption.decrypt(legacy)).toBe('legacy data');
  });

  test('detects tampered GCM ciphertext', () => {
    const encrypted = encryption.encrypt('tamper test');
    const parts = encrypted.slice(4).split(':');
    parts[1] = parts[1].replace(/0/g, '1');
    const tampered = `gcm:${parts.join(':')}`;
    expect(() => encryption.decrypt(tampered)).toThrow();
  });

  test('isEncrypted identifies GCM and legacy formats', () => {
    const gcm = encryption.encrypt('test');
    expect(encryption.isEncrypted(gcm)).toBe(true);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(KEY, 'hex'), iv);
    let enc = cipher.update('x', 'utf8', 'hex');
    enc += cipher.final('hex');
    expect(encryption.isEncrypted(`${iv.toString('hex')}:${enc}`)).toBe(true);
    expect(encryption.isEncrypted('plain text')).toBe(false);
  });
});
