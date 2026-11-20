import { IProviderAdapter, SendMessageOptions, AdapterResult, classifyHttpError, AdapterErrorDetails } from './base';
import { ChatMessage } from '../types';

export class NvidiaAdapter implements IProviderAdapter {
  readonly id = 'nvidia';
  private baseUrl = 'https://integrate.api.nvidia.com/v1';

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
        },
        body: JSON.stringify({
          model: model || 'meta/llama-3.1-8b-instruct',
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens || 1024,
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
        const errorMsg = errBody?.detail || errBody?.error?.message || `NVIDIA NIM Error (${res.status})`;
        const err: any = new Error(errorMsg);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '(No content)';
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
        const timeoutErr: any = new Error(`NVIDIA request timed out after ${timeout}ms`);
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw error;
    }
  }

  async checkConnection(apiKeySecret: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKeySecret}` },
      });
      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return { success: false, latencyMs, error: `HTTP ${res.status}` };
      }
      return { success: true, latencyMs };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - startTime, error: err.message };
    }
  }

  classifyError(error: any, httpStatus?: number): AdapterErrorDetails {
    return classifyHttpError(error, httpStatus);
  }
}

