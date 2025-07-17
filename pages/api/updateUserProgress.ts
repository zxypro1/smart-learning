import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateUserProgressHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { courseId, chapterId } = req.body;
  const userId = req.userId;

  if (!courseId || !chapterId) {
    return res.status(400).json({ error: '缺少 courseId 或 chapterId' });
  }

  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO user_course_progress (user_id, course_id, chapter_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, course_id, chapter_id) DO NOTHING',
      [userId, courseId, chapterId]
    );
    client.release();
    res.status(200).json({ message: '学习进度已更新' });
  } catch (error) {
    console.error('更新学习进度时发生错误:', error);
    res.status(500).json({ error: '更新学习进度失败', details: (error as Error).message });
  }
}

export default authenticateToken(updateUserProgressHandler);
