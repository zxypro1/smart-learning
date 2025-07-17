import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const uploadDir = path.join(process.cwd(), 'public', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

async function uploadAvatarHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const form = new IncomingForm({ uploadDir, keepExtensions: true });

  form.parse(req, async (err, _, files) => {
    if (err) {
      return res.status(500).json({ error: '解析文件失败', details: err.message });
    }

    const file = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar;
    if (!file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const client = await pool.connect();
    try {
      const newPath = `/avatars/${path.basename(file.filepath)}`;
      await client.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [newPath, userId]);
      res.status(200).json({ message: '头像上传成功', avatarUrl: newPath });
    } catch (error) {
      res.status(500).json({ error: '更新头像失败', details: (error as Error).message });
    } finally {
      client.release();
    }
  });
}

export default authenticateToken(uploadAvatarHandler);
