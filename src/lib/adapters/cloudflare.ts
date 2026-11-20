import { IProviderAdapter, SendMessageOptions, AdapterResult, classifyHttpError, AdapterErrorDetails } from './base';
import { ChatMessage } from '../types';

export class CloudflareAdapter implements IProviderAdapter {
  readonly id = 'cloudflare';

  private parseKey(keySecret: string): { token: string; accountId: string } {
    const parts = keySecret.split(':');
    return {
      token: parts[0] || '',
      accountId: parts[1] || process.env.CLOUDFLARE_ACCOUNT_ID || '',
    };
  }

  async sendMessage(
    apiKeySecret: string,
    model: string,
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    options?: SendMessageOptions
  ): Promise<AdapterResult> {
    const startTime = Date.now();
    const timeout = options?.timeoutMs || 30000;
    const { token, accountId } = this.parseKey(apiKeySecret);

    if (!accountId) {
      const err: any = new Error('Cloudflare Account ID is required');
      err.status = 400;
      throw err;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const cleanModel = model || '@cf/meta/llama-3-8b-instruct';
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cleanModel}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
        const errorMsg = errBody?.errors?.[0]?.message || errBody?.message || `Cloudflare AI Error (${res.status})`;
        const err: any = new Error(errorMsg);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const content = data.result?.response || '(No content)';
      const latencyMs = Date.now() - startTime;

      // Cloudflare does not always provide token counts directly, estimate:
      const promptChars = messages.reduce((acc, m) => acc + m.content.length, 0);
      const estPromptTokens = Math.ceil(promptChars / 4);
      const estCompletionTokens = Math.ceil(content.length / 4);

      return {
        content,
        usage: {
          promptTokens: estPromptTokens,
          completionTokens: estCompletionTokens,
          totalTokens: estPromptTokens + estCompletionTokens,
        },
        latencyMs,
      };
    } catch (error: any) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        const timeoutErr: any = new Error(`Cloudflare request timed out after ${timeout}ms`);
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw error;
    }
  }

  async checkConnection(apiKeySecret: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    const { token, accountId } = this.parseKey(apiKeySecret);
    if (!token || !accountId) {
      return { success: false, latencyMs: 0, error: 'Token and Account ID required' };
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return { success: false, latencyMs, error: `HTTP ${res.status}: Invalid Cloudflare credentials` };
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

