import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { decrypt } from '../../utils/encryption';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Use a strong secret in production

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password, honeypot } = req.body;

  if (honeypot) {
    // Bot detected
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, username, password_hash, ai_model, ai_api_key, avatar_url, ai_provider FROM users WHERE username = $1', [username]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Decrypt ai_api_key before sending to frontend
    let decryptedAiApiKey = null;
    if (user.ai_api_key) {
      try {
        decryptedAiApiKey = decrypt(user.ai_api_key);
      } catch (error) {
        console.error(`Failed to decrypt API key for user ${user.username}. It might be an unencrypted legacy key.`);
        // If decryption fails, assume it's a raw key.
        decryptedAiApiKey = user.ai_api_key;
      }
    }

    const token = jwt.sign({ userId: user.id, username: user.username, ai_model: user.ai_model, ai_api_key: decryptedAiApiKey, avatar_url: user.avatar_url, ai_provider: user.ai_provider }, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({ message: 'Login successful', token, aiModel: user.ai_model, aiApiKey: decryptedAiApiKey, avatarUrl: user.avatar_url, aiProvider: user.ai_provider });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
}
