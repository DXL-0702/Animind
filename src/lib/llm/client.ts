import type { LLMRequest, LLMResponse, LLMProvider } from './types';

// LLM客户端 - 调用自家Serverless代理
export class LLMClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async chat(request: LLMRequest, preferredProvider?: LLMProvider): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          provider: preferredProvider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'LLM request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('LLM client error:', error);
      throw error;
    }
  }

  // 流式响应（用于实时对话）
  async chatStream(
    request: LLMRequest,
    onChunk: (chunk: string) => void,
    preferredProvider?: LLMProvider
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        stream: true,
        provider: preferredProvider,
      }),
    });

    if (!response.ok) {
      throw new Error('Stream request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }
}

// 默认客户端实例
export const llmClient = new LLMClient();
