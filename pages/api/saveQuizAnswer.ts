import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function saveQuizAnswerHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { courseId, chapterId, question, answer, score, feedback } = req.body;
  const userId = req.userId;

  if (!courseId || !chapterId || !question || !answer) {
    return res.status(400).json({ error: '缺少必要的参数' });
  }

  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO user_quiz_answers (user_id, course_id, chapter_id, question, answer, score, feedback) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, courseId, chapterId, question, answer, score, feedback]
    );
    client.release();
    res.status(200).json({ message: '答题记录已保存' });
  } catch (error) {
    console.error('保存答题记录时发生错误:', error);
    res.status(500).json({ error: '保存答题记录失败', details: (error as Error).message });
  }
}

export default authenticateToken(saveQuizAnswerHandler);
