import { ChatMessage, Conversation } from './types';
import { db } from './store';

export interface ValidatedInput {
  isValid: boolean;
  sanitizedContent: string;
  error?: string;
}

export class ContextManager {
  private static instance: ContextManager;

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  // 1. Input Validation
  public validateInput(content: string, maxLength = 16000): ValidatedInput {
    if (!content || typeof content !== 'string') {
      return { isValid: false, sanitizedContent: '', error: 'Pesan tidak boleh kosong.' };
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { isValid: false, sanitizedContent: '', error: 'Pesan tidak boleh hanya berisi spasi.' };
    }

    if (trimmed.length > maxLength) {
      return {
        isValid: false,
        sanitizedContent: trimmed.slice(0, maxLength),
        error: `Pesan melebihi batas maksimum (${maxLength} karakter).`,
      };
    }

    return { isValid: true, sanitizedContent: trimmed };
  }

  // 2. Build Structured Messages with System Prompt, Summary & Sliding Window
  public prepareMessagesForModel(
    conversationId: string | undefined,
    incomingMessages: Pick<ChatMessage, 'role' | 'content'>[],
    maxRecentTurns = 8
  ): Pick<ChatMessage, 'role' | 'content'>[] {
    const activePrompt = db.getActivePrompt();
    let systemInstruction = activePrompt.systemPrompt;

    // Inject Active Skills (Markdown skill instructions)
    const activeSkills = db.getActiveSkills();
    if (activeSkills.length > 0) {
      const skillsBlock = activeSkills
        .map((s) => `### Active Skill: ${s.name}\n${s.content}`)
        .join('\n\n');
      systemInstruction += `\n\n[SPECIALIZED CAPABILITIES & SKILLS]:\n${skillsBlock}`;
    }

    // Inject Workspace Context
    const wsConfig = db.getWorkspaceConfig();
    if (wsConfig.enabled && wsConfig.rootPath) {
      systemInstruction += `\n\n[LOCAL WORKSPACE]: Current allowed project directory: "${wsConfig.rootPath}" (Mode: ${wsConfig.readOnly ? 'Read-Only' : 'Interactive Confirmation'}). You can read, inspect, create, edit, or delete files in this workspace. Any modifying action will generate an interactive confirmation proposal for the user.\nNotice: Do not output raw tool-call JSON structures or pseudo tool syntax in your text response. Answer directly in natural language markdown.`;
    }

    // Retrieve conversation metadata and existing summary if available
    let conversation: Conversation | undefined;
    if (conversationId) {
      conversation = db.getConversation(conversationId);
      if (conversation?.summary) {
        systemInstruction += `\n\n[CONVERSATION SUMMARY - PREVIOUS CONTEXT]:\n${conversation.summary}`;
      }
    }

    // Separate any system messages from user/assistant turns
    const userAndAssistantTurns: Pick<ChatMessage, 'role' | 'content'>[] = [];
    for (const msg of incomingMessages) {
      if (msg.role === 'system') {
        // Append custom user system instructions
        systemInstruction += `\n\n[ADDITIONAL INSTRUCTION]:\n${msg.content}`;
      } else {
        userAndAssistantTurns.push({
          role: msg.role,
          content: msg.content.trim(),
        });
      }
    }

    // Apply Sliding Window: retain the last N messages
    const windowedTurns = userAndAssistantTurns.slice(-maxRecentTurns);

    // Ensure role integrity (no consecutive identical roles if possible)
    const cleanedTurns: Pick<ChatMessage, 'role' | 'content'>[] = [];
    for (const turn of windowedTurns) {
      if (cleanedTurns.length > 0 && cleanedTurns[cleanedTurns.length - 1].role === turn.role) {
        // Merge consecutive messages from same role to maintain strict alternation
        cleanedTurns[cleanedTurns.length - 1].content += `\n\n${turn.content}`;
      } else {
        cleanedTurns.push({ ...turn });
      }
    }

    // Ensure first turn after system is 'user'
    if (cleanedTurns.length > 0 && cleanedTurns[0].role !== 'user') {
      cleanedTurns.shift();
    }

    return [
      { role: 'system', content: systemInstruction },
      ...cleanedTurns,
    ];
  }

  // 3. Compact Conversation Summarizer
  public updateSummaryIfAppropriate(conversationId: string, allMessages: ChatMessage[]) {
    if (!conversationId || allMessages.length < 6) return;

    // Check if summary update is needed (e.g. every 4 new messages)
    const conversation = db.getConversation(conversationId);
    if (!conversation) return;

    const userQuestions = allMessages
      .filter((m) => m.role === 'user')
      .map((m) => `• ${m.content.slice(0, 80)}`)
      .slice(-6);

    const summaryText = `Diskusi berfokus pada:\n${userQuestions.join('\n')}\nTotal percakapan: ${allMessages.length} pesan.`;
    db.updateConversationSummary(conversationId, summaryText);
  }
}

export const contextManager = ContextManager.getInstance();

