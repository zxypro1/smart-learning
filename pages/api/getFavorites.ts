import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getFavoritesHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.userId;

  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favoritesRes = await pool.query(
      `SELECT
        f.id AS favorite_id,
        f.content_snippet,
        f.created_at,
        c.id AS course_id,
        c.name AS course_name,
        ch.id AS chapter_id,
        ch.charpter_title
      FROM favorites f
      JOIN courses c ON f.course_id = c.id
      JOIN chapters ch ON f.chapter_id = ch.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC`,
      [userId]
    );

    res.status(200).json({ favorites: favoritesRes.rows });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default authenticateToken(getFavoritesHandler);