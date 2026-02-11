/**
 * DeepSeek API 客户端
 * 用于调用 DeepSeek LLM 进行 Agent 对话生成
 */

export interface DeepSeekConfig {
  apiKey: string;
  apiBase: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class DeepSeekClient {
  private config: DeepSeekConfig;

  constructor(config?: Partial<DeepSeekConfig>) {
    this.config = {
      // 支持 DEEPSEEK_API_KEY 或 OPENAI_API_KEY
      apiKey: config?.apiKey || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
      // 支持 DEEPSEEK_API_BASE 或 OPENAI_BASE_URL
      apiBase: config?.apiBase || process.env.DEEPSEEK_API_BASE || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
      // 支持 DEEPSEEK_MODEL 或 OPENAI_MODEL
      model: config?.model || process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat',
      temperature: config?.temperature || parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
      maxTokens: config?.maxTokens || parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2000'),
    };

    // 验证配置
    if (!this.config.apiKey || this.config.apiKey === 'your_deepseek_api_key_here') {
      console.warn('DeepSeek API Key 未配置，将无法使用真实 LLM');
    }
  }

  /**
   * 调用 DeepSeek Chat API
   * @param messages 对话历史
   * @returns LLM 生成的回复
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.config.apiKey || this.config.apiKey === 'your_deepseek_api_key_here') {
      throw new Error('DeepSeek API Key 未配置');
    }

    console.log('\n========== DeepSeek API 调用开始 ==========');
    console.log('[DeepSeek] API Base:', this.config.apiBase);
    console.log('[DeepSeek] Model:', this.config.model);
    console.log('[DeepSeek] Temperature:', this.config.temperature);
    console.log('[DeepSeek] Max Tokens:', this.config.maxTokens);
    console.log('[DeepSeek] Messages 数量:', messages.length);
    console.log('\n[DeepSeek] 输入消息:');
    messages.forEach((msg, index) => {
      console.log(`  [${index}] ${msg.role}:`, msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''));
    });

    try {
      const requestBody = {
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      };

      console.log('\n[DeepSeek] 发送请求到:', `${this.config.apiBase}/chat/completions`);

      const response = await fetch(`${this.config.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[DeepSeek] 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DeepSeek] API 错误响应:', errorText);
        throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      // 提取回复内容
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        console.error('[DeepSeek] API 返回数据:', JSON.stringify(result, null, 2));
        throw new Error('DeepSeek API 返回格式错误：缺少 content');
      }

      console.log('\n[DeepSeek] ✅ API 调用成功');
      console.log('[DeepSeek] 返回内容长度:', content.length, '字符');
      console.log('[DeepSeek] 返回内容预览:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
      console.log('[DeepSeek] Token 使用:', result.usage || '未提供');
      console.log('========== DeepSeek API 调用结束 ==========\n');

      return content.trim();
    } catch (error: any) {
      console.error('\n[DeepSeek] ❌ API 调用失败:', error.message);
      console.error('[DeepSeek] 错误堆栈:', error.stack);
      console.log('========== DeepSeek API 调用结束（失败）==========\n');
      throw new Error(`DeepSeek API 调用失败: ${error.message}`);
    }
  }

  /**
   * 检查 API 是否可用
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.chat([
        { role: 'user', content: 'Hello' }
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): DeepSeekConfig {
    return { ...this.config };
  }
}
