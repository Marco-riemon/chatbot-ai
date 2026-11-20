import { ChatMessage, KeyStatus, ModelInfo } from '../types';

export interface SendMessageOptions {
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface AdapterResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface AdapterErrorDetails {
  httpStatus?: number;
  keyStatus: KeyStatus;
  message: string;
  isRetryable: boolean;
  cooldownSeconds?: number;
}

export interface IProviderAdapter {
  readonly id: string;
  sendMessage(
    apiKeySecret: string,
    model: string,
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    options?: SendMessageOptions
  ): Promise<AdapterResult>;

  listModels?(apiKeySecret: string): Promise<ModelInfo[]>;
  checkConnection(apiKeySecret: string): Promise<{ success: boolean; latencyMs: number; error?: string }>;
  classifyError(error: any, httpStatus?: number): AdapterErrorDetails;
}

export function classifyHttpError(error: any, httpStatus?: number): AdapterErrorDetails {
  const status = httpStatus || error.status || error.statusCode || 500;
  const msg = error.message || String(error);
  const lowerMsg = msg.toLowerCase();

  if (status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
    return {
      httpStatus: 429,
      keyStatus: 'RATE_LIMITED',
      message: msg,
      isRetryable: true,
      cooldownSeconds: 60,
    };
  }

  if (
    status === 402 || 
    lowerMsg.includes('quota') || 
    lowerMsg.includes('insufficient_quota') || 
    lowerMsg.includes('credit') ||
    lowerMsg.includes('balance')
  ) {
    return {
      httpStatus: status,
      keyStatus: 'QUOTA_EXHAUSTED',
      message: msg,
      isRetryable: false,
    };
  }

  if (status === 401 || lowerMsg.includes('invalid api key') || lowerMsg.includes('unauthorized')) {
    return {
      httpStatus: 401,
      keyStatus: 'INVALID',
      message: msg,
      isRetryable: false,
    };
  }

  if (status === 403 || lowerMsg.includes('forbidden') || lowerMsg.includes('access denied')) {
    // If it's a model not found / model access error, it's not an invalid key problem
    if (lowerMsg.includes('model') && (lowerMsg.includes('not exist') || lowerMsg.includes('not found') || lowerMsg.includes('access to it'))) {
      return {
        httpStatus: 404,
        keyStatus: 'ACTIVE',
        message: msg,
        isRetryable: false,
      };
    }
    return {
      httpStatus: 403,
      keyStatus: 'INVALID',
      message: msg,
      isRetryable: false,
    };
  }

  if (status === 404 || (lowerMsg.includes('model') && (lowerMsg.includes('not exist') || lowerMsg.includes('not found')))) {
    return {
      httpStatus: 404,
      keyStatus: 'ACTIVE',
      message: msg,
      isRetryable: false,
    };
  }

  // If it is a client/request-level error (400 Bad Request, formatting, prompt issue, tool use failed)
  // this is NOT a faulty API key or quota issue. Keep key ACTIVE so subsequent requests are not blocked.
  if (status === 400 || lowerMsg.includes('tool choice is none') || lowerMsg.includes('tool_use_failed')) {
    return {
      httpStatus: 400,
      keyStatus: 'ACTIVE',
      message: msg,
      isRetryable: false,
    };
  }

  if (status >= 500) {
    return {
      httpStatus: status,
      keyStatus: 'ERROR',
      message: msg,
      isRetryable: true,
      cooldownSeconds: 15,
    };
  }

  return {
    httpStatus: status,
    keyStatus: 'ERROR',
    message: msg,
    isRetryable: false,
  };
}

