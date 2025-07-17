/**
 * AIService - 用于与AI模型进行交互的服务类
 * 支持管理对话历史、发送消息并获取回复
 */

// 消息类型定义
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

// AI服务配置接口
export interface AIServiceConfig {
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  provider?: string; // Add provider field
  maxHistoryLength?: number;
  systemPrompt?: string;

  // OpenAI 生成参数
  temperature?: number; // 控制随机性 (0-2)，默认0.7
  top_p?: number; // 核采样，控制输出多样性 (0-1)
  presence_penalty?: number; // 避免重复话题的惩罚 (-2.0-2.0)
  frequency_penalty?: number; // 避免重复词语的惩罚 (-2.0-2.0)
  max_tokens?: number; // 生成的最大令牌数
  n?: number; // 为每个提示生成的回复数量
  stop?: string[]; // 生成停止的序列
  logit_bias?: Record<string, number>; // 调整特定令牌的似然性
  user?: string; // 最终用户的唯一标识符
  response_format?: { type: 'text' | 'json_object' }; // 回复格式类型
}

// AI服务生成参数
export interface GenerationParams {
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  max_tokens?: number;
  n?: number;
  stop?: string[];
  logit_bias?: Record<string, number>;
  user?: string;
  response_format?: { type: 'text' | 'json_object' };
}

// AI服务响应接口
export interface AIResponse {
  message: Message;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;
  private provider: string;
  private conversationHistory: Message[];
  private maxHistoryLength: number;

  // 默认生成参数
  private defaultParams: GenerationParams;

  /**
   * 构造函数
   * @param config AI服务配置
   */
  constructor(config: AIServiceConfig = {}) {
    this.apiKey = config.apiKey || ''; // API Key should be provided dynamically
    this.model = config.model || ''; // Model should be provided dynamically
    this.provider = config.provider || ''; // Provider should be provided dynamically
    this.maxHistoryLength = config.maxHistoryLength || 100;
    this.conversationHistory = [];

    // Determine API endpoint based on provider
    switch (this.provider.toLowerCase()) {
      case 'openai':
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        break;
      case 'deepseek':
        this.apiEndpoint = 'https://api.deepseek.com/chat/completions';
        break;
      case 'zhipuai':
        this.apiEndpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        break;
      case 'aliyun':
        this.apiEndpoint =
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        break;
      case 'anthropic':
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
        break;
      default:
        this.apiEndpoint = config.apiEndpoint || '';
        if (!this.apiEndpoint) {
          console.warn('AIService: Unknown provider or no API endpoint provided');
        }
    }

    // Initialize default generation parameters
    this.defaultParams = {
      temperature: config.temperature ?? 0.7,
      top_p: config.top_p ?? 1.0,
      presence_penalty: config.presence_penalty ?? 0,
      frequency_penalty: config.frequency_penalty ?? 0,
      max_tokens: config.max_tokens,
      n: config.n ?? 1,
      stop: config.stop,
      logit_bias: config.logit_bias,
      user: config.user,
      response_format: config.response_format,
    };

    // If a system prompt is provided, add it as the first message
    if (config.systemPrompt) {
      this.addSystemMessage(config.systemPrompt);
    }
  }

  /**
   * 添加系统消息
   * @param content 系统消息内容
   */
  public addSystemMessage(content: string): void {
    const systemMessage: Message = {
      id: this.generateId(),
      content,
      role: 'system',
      timestamp: new Date(),
    };

    // 替换现有的系统消息或添加新的
    const systemIndex = this.conversationHistory.findIndex((msg) => msg.role === 'system');
    if (systemIndex >= 0) {
      this.conversationHistory[systemIndex] = systemMessage;
    } else {
      this.conversationHistory.unshift(systemMessage);
    }
  }

  /**
   * 设置生成参数
   * @param params 要设置的参数
   */
  public setGenerationParams(params: Partial<GenerationParams>): void {
    this.defaultParams = { ...this.defaultParams, ...params };
  }

  /**
   * 获取当前生成参数
   * @returns 当前的生成参数对象
   */
  public getGenerationParams(): GenerationParams {
    return { ...this.defaultParams };
  }

