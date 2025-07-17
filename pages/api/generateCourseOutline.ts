import { AIService } from '../../lib/AIService/AIService';
import { authenticateToken, AuthenticatedRequest } from '../../utils/auth';
import { Pool } from 'pg';
import { decrypt } from '../../utils/encryption';
import { NextApiResponse } from 'next';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function generateCourseOutlineHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { searchQuery, selectedModelId, chapterCount, difficulty } = req.body;
  const userId = req.userId; // Authenticated user ID

  let modelToUse: string | undefined;
  let apiKeyToUse: string | undefined;
  let providerToUse: string | undefined;

  console.log('req.user in generateCourseOutline:', req.user);

  try {
    const client = await pool.connect();
    console.log('selectedModelId:', selectedModelId);
    console.log('userId:', userId);

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

    if (!modelToUse || !apiKeyToUse || !providerToUse) {
      return res.status(400).json({ error: '用户未配置AI模型或API密钥，请前往个人设置页配置' });
    }

    const systemPrompt = `你是一个中国最好的大学的网络课程制定者，你制作的课程将直接给予学生学习。对于学生想要学的内容，你要以以下JSON格式返回课程大纲、描述和标签：
{
  "courseName": "课程名称",
  "description": "课程描述，详细介绍课程内容、目标受众、学习成果等，字数在100-300字之间。",
  "tags": ["标签1", "标签2", "标签3"], // 课程标签，3-5个，例如：["机器学习", "Python", "数据科学"]
  "chapters": [
    {
      "charpter": "章节index",
      "charpter_title": "章节标题",
      "content": "章节内容概括",
      "type": "章节类型，0为常规教学章节，1为课后作业 / 随堂测验，2为考试"
    }
  ]
}
课程大纲应包含 ${chapterCount || 5} 个章节。课程难度为 ${difficulty || '初级'}。每个课程至少有一个考试和一个课后作业 / 随堂测验。课后作业 / 随堂测验的输入框在学生屏幕的右边。不支持图片等文件上传，只支持文字输入。
学生想要学习的课题是：`;

    const outlineAIService = new AIService({
      systemPrompt,
      max_tokens: 8000,
      model: modelToUse,
      apiKey: apiKeyToUse,
      provider: providerToUse
    });

    if (!searchQuery) {
      return res.status(400).json({ error: '缺少必要的参数：searchQuery' });
    }

    const aiResponse = await outlineAIService.sendMessage(searchQuery);
    const outline = aiResponse.message.content;

    // Remove JSON string delimiters if present
    const cleanedOutline = outline.replace(/```json\n?|\n?```/g, '');

    res.status(200).json({ outline: cleanedOutline });
  } catch (error) {
    console.error('生成课程大纲时发生错误:', error);
    res.status(500).json({ error: '生成课程大纲失败', details: (error as Error).message });
  }
}

export default authenticateToken(generateCourseOutlineHandler);
