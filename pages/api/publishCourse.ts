import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function publishCourseHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { courseId, isPublic } = req.body;
  const userId = req.userId; // Authenticated user ID

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!courseId || typeof isPublic !== 'boolean') {
    return res.status(400).json({ error: '缺少必要的参数：courseId 或 isPublic' });
  }

  const client = await pool.connect();
  try {
    // Ensure the course belongs to the authenticated user before publishing
    const result = await client.query(
      'UPDATE courses SET is_public = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
      [isPublic, courseId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: '未找到该课程或无权操作' });
    }

    res.status(200).json({ success: true, message: `课程已${isPublic ? '发布' : '取消发布'}。` });
  } catch (error) {
    console.error('发布课程时发生错误:', error);
    res.status(500).json({ error: '发布课程失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(publishCourseHandler);
