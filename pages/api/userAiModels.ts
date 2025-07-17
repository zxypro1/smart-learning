import type { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { encrypt } from '../../utils/encryption';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function userAiModelsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.userId; // From authenticatedToken middleware

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const client = await pool.connect();

    switch (req.method) {
      case 'GET': {
        const getResult = await client.query(
          'SELECT id, model_name, provider FROM user_ai_models WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        res.status(200).json({ models: getResult.rows });
        break;
      }

      case 'POST': {
        const { model_name, api_key, provider } = req.body;
        if (!model_name || !api_key || !provider) {
          return res.status(400).json({ error: '缺少必要的参数：model_name, api_key, provider' });
        }
        const encrypted_api_key = encrypt(api_key);
        const postResult = await client.query(
          'INSERT INTO user_ai_models (user_id, model_name, api_key, provider) VALUES ($1, $2, $3, $4) RETURNING id, model_name, provider',
          [userId, model_name, encrypted_api_key, provider]
        );
        res.status(201).json({ message: 'AI模型添加成功', model: postResult.rows[0] });
        break;
      }

      case 'PUT': {
        const { id, model_name: update_model_name, api_key: update_api_key, provider: update_provider } = req.body;
        if (!id || !update_model_name || !update_api_key || !update_provider) {
          return res.status(400).json({ error: '缺少必要的参数：id, model_name, api_key, provider' });
        }
        const encrypted_update_api_key = encrypt(update_api_key);
        const putResult = await client.query(
          'UPDATE user_ai_models SET model_name = $1, api_key = $2, provider = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING id, model_name, provider',
          [update_model_name, encrypted_update_api_key, update_provider, id, userId]
        );
        if (putResult.rows.length === 0) {
          return res.status(404).json({ error: '未找到或无权修改该AI模型配置' });
        }
        res.status(200).json({ message: 'AI模型更新成功', model: putResult.rows[0] });
        break;
      }

      case 'DELETE': {
        const { id: deleteId } = req.query;
        if (!deleteId) {
          return res.status(400).json({ error: '缺少必要的参数：id' });
        }
        const deleteResult = await client.query(
          'DELETE FROM user_ai_models WHERE id = $1 AND user_id = $2',
          [deleteId, userId]
        );
        if (deleteResult.rowCount === 0) {
          return res.status(404).json({ error: '未找到或无权删除该AI模型配置' });
        }
        res.status(204).end(); // No content for successful deletion
        break;
      }

      default:
        res.status(405).json({ error: 'Method Not Allowed' });
        break;
    }
    client.release();
  } catch (error) {
    console.error('处理用户AI模型时发生错误:', error);
    res.status(500).json({ error: '内部服务器错误', details: (error as Error).message });
  }
}

export default authenticateToken(userAiModelsHandler);
