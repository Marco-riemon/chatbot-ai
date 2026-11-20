import { IProviderAdapter, SendMessageOptions, AdapterResult, classifyHttpError, AdapterErrorDetails } from './base';
import { ChatMessage, ModelInfo } from '../types';

export class GroqAdapter implements IProviderAdapter {
  readonly id = 'groq';
  private baseUrl = 'https://api.groq.com/openai/v1';

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
      const formattedMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKeySecret}`,
        },
        body: JSON.stringify({
          model: model || 'openai/gpt-oss-20b',
          messages: formattedMessages,
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
        const errorMsg = errBody?.error?.message || errBody?.message || `Groq API Error (${res.status})`;
        const err: any = new Error(errorMsg);
        err.status = res.status;
        err.code = errBody?.error?.code;
        throw err;
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content || choice?.message?.reasoning || '(No response received)';
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
        const timeoutErr: any = new Error(`Groq request timed out after ${timeout}ms`);
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
        headers: {
          Authorization: `Bearer ${apiKeySecret}`,
        },
      });
      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: false,
          latencyMs,
          error: data?.error?.message || `HTTP ${res.status}`,
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

  async listModels(apiKeySecret: string): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKeySecret}`,
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || [])
        .filter((m: any) => !m.id.includes('whisper') && !m.id.includes('guard'))
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          provider: 'groq' as const,
          category: m.id.includes('20b') || m.id.includes('instant') ? 'Fast Response' : 'General Purpose',
          contextWindow: m.context_window || 128000,
          isActive: true,
        }));
    } catch {
      return [];
    }
  }

  classifyError(error: any, httpStatus?: number): AdapterErrorDetails {
    return classifyHttpError(error, httpStatus);
  }
}

