import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function copyCourseHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { courseId } = req.body;
  const userId = req.userId; // Authenticated user ID

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!courseId) {
    return res.status(400).json({ error: '缺少课程ID' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the public course details
    const publicCourseResult = await client.query(
      'SELECT id, name, description, tags FROM courses WHERE id = $1 AND is_public = TRUE',
      [courseId]
    );

    if (publicCourseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '未找到公共课程或该课程不可复制' });
    }

    const publicCourse = publicCourseResult.rows[0];

    // 2. Check if the user already has a copy of this course
    const existingCopy = await client.query(
      'SELECT id FROM courses WHERE user_id = $1 AND original_course_id = $2',
      [userId, publicCourse.id]
    );

    if (existingCopy.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '您已复制过此课程' });
    }

    // 3. Create a new course for the user
    const newCourseResult = await client.query(
      'INSERT INTO courses (name, user_id, original_course_id, description, tags) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [`${publicCourse.name} (副本)`, userId, publicCourse.id, publicCourse.description, publicCourse.tags]
    );
    const newCourseId = newCourseResult.rows[0].id;

    // 4. Copy chapters from the public course to the new course
    await client.query(
      `INSERT INTO chapters (course_id, charpter, charpter_title, content, type)
       SELECT $1, charpter, charpter_title, content, type
       FROM chapters
       WHERE course_id = $2`,
      [newCourseId, publicCourse.id]
    );

    // 5. Increment the copy count of the public course
    await client.query(
      'UPDATE courses SET copy_count = copy_count + 1 WHERE id = $1',
      [publicCourse.id]
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, newCourseId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('复制课程时发生错误:', error);
    res.status(500).json({ error: '复制课程失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(copyCourseHandler);
