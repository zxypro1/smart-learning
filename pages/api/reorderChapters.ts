import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function reorderChaptersHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { courseId, chapterOrders } = req.body; // chapterOrders is an array of { charpter: oldCharpter, newCharpter: newCharpter }
  const userId = req.userId; // Authenticated user ID

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!courseId || !Array.isArray(chapterOrders)) {
    return res.status(400).json({ error: '缺少必要的参数：courseId 或 chapterOrders' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure the course belongs to the authenticated user
    const courseCheck = await client.query(
      'SELECT id FROM courses WHERE id = $1 AND user_id = $2',
      [courseId, userId]
    );
    if (courseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: '未找到该课程或无权操作' });
    }

    // Temporarily set all chapters' charpter numbers to a negative value to avoid conflicts
    await client.query(
      'UPDATE chapters SET charpter = -charpter WHERE course_id = $1',
      [courseId]
    );

    // Update chapters with their new order
    for (const order of chapterOrders) {
      await client.query(
        'UPDATE chapters SET charpter = $1 WHERE course_id = $2 AND charpter = $3',
        [order.newCharpter, courseId, -order.charpter] // Use the negative old charpter
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: '章节顺序更新成功。' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('重新排序章节时发生错误:', error);
    res.status(500).json({ error: '重新排序章节失败', details: (error as Error).message });
  } finally {
    client.release();
  }
}

export default authenticateToken(reorderChaptersHandler);
