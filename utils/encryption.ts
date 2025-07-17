import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const ivLength = 16; // For AES, this is 16 bytes
const tagLength = 16; // GCM authentication tag length

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) { // 32 bytes in hex is 64 chars
  console.error('Encryption key is not set or has incorrect length. Please set ENCRYPTION_KEY environment variable (32 bytes hex).');
  process.exit(1);
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + encrypted + tag.toString('hex');
}

export function decrypt(encryptedText: string): string {
  const iv = Buffer.from(encryptedText.slice(0, ivLength * 2), 'hex');
  const encrypted = encryptedText.slice(ivLength * 2, -tagLength * 2);
  const tag = Buffer.from(encryptedText.slice(-tagLength * 2), 'hex');

  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
