import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getPublicCoursesHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  const { tags } = req.query;
  const client = await pool.connect();
  let tagFilter = '';
  let queryParams: (string | string[])[] = [];

  if (tags) {
    const tagArray = (tags as string).split(',').map(tag => tag.trim());
    if (tagArray.length > 0) {
      tagFilter = ` AND c.tags && $1::text[]`;
      queryParams = [tagArray];
    }
  }

  try {
    const result = await client.query(
      `SELECT
        c.id,
        c.name,
        c.description,
        c.tags,
        c.copy_count,
        u.username AS author_name
      FROM
        courses c
      JOIN
        users u ON c.user_id = u.id
      WHERE
        c.is_public = TRUE${tagFilter}
      ORDER BY
        c.id`,
      queryParams
    );
    res.status(200).json({ courses: result.rows });
  } catch (error) {
    console.error('获取公共课程时发生错误:', error);
    res.status(500).json({ error: '获取公共课程失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(getPublicCoursesHandler);