  /**
   * 向AI发送消息并获取回复
   * @param content 用户消息内容
   * @param params 可选的生成参数，覆盖默认设置
   * @returns Promise<AIResponse> AI回复
   */
  public async sendMessage(
    content: string,
    params?: Partial<GenerationParams>,
    signal?: AbortSignal
  ): Promise<AIResponse> {
    try {
      // 添加用户消息到历史记录
      const userMessage: Message = {
        id: this.generateId(),
        content,
        role: 'user',
        timestamp: new Date(),
      };
      this.conversationHistory.push(userMessage);

      // 保持历史记录在允许的长度范围内
      this.trimConversationHistory();

      // 合并默认参数和传入的参数
      const generationParams = { ...this.defaultParams, ...params };

      // 准备请求数据
      const requestBody = {
        model: this.model,
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        // 添加OpenAI参数
        temperature: generationParams.temperature,
        top_p: generationParams.top_p,
        presence_penalty: generationParams.presence_penalty,
        frequency_penalty: generationParams.frequency_penalty,
        max_tokens: generationParams.max_tokens,
        n: generationParams.n,
        stop: generationParams.stop,
        logit_bias: generationParams.logit_bias,
        user: generationParams.user,
        response_format: generationParams.response_format,
      };

      // 过滤掉undefined的参数
      Object.keys(requestBody).forEach(
        (key) =>
          requestBody[key as keyof typeof requestBody] === undefined &&
          delete requestBody[key as keyof typeof requestBody]
      );

      // 发送请求到API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API请求失败: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // 创建助手消息
      const assistantMessage: Message = {
        id: this.generateId(),
        content: data.choices[0].message.content,
        role: 'assistant',
        timestamp: new Date(),
      };

      // 添加到历史记录
      this.conversationHistory.push(assistantMessage);

      return {
        message: assistantMessage,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      console.log('AI服务错误:', error);
      throw error;
    }
  }

  /**
   * 创建流式响应处理器
   * 用于处理流式API响应
   * @param content 用户消息内容
   * @param onChunk 回调函数，接收每个文本块
   * @param onComplete 完成时的回调函数
   * @param params 可选的生成参数，覆盖默认设置
   * @returns 处理流式响应的方法
   */
  public async sendMessageStream(
    content: string,
    onChunk: (text: string) => void,
    onComplete: (message: Message) => void,
    params?: Partial<GenerationParams>,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      // 添加用户消息到历史记录
      const userMessage: Message = {
        id: this.generateId(),
        content,
        role: 'user',
        timestamp: new Date(),
      };
      this.conversationHistory.push(userMessage);

      // 保持历史记录在允许的长度范围内
      this.trimConversationHistory();

      // 合并默认参数和传入的参数
      const generationParams = { ...this.defaultParams, ...params };

      // 准备请求数据
      const requestBody = {
        model: this.model,
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        // 添加OpenAI参数
        temperature: generationParams.temperature,
        top_p: generationParams.top_p,
        presence_penalty: generationParams.presence_penalty,
        frequency_penalty: generationParams.frequency_penalty,
        max_tokens: generationParams.max_tokens,
        n: generationParams.n,
        stop: generationParams.stop,
        logit_bias: generationParams.logit_bias,
        user: generationParams.user,
        response_format: generationParams.response_format,
        stream: true,
      };

      // 过滤掉undefined的参数
      Object.keys(requestBody).forEach(
        (key) =>
          requestBody[key as keyof typeof requestBody] === undefined &&
          delete requestBody[key as keyof typeof requestBody]
      );

      // 发送请求到API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API请求失败: ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应没有可读流');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码收到的块
        const chunk = decoder.decode(value, { stream: true });

        // 处理流式数据 (根据OpenAI流式API格式)
        const lines = chunk
          .split('\n')
          .filter((line) => line.trim() !== '' && line.trim() !== 'data: [DONE]');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.substring(6));
              if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                const contentDelta = jsonData.choices[0].delta.content;
                fullContent += contentDelta;
                onChunk(contentDelta);
              }
            } catch (e) {
              console.error('解析流式响应出错:', e);
            }
          }
        }
      }

      // 创建助手消息并添加到历史记录
      const assistantMessage: Message = {
        id: this.generateId(),
        content: fullContent,
        role: 'assistant',
        timestamp: new Date(),
      };

      this.conversationHistory.push(assistantMessage);
      onComplete(assistantMessage);
    } catch (error) {
      console.error('AI流式服务错误:', error);
      throw error;
    }
  }

  // 其他现有方法保持不变...
  /**
   * 获取当前对话历史
   * @returns Message[] 对话历史数组
   */
  public getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * 清空对话历史
   * @param keepSystemPrompt 是否保留系统提示
   */
  public clearConversationHistory(keepSystemPrompt: boolean = true): void {
    if (keepSystemPrompt) {
      const systemMessages = this.conversationHistory.filter((msg) => msg.role === 'system');
      this.conversationHistory = systemMessages;
    } else {
      this.conversationHistory = [];
    }
  }

  /**
   * 设置API密钥
   * @param apiKey API密钥
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * 设置API端点
   * @param endpoint API端点URL
   */
  public setApiEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }

  /**
   * 设置AI模型
   * @param model 模型名称
   */
  public setModel(model: string): void {
    this.model = model;
  }

  /**
   * 设置最大历史记录长度
   * @param length 最大消息数量
   */
  public setMaxHistoryLength(length: number): void {
    this.maxHistoryLength = length;
    this.trimConversationHistory();
  }

  /**
   * 生成唯一ID
   * @returns string 生成的ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * 保持对话历史在设定的长度范围内
   * 优先保留系统消息和最近的对话
   */
  private trimConversationHistory(): void {
    if (this.conversationHistory.length <= this.maxHistoryLength) {
      return;
    }

    // 分离系统消息和普通消息
    const systemMessages = this.conversationHistory.filter((msg) => msg.role === 'system');
    const normalMessages = this.conversationHistory.filter((msg) => msg.role !== 'system');

    // 计算需要保留的普通消息数量
    const keepCount = this.maxHistoryLength - systemMessages.length;

    // 保留最新的消息
    const trimmedNormalMessages = normalMessages.slice(-keepCount);

    // 重建历史记录
    this.conversationHistory = [...systemMessages, ...trimmedNormalMessages];
  }

  /**
   * 导出对话历史为JSON
   * @returns string JSON格式的对话历史
   */
  public exportConversationHistoryAsJSON(): string {
    return JSON.stringify(this.conversationHistory);
  }

  /**
   * 从JSON导入对话历史
   * @param jsonString JSON格式的对话历史
   */
  public importConversationHistoryFromJSON(jsonString: string): void {
    try {
      const parsedHistory = JSON.parse(jsonString) as Message[];
      // 验证导入的数据结构
      if (Array.isArray(parsedHistory) && parsedHistory.every(this.isValidMessage)) {
        this.conversationHistory = parsedHistory;
      } else {
        throw new Error('无效的对话历史格式');
      }
    } catch (error) {
      console.error('导入对话历史失败:', error);
      throw error;
    }
  }

  /**
   * 验证消息对象是否有效
   * @param msg 要验证的对象
   * @returns boolean 是否为有效消息
   */
  private isValidMessage(msg: any): boolean {
    return (
      typeof msg === 'object' &&
      typeof msg.id === 'string' &&
      typeof msg.content === 'string' &&
      ['user', 'assistant', 'system'].includes(msg.role) &&
      msg.timestamp instanceof Date
    );
  }

  /**
   * 设置系统提示
   * @param content 系统提示内容
   * @returns 当前AIService实例，支持链式调用
   */
  public setSystemPrompt(content: string): AIService {
    this.addSystemMessage(content);
    return this;
  }

  /**
   * 获取当前系统提示
   * @returns 当前系统提示内容，如果不存在则返回null
   */
  public getSystemPrompt(): string | null {
    const systemMessage = this.conversationHistory.find((msg) => msg.role === 'system');
    return systemMessage ? systemMessage.content : null;
  }
}
