import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
    
    // Check if user already exists
    const userExists = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password_hash]
    );
    client.release();

    const user = result.rows[0];
    res.status(201).json({ message: 'User registered successfully', user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
}
