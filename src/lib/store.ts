import fs from 'fs';
import path from 'path';
import { 
  Conversation, 
  ChatMessage, 
  UsageLog, 
  ApiKeyRecord, 
  ProviderId, 
  KeyStatus,
  PromptVersion,
  ResponseEvaluation,
  BenchmarkTestCase,
  SkillItem,
  WorkspaceConfig,
  FileOperationProposal
} from './types';

interface StoreData {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  customKeys: ApiKeyRecord[];
  keyStateOverrides: Record<string, {
    status: KeyStatus;
    cooldownUntil?: number;
    totalRequests: number;
    totalTokens: number;
    lastError?: string;
    lastUsed?: string;
  }>;
  usageLogs: UsageLog[];
  providerEnabled: Record<ProviderId, boolean>;
  promptVersions: PromptVersion[];
  responseEvaluations: ResponseEvaluation[];
  testCases: BenchmarkTestCase[];
  skills: SkillItem[];
  workspaceConfig: WorkspaceConfig;
  proposals: Record<string, FileOperationProposal>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export const DEFAULT_SYSTEM_PROMPT = `You are an intelligent, helpful, and conversational AI assistant.

Your primary objective is to provide accurate, relevant, natural, and context-aware answers.

COMMUNICATION STYLE:
1. Communicate naturally, like a knowledgeable human assistant.
2. Avoid robotic, repetitive, or unnecessarily formal language.
3. Adapt your tone to the user's communication style and preferred language (e.g. Indonesian or English).
4. Use clear and understandable language.
5. Avoid unnecessary introductions (e.g. "Certainly! I'd be happy to...") and repetitive conclusions.
6. Do not make every answer excessively long; match depth to user need.
7. Use headings, bullet points, code blocks, or tables when they improve clarity.

UNDERSTANDING:
1. Understand the user's actual intent before answering.
2. Consider previous conversation context and summary.
3. Interpret follow-up questions based on the ongoing discussion.
4. Do not assume information that the user has not provided.
5. If an important detail is missing or ambiguous, ask a concise clarification question.
6. Do not answer a different question from the one being asked.

ACCURACY & ANTI-HALLUCINATION:
1. Prioritize factual accuracy over producing a confident-sounding answer.
2. Never fabricate facts, sources, statistics, or capabilities.
3. Clearly state uncertainty when information cannot be verified.
4. Distinguish between facts, assumptions, and recommendations.
5. If reliable information is unavailable, explain the limitation honestly.

CONTEXT MANAGEMENT:
1. Use relevant conversation history effectively.
2. Do not unnecessarily repeat information already discussed.
3. Maintain consistency with previous answers.
4. If the user changes a requirement, follow the latest instruction.

RESPONSE QUALITY & STRATEGY:
1. Answer the user's main question first.
2. For simple queries: give direct, concise answers.
3. For technical questions: provide structured explanations with practical code examples.
4. For troubleshooting: analyze the root cause then offer step-by-step solutions.
5. For comparisons: use clean markdown comparison tables.
6. Break complicated explanations into understandable steps.`;

const DEFAULT_PROMPT_VERSIONS: PromptVersion[] = [
  {
    id: 'pv_blueprint_v1',
    name: 'Blueprint Quality v1.0',
    version: '1.0.0',
    description: 'Structured prompt with anti-hallucination, context awareness, and natural communication rules.',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pv_concise_v1',
    name: 'Ultra Concise & Direct',
    version: '1.0.0',
    description: 'Minimalist mode focusing on brief, highly direct answers with zero filler text.',
    systemPrompt: `You are an expert AI assistant that values speed, precision, and conciseness.
Answer directly without pleasantries, introductions, or disclaimers. Use bullet points or code snippets wherever possible. Prioritize factual correctness.`,
    isActive: false,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_TEST_CASES: BenchmarkTestCase[] = [
  {
    id: 'tc_1',
    category: 'General Question',
    name: 'Pengertian REST API',
    prompt: 'Apa itu REST API dan apa keuntungan utamanya secara singkat?',
    expectedCriteria: 'Jawaban singkat, langsung, tidak bertele-tele, menjelaskan REST dan keuntungannya.',
  },
  {
    id: 'tc_2',
    category: 'Technical Reasoning',
    name: 'Python Exponential Backoff',
    prompt: 'Buatkan fungsi Python sederhana untuk retry panggilan API dengan exponential backoff dan jitter.',
    expectedCriteria: 'Menghasilkan kode Python yang benar dengan `time.sleep`, backoff formula, dan penanganan error.',
  },
  {
    id: 'tc_3',
    category: 'Anti-Hallucination',
    name: 'Pertanyaan Fakta Masa Depan',
    prompt: 'Siapakah presiden terpilih Indonesia pada tahun 2055 dan apa partainya?',
    expectedCriteria: 'Tidak berhalusinasi atau mengarang nama/partai; menyatakan dengan jelas bahwa tahun 2055 belum terjadi.',
  },
  {
    id: 'tc_4',
    category: 'Ambiguity & Clarification',
    name: 'Pertanyaan Ambigu',
    prompt: 'Tolong perbaiki kode saya, kodenya error dan tidak jalan.',
    expectedCriteria: 'Tidak mengarang solusi acak; meminta pengguna membagikan potongan kode dan pesan error terkait.',
  },
  {
    id: 'tc_5',
    category: 'Comparison',
    name: 'Perbandingan SQL vs NoSQL',
    prompt: 'Bandingkan kelebihan dan kekurangan database SQL vs NoSQL dalam bentuk tabel ringkas.',
    expectedCriteria: 'Menyajikan tabel perbandingan yang rapi meliputi schema, scalability, use case, dan performa.',
  },
];

export const DEFAULT_SKILLS: SkillItem[] = [
  {
    id: 'skill_code_reviewer',
    name: 'Code Reviewer & Clean Code Auditor',
    slug: 'code-reviewer',
    description: 'Audits code for bugs, anti-patterns, maintainability, SOLID principles, and performance.',
    tags: ['coding', 'review', 'clean-code', 'quality'],
    isEnabled: true,
    isBuiltIn: true,
    content: `# Skill: Code Reviewer & Clean Code Auditor
When reviewing or generating code:
1. Examine code for potential runtime bugs, unhandled null/undefined states, and edge cases.
2. Ensure adherence to Clean Architecture, SOLID, and DRY principles.
3. Check error handling: ensure errors are caught gracefully and messages are actionable.
4. Verify performance considerations (e.g. N+1 database queries, expensive loops, memory leaks).
5. Provide structured review feedback:
   - 🔴 Critical Issues (Bugs, security, crashes)
   - 🟡 Warnings (Performance, edge cases)
   - 🟢 Suggestions (Readability, idiomatic style, refactoring)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'skill_git_commit',
    name: 'Conventional Commits & Changelog Generator',
    slug: 'git-commit-helper',
    description: 'Generates standard Conventional Commit messages and formatted pull request descriptions.',
    tags: ['git', 'workflow', 'devops'],
    isEnabled: true,
    isBuiltIn: true,
    content: `# Skill: Conventional Commits & Changelog Generator
When asked about git commits, commit messages, or PR descriptions:
1. Follow the Conventional Commits 1.0.0 specification:
   - Format: \`<type>(<scope>): <short description in imperative mood>\`
   - Types: \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`perf\`, \`test\`, \`build\`, \`ci\`, \`chore\`
2. Keep the first line under 72 characters, lowercase type, no period at end.
3. When requested for PR description:
   - Summary of changes
   - Motivation / Problem solved
   - Testing steps performed
   - Breaking changes (if any)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'skill_api_designer',
    name: 'RESTful API & OpenAPI Designer',
    slug: 'api-designer',
    description: 'Designs clean RESTful endpoints, schemas, status codes, and error envelopes.',
    tags: ['api', 'backend', 'architecture', 'rest'],
    isEnabled: true,
    isBuiltIn: true,
    content: `# Skill: RESTful API & OpenAPI Designer
When designing or discussing backend APIs:
1. Use standard plural nouns for resources (e.g., \`/api/users\`, \`/api/orders/:id/items\`).
2. Map HTTP methods correctly: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove).
3. Use standard HTTP status codes (200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests, 500 Server Error).
4. Standardize response payload format:
   - Success: \`{ "success": true, "data": ... }\`
   - Error: \`{ "success": false, "error": "Clear message", "code": "ERROR_CODE" }\`
5. Include pagination, filtering, and sorting conventions where appropriate.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'skill_test_generator',
    name: 'Unit & Integration Test Generator',
    slug: 'test-generator',
    description: 'Writes thorough test suites with positive, negative, boundary cases and mocks.',
    tags: ['testing', 'qa', 'jest', 'vitest', 'pytest'],
    isEnabled: true,
    isBuiltIn: true,
    content: `# Skill: Unit & Integration Test Generator
When writing or advising on tests:
1. Follow the AAA (Arrange, Act, Assert) pattern.
2. Cover 3 main scenarios for any function:
   - Happy Path (valid input yields expected output)
   - Edge Cases (empty lists, 0, null, boundary values, massive strings)
   - Failure / Exception Paths (invalid inputs throw expected error)
3. Mock external dependencies (HTTP calls, DB queries) cleanly.
4. Name test cases descriptively: \`it('should return 400 when email format is invalid')\`.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'skill_security_auditor',
    name: 'OWASP Security & Vulnerability Auditor',
    slug: 'security-auditor',
    description: 'Identifies security vulnerabilities, injection risks, secret leaks, and insecure data handling.',
    tags: ['security', 'owasp', 'audit', 'compliance'],
    isEnabled: true,
    isBuiltIn: true,
    content: `# Skill: OWASP Security & Vulnerability Auditor
When inspecting code or architecture for security:
1. Check for OWASP Top 10 vulnerabilities:
   - SQL Injection & NoSQL Injection (ensure parameterized queries).
   - Cross-Site Scripting (XSS) (ensure HTML escaping/sanitization).
   - Insecure Direct Object References (IDOR) (verify authorization checks).
   - Hardcoded secrets or tokens (ensure env variables / secrets manager).
   - Path Traversal (validate and sanitize file paths).
2. Recommend defense-in-depth countermeasures for any identified risk.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'skill_docs_writer',
    name: 'Technical Documentation & Markdown Writer',
    slug: 'docs-writer',
    description: 'Produces professional technical documentation, setup guides, and mermaid diagrams.',
    tags: ['documentation', 'markdown', 'mermaid', 'guides'],
    isEnabled: true,
    isBuiltIn: true,
    content: `# Skill: Technical Documentation & Markdown Writer
When writing documentation:
1. Use clear, hierarchical headings (#, ##, ###) and table of contents if long.
2. Include installation/prerequisites, step-by-step setup, and configuration tables.
3. Use Mermaid diagrams (sequence, flowchart, or class diagram) to visualize workflows.
4. Format code snippets with correct language tags and helpful comments.
5. Emphasize important notes using alert blockquotes (> [!NOTE], > [!WARNING]).`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  rootPath: '',
  readOnly: false,
  requireConfirmation: true,
  enabled: false,
};

const DEFAULT_STORE: StoreData = {
  conversations: [],
  messages: {},
  customKeys: [],
  keyStateOverrides: {},
  usageLogs: [],
  providerEnabled: {
    groq: true,
    gemini: true,
    openrouter: true,
    cloudflare: true,
    nvidia: true,
  },
  promptVersions: DEFAULT_PROMPT_VERSIONS,
  responseEvaluations: [],
  testCases: DEFAULT_TEST_CASES,
  skills: DEFAULT_SKILLS,
  workspaceConfig: DEFAULT_WORKSPACE_CONFIG,
  proposals: {},
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): StoreData {
  try {
    ensureDataDir();
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return DEFAULT_STORE;
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STORE,
      ...parsed,
      promptVersions: parsed.promptVersions && parsed.promptVersions.length > 0 ? parsed.promptVersions : DEFAULT_PROMPT_VERSIONS,
      testCases: parsed.testCases && parsed.testCases.length > 0 ? parsed.testCases : DEFAULT_TEST_CASES,
      responseEvaluations: parsed.responseEvaluations || [],
      skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : DEFAULT_SKILLS,
      workspaceConfig: parsed.workspaceConfig || DEFAULT_WORKSPACE_CONFIG,
      proposals: parsed.proposals || {},
    };
  } catch (error) {
    console.error('Failed to read store.json, returning defaults:', error);
    return DEFAULT_STORE;
  }
}

function writeStore(data: StoreData) {
  try {
    ensureDataDir();
    // Write atomic with temp file
    const tempFile = `${STORE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORE_FILE);
  } catch (error) {
    console.error('Failed to write store.json:', error);
  }
}

export const db = {
  getStore(): StoreData {
    return readStore();
  },

  // Conversations
  getConversations(): Conversation[] {
    const store = readStore();
    return store.conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  getConversation(id: string): Conversation | undefined {
    const store = readStore();
    return store.conversations.find((c) => c.id === id);
  },

  saveConversation(conv: Conversation): Conversation {
    const store = readStore();
    const index = store.conversations.findIndex((c) => c.id === conv.id);
    if (index >= 0) {
      store.conversations[index] = conv;
    } else {
      store.conversations.unshift(conv);
    }
    writeStore(store);
    return conv;
  },

  deleteConversation(id: string): boolean {
    const store = readStore();
    store.conversations = store.conversations.filter((c) => c.id !== id);
    delete store.messages[id];
    writeStore(store);
    return true;
  },

  // Messages
  getMessages(conversationId: string): ChatMessage[] {
    const store = readStore();
    return store.messages[conversationId] || [];
  },

  addMessage(conversationId: string, message: ChatMessage): ChatMessage {
    const store = readStore();
    if (!store.messages[conversationId]) {
      store.messages[conversationId] = [];
    }
    store.messages[conversationId].push(message);

    // Update conversation metadata
    const convIndex = store.conversations.findIndex((c) => c.id === conversationId);
    if (convIndex >= 0) {
      store.conversations[convIndex].updatedAt = new Date().toISOString();
      store.conversations[convIndex].messageCount = store.messages[conversationId].length;
      if (store.conversations[convIndex].title === 'Percakapan Baru' && message.role === 'user') {
        store.conversations[convIndex].title = message.content.slice(0, 36) + (message.content.length > 36 ? '...' : '');
      }
    }

    writeStore(store);
    return message;
  },

  // Usage Logs
  getUsageLogs(limit = 100): UsageLog[] {
    const store = readStore();
    return store.usageLogs.slice(-limit).reverse();
  },

  addUsageLog(log: UsageLog): UsageLog {
    const store = readStore();
    store.usageLogs.push(log);
    // Keep last 1000 logs
    if (store.usageLogs.length > 1000) {
      store.usageLogs = store.usageLogs.slice(-1000);
    }
    writeStore(store);
    return log;
  },

  // Key state overrides & custom keys
  getKeyStateOverrides() {
    return readStore().keyStateOverrides;
  },

  updateKeyState(keyId: string, updates: Partial<StoreData['keyStateOverrides'][string]>) {
    const store = readStore();
    store.keyStateOverrides[keyId] = {
      ...(store.keyStateOverrides[keyId] || {
        status: 'ACTIVE',
        totalRequests: 0,
        totalTokens: 0,
      }),
      ...updates,
    };
    writeStore(store);
  },

  getCustomKeys(): ApiKeyRecord[] {
    return readStore().customKeys;
  },

  saveCustomKey(key: ApiKeyRecord): ApiKeyRecord {
    const store = readStore();
    const idx = store.customKeys.findIndex((k) => k.id === key.id);
    if (idx >= 0) {
      store.customKeys[idx] = key;
    } else {
      store.customKeys.push(key);
    }
    writeStore(store);
    return key;
  },

  deleteCustomKey(keyId: string): boolean {
    const store = readStore();
    store.customKeys = store.customKeys.filter((k) => k.id !== keyId);
    delete store.keyStateOverrides[keyId];
    writeStore(store);
    return true;
  },

  // Provider states
  getProviderEnabled(): Record<ProviderId, boolean> {
    return readStore().providerEnabled;
  },

  setProviderEnabled(provider: ProviderId, enabled: boolean) {
    const store = readStore();
    store.providerEnabled[provider] = enabled;
    writeStore(store);
  },

  // Conversation Summary
  updateConversationSummary(id: string, summary: string) {
    const store = readStore();
    const conv = store.conversations.find((c) => c.id === id);
    if (conv) {
      conv.summary = summary;
      conv.updatedAt = new Date().toISOString();
      writeStore(store);
    }
  },

  // Prompt Versions
  getPromptVersions(): PromptVersion[] {
    return readStore().promptVersions || DEFAULT_PROMPT_VERSIONS;
  },

  getActivePrompt(): PromptVersion {
    const versions = this.getPromptVersions();
    return versions.find((v) => v.isActive) || versions[0] || DEFAULT_PROMPT_VERSIONS[0];
  },

  savePromptVersion(prompt: PromptVersion): PromptVersion {
    const store = readStore();
    if (!store.promptVersions) store.promptVersions = [...DEFAULT_PROMPT_VERSIONS];
    const idx = store.promptVersions.findIndex((p) => p.id === prompt.id);
    if (idx >= 0) {
      store.promptVersions[idx] = prompt;
    } else {
      store.promptVersions.push(prompt);
    }
    writeStore(store);
    return prompt;
  },

  setActivePrompt(id: string) {
    const store = readStore();
    if (!store.promptVersions) store.promptVersions = [...DEFAULT_PROMPT_VERSIONS];
    store.promptVersions = store.promptVersions.map((p) => ({
      ...p,
      isActive: p.id === id,
    }));
    writeStore(store);
  },

  // Response Evaluations
  getResponseEvaluations(): ResponseEvaluation[] {
    return readStore().responseEvaluations || [];
  },

  addResponseEvaluation(evaluation: ResponseEvaluation): ResponseEvaluation {
    const store = readStore();
    if (!store.responseEvaluations) store.responseEvaluations = [];
    store.responseEvaluations.push(evaluation);

    // Also attach to message if found
    const msgs = store.messages[evaluation.conversationId];
    if (msgs) {
      const msg = msgs.find((m) => m.id === evaluation.messageId);
      if (msg) {
        msg.evaluation = evaluation;
      }
    }

    writeStore(store);
    return evaluation;
  },

  // Test Cases
  getTestCases(): BenchmarkTestCase[] {
    return readStore().testCases || DEFAULT_TEST_CASES;
  },

  // Skills
  getSkills(): SkillItem[] {
    return readStore().skills || DEFAULT_SKILLS;
  },

  getActiveSkills(): SkillItem[] {
    return this.getSkills().filter((s) => s.isEnabled);
  },

  getSkill(idOrSlug: string): SkillItem | undefined {
    return this.getSkills().find((s) => s.id === idOrSlug || s.slug === idOrSlug);
  },

  saveSkill(skill: SkillItem): SkillItem {
    const store = readStore();
    if (!store.skills) store.skills = [...DEFAULT_SKILLS];
    const idx = store.skills.findIndex((s) => s.id === skill.id || s.slug === skill.slug);
    if (idx >= 0) {
      store.skills[idx] = { ...skill, updatedAt: new Date().toISOString() };
    } else {
      store.skills.push(skill);
    }
    writeStore(store);
    return skill;
  },

  toggleSkill(id: string, isEnabled: boolean): boolean {
    const store = readStore();
    if (!store.skills) store.skills = [...DEFAULT_SKILLS];
    const skill = store.skills.find((s) => s.id === id);
    if (skill) {
      skill.isEnabled = isEnabled;
      skill.updatedAt = new Date().toISOString();
      writeStore(store);
      return true;
    }
    return false;
  },

  deleteSkill(id: string): boolean {
    const store = readStore();
    if (!store.skills) store.skills = [...DEFAULT_SKILLS];
    store.skills = store.skills.filter((s) => s.id !== id);
    writeStore(store);
    return true;
  },

  resetSkillsToDefault(): SkillItem[] {
    const store = readStore();
    store.skills = [...DEFAULT_SKILLS];
    writeStore(store);
    return DEFAULT_SKILLS;
  },

  // Workspace Configuration
  getWorkspaceConfig(): WorkspaceConfig {
    const cfg = readStore().workspaceConfig;
    return { ...DEFAULT_WORKSPACE_CONFIG, ...(cfg || {}) };
  },

  updateWorkspaceConfig(updates: Partial<WorkspaceConfig>): WorkspaceConfig {
    const store = readStore();
    store.workspaceConfig = {
      ...(store.workspaceConfig || DEFAULT_WORKSPACE_CONFIG),
      ...updates,
    };
    writeStore(store);
    return store.workspaceConfig;
  },

  // File Operation Proposals
  saveProposal(proposal: FileOperationProposal): FileOperationProposal {
    const store = readStore();
    if (!store.proposals) store.proposals = {};
    store.proposals[proposal.id] = proposal;
    writeStore(store);
    return proposal;
  },

  getProposal(id: string): FileOperationProposal | undefined {
    return readStore().proposals?.[id];
  },

  getProposals(conversationId?: string): FileOperationProposal[] {
    const all = Object.values(readStore().proposals || {});
    if (conversationId) {
      return all.filter((p) => p.conversationId === conversationId);
    }
    return all;
  },
};

