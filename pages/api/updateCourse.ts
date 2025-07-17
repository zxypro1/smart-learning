import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateCourseHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { id, name, description, tags, chapters } = req.body;
  const userId = req.userId; // Authenticated user ID

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!id || !name) {
    return res.status(400).json({ error: '课程ID和名称是必需的' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update course details
    const courseUpdateResult = await client.query(
      `UPDATE courses SET name = $1, description = $2, tags = $3 WHERE id = $4 AND user_id = $5 RETURNING id, name, description, tags`,
      [name, description || null, tags || [], id, userId]
    );

    if (courseUpdateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: '未找到该课程或无权操作' });
    }

    const updatedCourse = courseUpdateResult.rows[0];

    // 2. Handle chapters if provided
    if (Array.isArray(chapters)) {
      // Fetch existing chapters
      const existingChaptersResult = await client.query(
        'SELECT charpter FROM chapters WHERE course_id = $1',
        [id]
      );
      const existingChapterNumbers = new Set(existingChaptersResult.rows.map(row => row.charpter));

      const incomingChapterNumbers = new Set(chapters.map((c: any) => c.charpter));

      // Update or insert chapters
      for (const chapter of chapters) {
        if (!chapter.charpter || !chapter.charpter_title || !chapter.content || chapter.type === undefined) {
          throw new Error('章节信息不完整');
        }

        if (existingChapterNumbers.has(chapter.charpter)) {
          // Update existing chapter
          await client.query(
            'UPDATE chapters SET charpter_title = $1, content = $2, type = $3 WHERE course_id = $4 AND charpter = $5',
            [chapter.charpter_title, chapter.content, chapter.type, id, chapter.charpter]
          );
        } else {
          // Insert new chapter
          await client.query(
            'INSERT INTO chapters (course_id, charpter, charpter_title, content, type, score) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, chapter.charpter, chapter.charpter_title, chapter.content, chapter.type, null]
          );
        }
      }

      // Delete chapters not present in the incoming array
      for (const existingCharpter of existingChapterNumbers) {
        if (!incomingChapterNumbers.has(existingCharpter)) {
          await client.query(
            'DELETE FROM chapters WHERE course_id = $1 AND charpter = $2',
            [id, existingCharpter]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: '课程更新成功', course: updatedCourse });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('更新课程时发生错误:', error);
    res.status(500).json({ error: '更新课程失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(updateCourseHandler);