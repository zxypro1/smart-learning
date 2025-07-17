import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function saveDraftAnswerHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { courseId, chapterId, draftAnswer } = req.body;
  const userId = req.userId;

  if (!courseId || !chapterId || draftAnswer === undefined) {
    return res.status(400).json({ error: '缺少必要的参数' });
  }

  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO user_draft_answers (user_id, course_id, chapter_id, draft_answer) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, course_id, chapter_id) DO UPDATE SET draft_answer = EXCLUDED.draft_answer, last_saved_at = NOW()',
      [userId, courseId, chapterId, draftAnswer]
    );
    client.release();
    res.status(200).json({ message: '草稿答案已保存' });
  } catch (error) {
    console.error('保存草稿答案时发生错误:', error);
    res.status(500).json({ error: '保存草稿答案失败', details: (error as Error).message });
  }
}

export default authenticateToken(saveDraftAnswerHandler);
