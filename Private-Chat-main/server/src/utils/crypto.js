'use strict';

const crypto = require('crypto');

function getEncryptionKey() {
  const base64 = process.env.DATA_ENCRYPTION_KEY;
  if (!base64) {
    console.warn('DATA_ENCRYPTION_KEY not set. Using insecure ephemeral key for encryption. Set a 32-byte base64 key in production.');
    return crypto.createHash('sha256').update('insecure-default-key').digest();
  }
  const buf = Buffer.from(base64, 'base64');
  if (buf.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes in base64 (AES-256-GCM)');
  }
  return buf;
}

function encryptJson(obj) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptJson(payload) {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

module.exports = { encryptJson, decryptJson };




