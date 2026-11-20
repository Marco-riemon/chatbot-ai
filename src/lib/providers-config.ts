import { ProviderConfig, ModelInfo } from './types';

export const PROVIDERS_CONFIG: Record<string, ProviderConfig> = {
  groq: {
    id: 'groq',
    name: 'Groq',
    website: 'https://groq.com',
    docsUrl: 'https://console.groq.com/docs',
    consoleUrl: 'https://console.groq.com',
    description: 'Ultra-fast LPU inference engine for open-source AI models.',
    isEnabled: true,
    defaultModel: 'openai/gpt-oss-20b',
    priorityOrder: 1,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    website: 'https://deepmind.google/technologies/gemini/',
    docsUrl: 'https://ai.google.dev/docs',
    consoleUrl: 'https://aistudio.google.com/',
    description: 'Multimodal AI models by Google with generous free tier allowances.',
    isEnabled: true,
    defaultModel: 'gemini-2.0-flash',
    priorityOrder: 2,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    website: 'https://openrouter.ai',
    docsUrl: 'https://openrouter.ai/docs',
    consoleUrl: 'https://openrouter.ai/keys',
    description: 'Unified AI gateway aggregating 200+ models with free models available.',
    isEnabled: true,
    defaultModel: 'meta-llama/llama-3.2-3b-instruct:free',
    priorityOrder: 3,
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    website: 'https://developers.cloudflare.com/workers-ai/',
    docsUrl: 'https://developers.cloudflare.com/workers-ai/models/',
    consoleUrl: 'https://dash.cloudflare.com/',
    description: 'Serverless GPU inference running directly on Cloudflare global edge network.',
    isEnabled: true,
    defaultModel: '@cf/meta/llama-3-8b-instruct',
    priorityOrder: 4,
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    website: 'https://build.nvidia.com/',
    docsUrl: 'https://docs.api.nvidia.com/nim/',
    consoleUrl: 'https://build.nvidia.com/',
    description: 'Optimized inference microservices running on NVIDIA AI Enterprise infrastructure.',
    isEnabled: true,
    defaultModel: 'meta/llama-3.1-8b-instruct',
    priorityOrder: 5,
  },
};

export const DEFAULT_MODELS: ModelInfo[] = [
  // Groq Models
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B (Groq)',
    provider: 'groq',
    category: 'Fast Response',
    contextWindow: 128000,
    description: 'Ultra-fast open weight reasoning & chat model hosted on Groq LPU.',
    isActive: true,
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B (Groq)',
    provider: 'groq',
    category: 'Reasoning',
    contextWindow: 128000,
    description: 'Advanced reasoning and multilingual model hosted on Groq.',
    isActive: true,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B (Groq)',
    provider: 'groq',
    category: 'General Purpose',
    contextWindow: 128000,
    description: 'High-capability dense model for complex instructions.',
    isActive: true,
  },
  {
    id: 'allam-2-7b',
    name: 'Allam 2 7B (Groq)',
    provider: 'groq',
    category: 'Lightweight',
    contextWindow: 8192,
    description: 'Lightweight fast response model.',
    isActive: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant (Groq)',
    provider: 'groq',
    category: 'Fast Response',
    contextWindow: 128000,
    description: 'Fast instruction-following model on Groq.',
    isActive: true,
  },

  // Gemini Models
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    category: 'Fast Response',
    contextWindow: 1048576,
    description: 'Next-gen multimodal model with massive 1M token context.',
    isActive: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    category: 'General Purpose',
    contextWindow: 1048576,
    description: 'Fast and versatile performance for high frequency tasks.',
    isActive: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    category: 'Reasoning',
    contextWindow: 2097152,
    description: 'State-of-the-art model for complex reasoning and large context.',
    isActive: true,
  },

  // OpenRouter Free Models
  {
    id: 'meta-llama/llama-3.2-3b-instruct:free',
    name: 'Llama 3.2 3B Instruct (Free)',
    provider: 'openrouter',
    category: 'Fast Response',
    contextWindow: 131072,
    description: 'Free tier open access model via OpenRouter API.',
    isActive: true,
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Exp (Free)',
    provider: 'openrouter',
    category: 'General Purpose',
    contextWindow: 1048576,
    description: 'Free experimental Gemini 2.0 Flash via OpenRouter.',
    isActive: true,
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 (Free)',
    provider: 'openrouter',
    category: 'Reasoning',
    contextWindow: 65536,
    description: 'Open-weights reasoning model with chain-of-thought.',
    isActive: true,
  },

  // Cloudflare Workers AI
  {
    id: '@cf/meta/llama-3-8b-instruct',
    name: 'Cloudflare Llama 3 8B',
    provider: 'cloudflare',
    category: 'General Purpose',
    contextWindow: 8192,
    description: 'Meta Llama 3 running on Cloudflare serverless edge GPUs.',
    isActive: true,
  },
  {
    id: '@cf/mistral/mistral-7b-instruct-v0.2',
    name: 'Cloudflare Mistral 7B',
    provider: 'cloudflare',
    category: 'Lightweight',
    contextWindow: 8192,
    description: 'Mistral 7B Instruct running on Cloudflare.',
    isActive: true,
  },

  // NVIDIA NIM
  {
    id: 'meta/llama-3.1-8b-instruct',
    name: 'NVIDIA Llama 3.1 8B',
    provider: 'nvidia',
    category: 'Fast Response',
    contextWindow: 128000,
    description: 'NVIDIA NIM accelerated Llama 3.1 8B Instruct.',
    isActive: true,
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    name: 'NVIDIA Nemotron 70B',
    provider: 'nvidia',
    category: 'Reasoning',
    contextWindow: 128000,
    description: 'NVIDIA customized Nemotron for high accuracy reasoning.',
    isActive: true,
  },
];

export function isModelSupportedByProvider(modelId: string, provider: string): boolean {
  return DEFAULT_MODELS.some((m) => m.id === modelId && m.provider === provider && m.isActive);
}


