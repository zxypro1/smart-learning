import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth'; // Adjust path as needed

// 数据库连接池配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 你需要在 .env 文件中配置 DATABASE_URL
});

async function saveCourseHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { courseName, description, tags, chapters } = req.body;
  const userId = req.userId; // Get userId from authenticated request

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!courseName || !Array.isArray(chapters) || chapters.length === 0) {
    return res.status(400).json({ error: '参数错误，必须包含课程名和章节数组' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 保存课程，并关联 user_id
    const courseResult = await client.query(
      'INSERT INTO courses (name, user_id, description, tags) VALUES ($1, $2, $3, $4) RETURNING id',
      [courseName, userId, description, tags]
    );
    const courseId = courseResult.rows[0].id;

    // 保存章节
    await Promise.all(chapters.map(async (chapter: any) => {
      if (!chapter.charpter || !chapter.charpter_title || !chapter.content || chapter.type === undefined) {
        throw new Error('章节信息不完整');
      }
      await client.query(
        'INSERT INTO chapters (course_id, charpter, charpter_title, content, type, score) VALUES ($1, $2, $3, $4, $5, $6)',
        [courseId, chapter.charpter, chapter.charpter_title, chapter.content, chapter.type, null] // Initialize score as null
      );
    }));
    await client.query('COMMIT');
    res.status(200).json({ success: true, courseId });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: '保存失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(saveCourseHandler); 