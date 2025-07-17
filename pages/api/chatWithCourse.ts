import { NextApiResponse } from 'next';
import { AIService } from '../../lib/AIService/AIService';
import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function chatWithCourseHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { courseId, chapterContent, userQuestion, selectedModelId } = req.body;
  const userId = req.userId; // Authenticated user ID

  if (!courseId || !chapterContent || !userQuestion || !selectedModelId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let modelToUse: string | undefined;
    let apiKeyToUse: string | undefined;
    let providerToUse: string | undefined;

    if (selectedModelId === 'deepseek-chat-free-trial') {
      modelToUse = 'deepseek-chat';
      apiKeyToUse = process.env.FREE_DEEPSEEK_CHAT_KEY;
      providerToUse = 'deepseek';
    } else if (selectedModelId && selectedModelId !== 'auto') {
      const aiModelRes = await pool.query(
        'SELECT model_name, api_key, provider FROM user_ai_models WHERE id = $1 AND user_id = $2',
        [selectedModelId, user.id]
      );
      const aiModel = aiModelRes.rows[0];

      if (!aiModel) {
        return res.status(404).json({ error: 'AI model not found or not authorized' });
      }
      modelToUse = aiModel.model_name;
      apiKeyToUse = aiModel.api_key;
      providerToUse = aiModel.provider;
    } else {
      // Fallback to user's default AI settings if 'auto' or no specific model is selected
      const userAiSettingsRes = await pool.query(
        'SELECT ai_model, ai_api_key, ai_provider FROM users WHERE id = $1',
        [userId]
      );
      const userAiSettings = userAiSettingsRes.rows[0];

      if (!userAiSettings || !userAiSettings.ai_model || !userAiSettings.ai_api_key) {
        return res.status(400).json({ error: 'User has no default AI model or API key configured' });
      }
      modelToUse = userAiSettings.ai_model;
      apiKeyToUse = userAiSettings.ai_api_key;
      providerToUse = userAiSettings.ai_provider;
    }

    if (!modelToUse || !apiKeyToUse || !providerToUse) {
      return res.status(500).json({ error: 'Failed to determine AI model configuration' });
    }

    const aiService = new AIService({
      apiKey: apiKeyToUse,
      model: modelToUse,
      provider: providerToUse,
    });

    // Construct the prompt for the LLM
    const prompt = `你是一个课程助手，请根据以下课程内容回答用户的问题。
    课程内容:
    \`\`\`
    ${chapterContent}
    \`\`\`
    用户问题: ${userQuestion}`;

    const aiResponse = await aiService.sendMessage(prompt);

    res.status(200).json({ reply: aiResponse.message.content });
  } catch (error) {
    console.error('Error chatting with course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default authenticateToken(chatWithCourseHandler);
