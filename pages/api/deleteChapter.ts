import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function deleteChapterHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { courseId, charpter } = req.body;
  const userId = req.userId; // Authenticated user ID

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!courseId || charpter === undefined) {
    return res.status(400).json({ error: '缺少必要的参数：courseId 或 charpter' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure the course belongs to the authenticated user before deleting
    const courseCheck = await client.query(
      'SELECT id FROM courses WHERE id = $1 AND user_id = $2',
      [courseId, userId]
    );
    if (courseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: '未找到该课程或无权操作' });
    }

    // Delete the chapter
    const result = await client.query(
      'DELETE FROM chapters WHERE course_id = $1 AND charpter = $2 RETURNING charpter',
      [courseId, charpter]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '未找到该章节或删除失败' });
    }

    // Update subsequent chapter numbers to fill the gap
    await client.query(
      'UPDATE chapters SET charpter = charpter - 1 WHERE course_id = $1 AND charpter > $2',
      [courseId, charpter]
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: '章节删除成功。' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('删除章节时发生错误:', error);
    res.status(500).json({ error: '删除章节失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(deleteChapterHandler);
