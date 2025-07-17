import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthenticatedRequest, authenticateToken } from '../../../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function forumPostsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.userId;

  if (req.method === 'POST') {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO forum_posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
        [userId, title, content]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating forum post:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT fp.id, fp.title, fp.content, fp.created_at, fp.is_pinned, u.username FROM forum_posts fp JOIN users u ON fp.user_id = u.id ORDER BY fp.is_pinned DESC, fp.created_at DESC'
      );
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching forum posts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default authenticateToken(forumPostsHandler);
