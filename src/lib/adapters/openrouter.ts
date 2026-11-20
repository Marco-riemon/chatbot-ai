import { IProviderAdapter, SendMessageOptions, AdapterResult, classifyHttpError, AdapterErrorDetails } from './base';
import { ChatMessage, ModelInfo } from '../types';

export class OpenRouterAdapter implements IProviderAdapter {
  readonly id = 'openrouter';
  private baseUrl = 'https://openrouter.ai/api/v1';

  async sendMessage(
    apiKeySecret: string,
    model: string,
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    options?: SendMessageOptions
  ): Promise<AdapterResult> {
    const startTime = Date.now();
    const timeout = options?.timeoutMs || 30000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKeySecret}`,
          'HTTP-Referer': 'https://github.com/ai-gateway-chatbot',
          'X-Title': 'AI Multi-Provider Gateway',
        },
        body: JSON.stringify({
          model: model || 'meta-llama/llama-3.2-3b-instruct:free',
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        let errBody: any;
        try {
          errBody = await res.json();
        } catch {
          errBody = { message: res.statusText };
        }
        const errorMsg = errBody?.error?.message || `OpenRouter Error (${res.status})`;
        const err: any = new Error(errorMsg);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '(No response)';
      const latencyMs = Date.now() - startTime;

      const usage = {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      };

      return {
        content,
        usage,
        latencyMs,
      };
    } catch (error: any) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        const timeoutErr: any = new Error(`OpenRouter request timed out after ${timeout}ms`);
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw error;
    }
  }

  async checkConnection(apiKeySecret: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/auth/key`, {
        headers: {
          Authorization: `Bearer ${apiKeySecret}`,
        },
      });
      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          error: `HTTP ${res.status}: Unauthorized or Invalid Key`,
        };
      }
      return { success: true, latencyMs };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: err.message || 'Network error',
      };
    }
  }

  classifyError(error: any, httpStatus?: number): AdapterErrorDetails {
    return classifyHttpError(error, httpStatus);
  }
}

