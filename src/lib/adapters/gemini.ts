import { IProviderAdapter, SendMessageOptions, AdapterResult, classifyHttpError, AdapterErrorDetails } from './base';
import { ChatMessage, ModelInfo } from '../types';

export class GeminiAdapter implements IProviderAdapter {
  readonly id = 'gemini';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async sendMessage(
    apiKeySecret: string,
    model: string,
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    options?: SendMessageOptions
  ): Promise<AdapterResult> {
    const startTime = Date.now();
    const timeout = options?.timeoutMs || 30000;
    const cleanModel = model.replace(/^models\//, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      // Extract system instructions if any, or format conversation
      let systemInstruction: { parts: { text: string }[] } | undefined;
      const geminiContents: { role: string; parts: { text: string }[] }[] = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemInstruction = { parts: [{ text: msg.content }] };
        } else {
          geminiContents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      if (geminiContents.length === 0) {
        geminiContents.push({ role: 'user', parts: [{ text: 'Halo' }] });
      }

      const body: any = {
        contents: geminiContents,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
        },
      };

      if (options?.maxTokens) {
        body.generationConfig.maxOutputTokens = options.maxTokens;
      }
      if (systemInstruction) {
        body.systemInstruction = systemInstruction;
      }

      const url = `${this.baseUrl}/models/${cleanModel || 'gemini-2.0-flash'}:generateContent?key=${apiKeySecret}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        const errorMsg = errBody?.error?.message || `Gemini API Error (${res.status})`;
        const err: any = new Error(errorMsg);
        err.status = res.status;
        err.statusText = errBody?.error?.status;
        throw err;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '(No text returned by Gemini)';
      const latencyMs = Date.now() - startTime;

      const usage = {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      };

      return {
        content: text,
        usage,
        latencyMs,
      };
    } catch (error: any) {
      clearTimeout(timer);
      if (error.name === 'AbortError') {
        const timeoutErr: any = new Error(`Gemini request timed out after ${timeout}ms`);
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw error;
    }
  }

  async checkConnection(apiKeySecret: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    try {
      const url = `${this.baseUrl}/models?key=${apiKeySecret}`;
      const res = await fetch(url);
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
      const res = await fetch(`${this.baseUrl}/models?key=${apiKeySecret}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
          provider: 'gemini' as const,
          category: m.name.includes('flash') ? 'Fast Response' : 'Reasoning',
          contextWindow: m.inputTokenLimit || 1048576,
          isActive: true,
        }));
    } catch {
      return [];
    }
  }

  classifyError(error: any, httpStatus?: number): AdapterErrorDetails {
    if (error?.statusText === 'RESOURCE_EXHAUSTED' || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return {
        httpStatus: 429,
        keyStatus: 'RATE_LIMITED',
        message: error.message,
        isRetryable: true,
        cooldownSeconds: 60,
      };
    }
    return classifyHttpError(error, httpStatus);
  }
}

