import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthenticatedRequest, authenticateToken } from '../../../../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addCommentHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query; // This is the post ID
  const userId = req.userId;

  if (!id) {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  if (req.method === 'POST') {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO forum_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, post_id, user_id, content, created_at, (SELECT username FROM users WHERE id = $2) as username',
        [id, userId, content]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default authenticateToken(addCommentHandler);
