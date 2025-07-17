import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getPublicCourseDetailHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: '缺少课程id' });
  }

  const client = await pool.connect();
  try {
    // Query course details, ensuring it's a public course
    const courseResult = await client.query(
      'SELECT c.id, c.name, c.description, c.tags, u.username AS author_name FROM courses c JOIN users u ON c.user_id = u.id WHERE c.id = $1 AND c.is_public = TRUE',
      [id]
    );
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: '未找到该公共课程或无权访问' });
    }
    const course = courseResult.rows[0];

    // Query chapters for the public course
    const chaptersResult = await client.query(
      'SELECT charpter, charpter_title, content, type FROM chapters WHERE course_id = $1 ORDER BY charpter',
      [id]
    );
    res.status(200).json({ course, chapters: chaptersResult.rows });
  } catch (error) {
    console.error('获取公共课程详情失败:', error);
    res.status(500).json({ error: '获取公共课程详情失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(getPublicCourseDetailHandler);
