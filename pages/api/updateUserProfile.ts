import { encrypt } from '../../utils/encryption';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { NextApiResponse } from 'next';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateUserProfileHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ai_model, ai_api_key, avatar_url, ai_provider } = req.body;
  const userId = req.userId; // From authenticatedToken middleware

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const client = await pool.connect();

    // Encrypt ai_api_key before saving
    const encryptedAiApiKey = ai_api_key ? encrypt(ai_api_key) : null;

    const result = await client.query(
      'UPDATE users SET ai_model = $1, ai_api_key = $2, avatar_url = $3, ai_provider = $4 WHERE id = $5 RETURNING id, username, ai_model, ai_api_key, avatar_url, ai_provider',
      [ai_model, encryptedAiApiKey, avatar_url, ai_provider, userId]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    res.status(200).json({ message: 'User profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
}

export default authenticateToken(updateUserProfileHandler);
