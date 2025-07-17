import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const config = {
  api: {
    bodyParser: false,
  },
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importCourseHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const form = new IncomingForm();
  form.parse(req, async (err, _, files) => {
    if (err) {
      return res.status(500).json({ error: '解析文件失败', details: err.message });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const client = await pool.connect();
    try {
      const trustedDir = os.tmpdir();
      const resolvedPath = path.resolve(file.filepath);
      if (!resolvedPath.startsWith(trustedDir)) {
        return res.status(400).json({ error: 'Invalid file path' });
      }
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      const { course, chapters } = JSON.parse(fileContent);

      await client.query('BEGIN');

      const newCourseResult = await client.query(
        'INSERT INTO courses (user_id, name, description, tags) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, course.name, course.description, course.tags]
      );
      const newCourseId = newCourseResult.rows[0].id;

      for (const chapter of chapters) {
        await client.query(
          'INSERT INTO chapters (course_id, charpter, charpter_title, content, type, score) VALUES ($1, $2, $3, $4, $5, $6)',
          [newCourseId, chapter.charpter, chapter.charpter_title, chapter.content, chapter.type, chapter.score]
        );
      }

      await client.query('COMMIT');

      res.status(200).json({ message: '课程导入成功', courseId: newCourseId });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: '导入课程失败', details: (error as Error).message });
    } finally {
      client.release();
    }
  });
}

export default authenticateToken(importCourseHandler);
