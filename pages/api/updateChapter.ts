import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateChapterHandler(req: AuthenticatedRequest, res: NextApiResponse) {
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
    // Ensure the course belongs to the authenticated user before updating
    const courseCheck = await client.query(
      'SELECT id FROM courses WHERE id = $1 AND user_id = $2',
      [courseId, userId]
    );
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: '未找到该课程或无权操作' });
    }

    const result = await client.query(
      'UPDATE chapters SET charpter_title = $1, content = $2, type = $3 WHERE course_id = $4 AND charpter = $5 RETURNING charpter',
      [charpter_title, content, type, courseId, charpter]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '未找到该章节或更新失败' });
    }

    res.status(200).json({ success: true, message: '章节信息更新成功。' });
  } catch (error) {
    console.error('更新章节信息时发生错误:', error);
    res.status(500).json({ error: '更新章节信息失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(updateChapterHandler);
