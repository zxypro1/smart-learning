import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function removeFavoriteHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.userId;

  const { favoriteId } = req.body;

  if (!favoriteId) {
    return res.status(400).json({ error: 'Missing favoriteId' });
  }

  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await pool.query(
      'DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id',
      [favoriteId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Favorite not found or not authorized' });
    }

    res.status(200).json({ message: 'Favorite removed' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default authenticateToken(removeFavoriteHandler);