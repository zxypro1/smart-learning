import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addChapterHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { courseId, charpter, charpter_title, content, type } = req.body;
  const userId = req.userId; // Authenticated user ID

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!courseId || charpter === undefined || !charpter_title || !content || type === undefined) {
    return res.status(400).json({ error: '缺少必要的参数：courseId, charpter, charpter_title, content 或 type' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure the course belongs to the authenticated user
    const courseCheck = await client.query(
      'SELECT id FROM courses WHERE id = $1 AND user_id = $2',
      [courseId, userId]
    );
    if (courseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: '未找到该课程或无权操作' });
    }

    // Update subsequent chapter numbers to make space for the new chapter
    await client.query(
      'UPDATE chapters SET charpter = charpter + 1 WHERE course_id = $1 AND charpter >= $2',
      [courseId, charpter]
    );

    // Insert the new chapter
    await client.query(
      'INSERT INTO chapters (course_id, charpter, charpter_title, content, type, score) VALUES ($1, $2, $3, $4, $5, $6) RETURNING charpter',
      [courseId, charpter, charpter_title, content, type, null] // Initialize score as null
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: '章节添加成功。' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('添加章节时发生错误:', error);
    res.status(500).json({ error: '添加章节失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(addChapterHandler);
