import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getUserQuizAnswersHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { courseId } = req.query;
  const userId = req.userId;

  if (!courseId) {
    return res.status(400).json({ error: '缺少 courseId' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT
         uqa.score,
         ch.type
       FROM
         user_quiz_answers uqa
       JOIN
         chapters ch ON uqa.chapter_id = ch.id
       WHERE
         uqa.user_id = $1 AND uqa.course_id = $2 AND (ch.type = 1 OR ch.type = 2)`,
      [userId, courseId]
    );
    client.release();

    res.status(200).json({ quizAnswers: result.rows });
  } catch (error) {
    console.error('获取用户答题记录时发生错误:', error);
    res.status(500).json({ error: '获取用户答题记录失败', details: (error as Error).message });
  }
}

export default authenticateToken(getUserQuizAnswersHandler);
