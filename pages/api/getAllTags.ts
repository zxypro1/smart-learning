import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getAllTagsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  const userId = req.userId; // Get userId from authenticated request

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const client = await pool.connect();
  try {
    // Fetch all unique tags from the courses table for the authenticated user
    const result = await client.query(
      `SELECT DISTINCT tags FROM courses WHERE user_id = $1`,
      [userId]
    );

    let allTags: string[] = [];
    result.rows.forEach((row: any) => {
      if (row.tags) {
        // Assuming tags are stored as a JSON array string in the database
        try {
          const courseTags = row.tags; // Already an array from PostgreSQL
          if (Array.isArray(courseTags)) {
            allTags = allTags.concat(courseTags);
          }
        } catch (e) {
          console.error("Error processing tags:", row.tags, e);
        }
      }
    });

    // Remove duplicates and sort
    const uniqueTags = Array.from(new Set(allTags)).sort();

    res.status(200).json({ tags: uniqueTags });
  } catch (error) {
    console.error('获取所有标签时发生错误:', error);
    res.status(500).json({ error: '获取所有标签失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(getAllTagsHandler);
