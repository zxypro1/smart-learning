import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addFavoriteHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.userId;

  const { courseId, chapterId, contentSnippet } = req.body;

  if (!courseId || !chapterId || !contentSnippet) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await pool.query(
      'INSERT INTO favorites (user_id, course_id, chapter_id, content_snippet) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, chapter_id, content_snippet) DO NOTHING RETURNING id',
      [userId, courseId, chapterId, contentSnippet]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ message: 'Favorite already exists' });
    }

    res.status(201).json({ message: 'Favorite added', favoriteId: result.rows[0].id });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default authenticateToken(addFavoriteHandler);