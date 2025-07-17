import { AIService } from '../../lib/AIService/AIService';
import { AuthenticatedRequest, authenticateToken } from '../../utils/auth';
import { Pool } from 'pg';
import { decrypt } from '../../utils/encryption';
import { NextApiResponse } from 'next';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function generateChapterContentHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '用户未认证或会话已过期' });
  }

  const { chapterInfo, selectedModelId, courseContext } = req.body;
  const userId = req.userId; // Authenticated user ID

  let modelToUse: string | undefined;
  let apiKeyToUse: string | undefined;
  let providerToUse: string | undefined;

  console.log('req.user in generateChapterContent:', req.user);

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

    const systemPrompt = `你是一个中国最好的大学的网络课程制定者，你制作的课程将直接给予学生学习。请你根据以下信息，以Markdown格式生成本章节的课文正文（只生成正文，不需要什么额外说明，例如字数）。type为章节类型，0为常规教学章节，1为课后作业 / 随堂测验，2为考试。必须很详细，不超过7000字。课后作业 / 随堂测验的输入框在学生屏幕的右边。不支持图片等文件上传，只支持文字输入。你可以使用 Mermaid 语法来生成流程图、序列图、类图等，但必须是dark主题的，例如：\`\`\`mermaid
---
title: Graph TD
config:
  theme: dark
---
graph TD;
    A-->B;
    B-->C;
\`\`\`
生成的图表质量要高，要逻辑清晰，注释明确，能拿来当大学课件。注意mermaid图表的语法必须正确，且要符合dark主题规范。千万不能在mermaid中使用中文标点符号（但可以使用中文文字），不然会报错！
注意：如果章节内容中包含代码块，请确保代码块的语法高亮正确，并且代码块的内容完整。

课程整体信息：
课程名称：${courseContext.courseName}
课程描述：${courseContext.courseDescription}
课程标签：${courseContext.courseTags.join(', ')}

${courseContext.previousChapters.length > 0 ? `以下是本课程已生成的前面章节内容，请确保当前章节与这些内容连贯：
${courseContext.previousChapters.map((ch: any) => `章节 ${ch.charpter}: ${ch.charpter_title}
${ch.content}`).join('\n\n')}

` : ''}
`;

    const chapterContentAIService = new AIService({
      systemPrompt,
      max_tokens: 8000,
      model: modelToUse,
      apiKey: apiKeyToUse,
      provider: providerToUse,
    });

    if (!chapterInfo) {
      return res.status(400).json({ error: '缺少必要的参数：chapterInfo' });
    }

    let promptMessage: string;
    if (chapterInfo.type === 0) {
      promptMessage = `请根据当前章节信息，生成本章节的课文正文：\n${JSON.stringify(chapterInfo)}`;
    } else if (chapterInfo.type === 1) {
      promptMessage = `请根据当前章节信息，生成本章节的课后作业 / 随堂测验。请确保题目中不包含标准答案。\n${JSON.stringify(chapterInfo)} \n 课后作业 / 随堂测验的输入框在学生屏幕的右边。不支持图片等文件上传，只支持文字输入。`;
    } else if (chapterInfo.type === 2) {
      promptMessage = `请根据当前章节信息，生成本章节的考试内容。请确保题目中不包含标准答案。\n${JSON.stringify(chapterInfo)} \n 课后作业 / 随堂测验的输入框在学生屏幕的右边。不支持图片等文件上传，只支持文字输入。`;
    } else {
      promptMessage = `请根据当前章节信息，生成本章节内容：\n${JSON.stringify(chapterInfo)}`; // Fallback
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    await chapterContentAIService.sendMessageStream(
      promptMessage,
      (chunk) => {
        res.write(chunk);
      },
      () => {
        res.end();
      },
      undefined, // params
      req.signal // Pass the AbortSignal from the request
    );
  } catch (error) {
    console.error('生成章节内容时发生错误:', error);
    res.status(500).json({ error: '生成章节内容失败', details: (error as Error).message });
  }
}
export default authenticateToken(generateChapterContentHandler);
