import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getDraftAnswerHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { courseId, chapterId } = req.query;
  const userId = req.userId;

  if (!courseId || !chapterId) {
    return res.status(400).json({ error: '缺少必要的参数' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT draft_answer FROM user_draft_answers WHERE user_id = $1 AND course_id = $2 AND chapter_id = $3',
      [userId, courseId, chapterId]
    );
    client.release();

    if (result.rows.length > 0) {
      res.status(200).json({ draftAnswer: result.rows[0].draft_answer });
    } else {
      res.status(200).json({ draftAnswer: '' });
    }
  } catch (error) {
    console.error('获取草稿答案时发生错误:', error);
    res.status(500).json({ error: '获取草稿答案失败', details: (error as Error).message });
  }
}

export default authenticateToken(getDraftAnswerHandler);
