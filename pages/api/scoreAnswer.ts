import { AIService } from '../../lib/AIService/AIService';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { Pool } from 'pg';
import { decrypt } from '../../utils/encryption';
import { NextApiResponse } from 'next';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function scoreAnswerHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { chapterContent, userAnswer, chapterType, selectedModelId } = req.body;
  const userId = req.userId; // Authenticated user ID

  let modelToUse: string | undefined;
  let apiKeyToUse: string | undefined;
  let providerToUse: string | undefined;

  console.log('req.user in scoreAnswer:', req.user);

  try {
    const client = await pool.connect();

    if (selectedModelId === 'deepseek-chat-free-trial') {
      modelToUse = 'deepseek-chat';
      apiKeyToUse = process.env.FREE_DEEPSEEK_CHAT_KEY;
      providerToUse = 'deepseek';
    } else if (selectedModelId && selectedModelId !== 'auto') {
      // Fetch model and API key from user_ai_models table
      const result = await client.query(
        'SELECT model_name, api_key, provider FROM user_ai_models WHERE id = $1 AND user_id = $2',
        [selectedModelId, userId]
      );
      if (result.rows.length > 0) {
        modelToUse = result.rows[0].model_name;
        apiKeyToUse = decrypt(result.rows[0].api_key);
        providerToUse = result.rows[0].provider;
      } else {
        client.release();
        return res.status(404).json({ error: '未找到或无权访问指定的AI模型配置' });
      }
    } else {
      // Use default AI settings from users table
      const userResult = await client.query(
        'SELECT ai_model, ai_api_key, ai_provider FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        modelToUse = userResult.rows[0].ai_model;
        apiKeyToUse = userResult.rows[0].ai_api_key ? decrypt(userResult.rows[0].ai_api_key) : undefined;
        providerToUse = userResult.rows[0].ai_provider;
      } else {
        client.release();
        return res.status(404).json({ error: '未找到用户AI配置' });
      }
    }
    client.release();

    if (!modelToUse || !apiKeyToUse) {
      return res.status(400).json({ error: '用户未配置AI模型或API密钥，请前往个人设置页配置' });
    }

    const scoreAIService = new AIService({
      systemPrompt: `你是一个专业的教育评分员。你需要根据提供的章节内容、用户答案和章节类型（1为习题，2为考试），对用户的答案进行评分并给出详细的反馈。反馈应包括：
1. 评分（例如：优秀，良好，及格，不及格），请务必在反馈的开头以 "分数：XX/100" 的格式给出分数，其中XX是0到100之间的整数。
2. 详细的理由，指出答案的优点和不足。
3. 如果是习题，可以给出正确答案的提示或解析。
4. 如果是考试，请严格评分，并指出知识点掌握情况。
请以清晰、结构化的Markdown格式返回反馈。`,
      max_tokens: 1000,
      model: modelToUse,
      apiKey: apiKeyToUse,
      provider: providerToUse,
    });

    if (!chapterContent || !userAnswer || chapterType === undefined) {
      return res.status(400).json({ error: '缺少必要的参数：章节内容、用户答案或章节类型' });
    }

    try {
      const prompt = `章节内容：

${chapterContent}

用户答案：

${userAnswer}

章节类型：${chapterType === 1 ? '习题' : '考试'}

请根据上述信息，对用户答案进行评分和反馈。`;

      const aiResponse = await scoreAIService.sendMessage(prompt);
      const feedback = aiResponse.message.content;

      // Extract score from feedback
      const scoreMatch = feedback.match(/分数：(\d+)\/100/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

      // Update the chapter's score in the database
      if (score !== null) {
        await pool.query(
          'UPDATE chapters SET score = $1 WHERE course_id = $2 AND charpter = $3',
          [score, req.body.courseId, req.body.charpter] // Assuming courseId and charpter are passed in req.body
        );
      }

      res.status(200).json({ feedback, score });
    } catch (error) {
      console.error('评分时发生错误:', error);
      res.status(500).json({ error: '评分失败', details: (error as Error).message });
    }
  } catch (error) {
    console.error('处理用户AI模型时发生错误:', error);
    res.status(500).json({ error: '内部服务器错误', details: (error as Error).message });
  }
}

export default authenticateToken(scoreAnswerHandler);
