import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth'; // Adjust path as needed

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getCoursesHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  const userId = req.userId; // Get userId from authenticated request

  if (!userId) {
    client.release();
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const { tags } = req.query;
      let tagFilter = '';
      const queryParams: (string | number | string[])[] = [userId];

      if (tags) {
        const tagArray = (tags as string).split(',').map(tag => tag.trim());
        if (tagArray.length > 0) {
          tagFilter = ' AND c.tags && $2'; // Use && operator for array overlap
          queryParams.push(tagArray);
        }
      }

      // Filter courses by user_id
      const result = await client.query(`
        SELECT
          c.id,
          c.name,
          c.is_public,
          c.description,
          c.original_course_id,
          c.tags,
          (SELECT SUM(uqa.score) FROM user_quiz_answers uqa JOIN chapters ch_qa ON uqa.chapter_id = ch_qa.id WHERE uqa.user_id = $1 AND uqa.course_id = c.id AND (ch_qa.type = 1 OR ch_qa.type = 2)) AS total_quiz_exam_score,
          (SELECT COUNT(*) FROM chapters WHERE course_id = c.id AND (type = 1 OR type = 2)) AS count_quiz_exam_chapters,
          (SELECT COUNT(*) FROM chapters WHERE course_id = c.id) AS total_chapters,
          (SELECT COUNT(*) FROM user_course_progress WHERE user_id = $1 AND course_id = c.id) AS completed_chapters
        FROM
          courses c
        WHERE
          c.user_id = $1${tagFilter}
        ORDER BY
          c.id
      `, queryParams);

      const coursesWithCalculatedScores = result.rows.map(course => {
        const totalQuizExamScore = course.total_quiz_exam_score || 0;
        const countQuizExamChapters = course.count_quiz_exam_chapters || 0;

        let average_score = null;
        let passed = false;

        if (countQuizExamChapters > 0) {
          average_score = totalQuizExamScore / countQuizExamChapters;
          passed = average_score >= 60;
        }

        return {
          ...course,
          average_score,
          passed,
        };
      });

      res.status(200).json({ courses: coursesWithCalculatedScores });
    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: '缺少课程id' });
      }
      await client.query('BEGIN');
      // Ensure the course belongs to the authenticated user before deleting
      const courseCheck = await client.query('SELECT id FROM courses WHERE id = $1 AND user_id = $2', [id, userId]);
      if (courseCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: '无权删除此课程' });
      }

      await client.query('DELETE FROM chapters WHERE course_id = $1', [id]);
      await client.query('DELETE FROM courses WHERE id = $1', [id]);
      await client.query('COMMIT');
      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: '只允许 GET/DELETE 请求' });
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: '操作失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(getCoursesHandler); 