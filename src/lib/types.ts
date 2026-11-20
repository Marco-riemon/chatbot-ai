export type ProviderId = 'groq' | 'gemini' | 'openrouter' | 'cloudflare' | 'nvidia';

export type KeyStatus = 
  | 'ACTIVE' 
  | 'RATE_LIMITED' 
  | 'QUOTA_EXHAUSTED' 
  | 'INVALID' 
  | 'DISABLED' 
  | 'ERROR';

export type ModelCategory = 
  | 'Fast Response' 
  | 'General Purpose' 
  | 'Reasoning' 
  | 'Coding' 
  | 'Lightweight';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  category: ModelCategory;
  contextWindow?: number;
  description?: string;
  isActive: boolean;
}

export interface ApiKeyRecord {
  id: string;
  provider: ProviderId;
  label: string;
  keyMasked: string;
  keySecret: string; // Stored server-side only
  status: KeyStatus;
  lastUsed?: string;
  lastError?: string;
  totalRequests: number;
  totalTokens: number;
  cooldownUntil?: number; // epoch ms
  source: 'env' | 'user';
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  website: string;
  docsUrl: string;
  consoleUrl: string;
  description: string;
  isEnabled: boolean;
  defaultModel: string;
  priorityOrder: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  provider?: ProviderId;
  model?: string;
  intent?: UserIntent;
  toolsUsed?: ToolExecutionResult[];
  proposals?: FileOperationProposal[];
  tokens?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  failoverTrail?: FailoverStep[];
  evaluation?: ResponseEvaluation;
}

export interface Conversation {
  id: string;
  title: string;
  summary?: string; // Conversation summary for long context management
  createdAt: string;
  updatedAt: string;
  provider: ProviderId;
  model: string;
  messageCount: number;
}

export interface FailoverStep {
  provider: ProviderId;
  keyLabel: string;
  model: string;
  status: 'FAILED' | 'SUCCESS';
  httpStatus?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface UsageLog {
  id: string;
  timestamp: string;
  conversationId?: string;
  provider: ProviderId;
  model: string;
  keyLabel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: 'SUCCESS' | 'ERROR' | 'FALLBACK';
  errorMessage?: string;
  failoverTrail?: FailoverStep[];
}

export interface NormalizedChatResponse {
  content: string;
  provider: ProviderId;
  model: string;
  keyLabel: string;
  intent?: UserIntent;
  toolsUsed?: ToolExecutionResult[];
  proposals?: FileOperationProposal[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  failoverTrail: FailoverStep[];
}

export interface SkillItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  content: string; // Markdown prompt instructions
  isEnabled: boolean;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceConfig {
  rootPath: string; // Current allowed directory
  readOnly: boolean; // Safe mode toggle
  requireConfirmation: boolean; // Require approval before write/delete
  enabled: boolean; // Master on/off switch
}

export interface FileOperationProposal {
  id: string;
  conversationId?: string;
  action: 'list' | 'read' | 'create' | 'edit' | 'delete';
  filePath: string;
  content?: string;
  diff?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  error?: string;
  timestamp: string;
}

export type UserIntent = 
  | 'general_question' 
  | 'technical_coding' 
  | 'troubleshooting' 
  | 'explanation' 
  | 'recommendation' 
  | 'creative' 
  | 'follow_up' 
  | 'current_info' 
  | 'calculation';

export interface IntentAnalysis {
  intent: UserIntent;
  confidence: number;
  recommendedCategory: ModelCategory;
  requiresTools?: (
    | 'web_search' 
    | 'calculator' 
    | 'knowledge_retrieval' 
    | 'filesystem_list' 
    | 'filesystem_read' 
    | 'filesystem_write'
  )[];
  detectedTargetFile?: string;
  explanation?: string;
}

export interface ToolExecutionResult {
  toolName: string;
  input: any;
  output: string;
  sources?: { title: string; url?: string; snippet?: string }[];
}

export interface PromptVersion {
  id: string;
  name: string;
  version: string;
  description: string;
  systemPrompt: string;
  isActive: boolean;
  createdAt: string;
}

export interface ResponseEvaluation {
  id: string;
  conversationId: string;
  messageId: string;
  provider: ProviderId;
  model: string;
  promptVersion?: string;
  scores: {
    accuracy: number; // 1-5
    relevance: number; // 1-5
    naturalness: number; // 1-5
    contextAwareness: number; // 1-5
    instructionFollowing?: number; // 1-5
  };
  feedback?: string;
  createdAt: string;
}

export interface BenchmarkTestCase {
  id: string;
  category: string;
  name: string;
  prompt: string;
  expectedCriteria: string;
}

export interface BenchmarkResult {
  testCaseId: string;
  testCaseName: string;
  prompt: string;
  provider: ProviderId;
  model: string;
  response: string;
  latencyMs: number;
  tokens: number;
  success: boolean;
  timestamp: string;
}

