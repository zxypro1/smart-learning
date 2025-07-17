import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth'; // Adjust path as needed

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getCourseDetailHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  const { id } = req.query;
  const userId = req.userId; // Get userId from authenticated request

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!id) {
    return res.status(400).json({ error: '缺少课程id' });
  }

  const client = await pool.connect();
  try {
    // 查询课程名，并确保课程属于当前用户
    const courseResult = await client.query('SELECT id, name, description, tags FROM courses WHERE id = $1 AND user_id = $2', [id, userId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: '未找到该课程或无权访问' });
    }
    const course = courseResult.rows[0];
    // 查询章节
    const chaptersResult = await client.query(
      'SELECT id, charpter, charpter_title, content, type FROM chapters WHERE course_id = $1 ORDER BY charpter ASC',
      [id]
    );
    // 查询用户在该课程的最新学习进度
    const progressResult = await client.query(
      'SELECT chapter_id FROM user_course_progress WHERE user_id = $1 AND course_id = $2 ORDER BY completed_at DESC LIMIT 1',
      [userId, id]
    );
    const lastCompletedChapterId = progressResult.rows.length > 0 ? progressResult.rows[0].chapter_id : null;

    res.status(200).json({ course, chapters: chaptersResult.rows, lastCompletedChapterId });
  } catch (error) {
    res.status(500).json({ error: '获取课程详情失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(getCourseDetailHandler); 