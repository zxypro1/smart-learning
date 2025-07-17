import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthenticatedRequest, authenticateToken } from '../../../../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function forumPostDetailHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query; // This is the post ID

  if (!id) {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch the post details
      const postResult = await pool.query(
        'SELECT fp.id, fp.title, fp.content, fp.created_at, u.username FROM forum_posts fp JOIN users u ON fp.user_id = u.id WHERE fp.id = $1',
        [id]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      const post = postResult.rows[0];

      // Fetch comments for the post
      const commentsResult = await pool.query(
        'SELECT fc.id, fc.content, fc.created_at, u.username FROM forum_comments fc JOIN users u ON fc.user_id = u.id WHERE fc.post_id = $1 ORDER BY fc.created_at ASC',
        [id]
      );
      post.comments = commentsResult.rows;

      res.status(200).json(post);
    } catch (error) {
      console.error('Error fetching forum post details:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default authenticateToken(forumPostDetailHandler);
