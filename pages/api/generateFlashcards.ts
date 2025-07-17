import { NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';
import { AIService } from '../../lib/AIService/AIService';
import { decrypt } from '../../utils/encryption';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function generateFlashcardsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.userId;

  const { favorites } = req.body;

  if (!favorites || !Array.isArray(favorites) || favorites.length === 0) {
    return res.status(400).json({ error: 'No favorites provided' });
  }

  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userResult = await pool.query(
      'SELECT ai_model, ai_api_key, ai_provider FROM users WHERE id = $1',
      [userId]
    );
    const userAiSettings = userResult.rows[0];

    if (!userAiSettings || !userAiSettings.ai_model || !userAiSettings.ai_api_key) {
      return res.status(400).json({ error: '用户未配置AI模型或API密钥，请前往个人设置页配置' });
    }

    const modelToUse = userAiSettings.ai_model;
    const apiKeyToUse = decrypt(userAiSettings.ai_api_key);
    const providerToUse = userAiSettings.ai_provider;

    const aiService = new AIService({
      apiKey: apiKeyToUse,
      model: modelToUse,
      provider: providerToUse,
    });

    const flashcards: { question: string; answer: string }[] = [];

    for (const fav of favorites) {
      const prompt = `请根据以下内容生成一个问题和答案的复习卡片。问题和答案请用JSON格式返回，例如：\n      {\n        "question": "问题内容",\n        "answer": "答案内容"\n      }\n      \n      内容: ${fav.content_snippet}`;

      const aiResponse = await aiService.sendMessage(prompt, { response_format: { type: 'json_object' } });
      try {
        const parsedResponse = JSON.parse(aiResponse.message.content);
        if (parsedResponse.question && parsedResponse.answer) {
          flashcards.push(parsedResponse);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response for flashcard:', parseError);
      }
    }

    res.status(200).json({ flashcards });
  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default authenticateToken(generateFlashcardsHandler);