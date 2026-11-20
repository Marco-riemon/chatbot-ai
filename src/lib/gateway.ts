import { 
  ProviderId, 
  ChatMessage, 
  NormalizedChatResponse, 
  FailoverStep, 
  UsageLog,
  ToolExecutionResult,
  FileOperationProposal
} from './types';
import { keyManager } from './key-manager';
import { providerManager } from './provider-manager';
import { db } from './store';
import { contextManager } from './context-manager';
import { intentRouter } from './intent-router';
import { executeRequiredTools } from './tools';
import { ResponseValidator } from './response-validator';
import { isModelSupportedByProvider } from './providers-config';

export interface ChatGatewayOptions {
  conversationId?: string;
  preferredProvider?: ProviderId;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetriesPerKey?: number;
}

export class AIGateway {
  private static instance: AIGateway;

  public static getInstance(): AIGateway {
    if (!AIGateway.instance) {
      AIGateway.instance = new AIGateway();
    }
    return AIGateway.instance;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async executeChat(
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    options: ChatGatewayOptions = {}
  ): Promise<NormalizedChatResponse> {
    const overallStartTime = Date.now();
    const failoverTrail: FailoverStep[] = [];

    // 1. Input Validation
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && lastUserMsg.role === 'user') {
      const validation = contextManager.validateInput(lastUserMsg.content);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Pesan input tidak valid.');
      }
      lastUserMsg.content = validation.sanitizedContent;
    }

    // 2. Intent Detection
    const userQuery = lastUserMsg?.content || '';
    const intentAnalysis = intentRouter.analyzeIntent(userQuery);

    // 3. Knowledge Retrieval / Tool Calling Execution (if needed)
    let toolsUsed: ToolExecutionResult[] = [];
    let proposals: FileOperationProposal[] = [];
    if (intentAnalysis.requiresTools && intentAnalysis.requiresTools.length > 0) {
      try {
        const pkg = await executeRequiredTools(intentAnalysis, userQuery, options.conversationId);
        toolsUsed = pkg.toolsUsed;
        proposals = pkg.proposals;
      } catch (toolErr) {
        console.error('Error executing tools:', toolErr);
      }
    }

    // 4. Inject Verified Tool Ground Truth into Context if available
    const enrichedMessages = [...messages];
    if (toolsUsed.length > 0) {
      const toolContextPrompt = toolsUsed
        .map((t) => `[TOOL: ${t.toolName} INPUT: ${t.input}]\nRESULT: ${t.output}`)
        .join('\n\n');

      // Inject as a helper context before user query
      enrichedMessages.splice(enrichedMessages.length - 1, 0, {
        role: 'system',
        content: `VERIFIED KNOWLEDGE & COMPUTATION SOURCES:\n${toolContextPrompt}\n\nUse this accurate verified information to directly answer the user's question without hallucinating.`,
      });
    }

    // 5. Context Manager (Sliding Window, Active System Prompt, Conversation Summary)
    const preparedMessages = contextManager.prepareMessagesForModel(
      options.conversationId,
      enrichedMessages
    );

    // 6. Intelligent Model Routing
    // If user preferred 'auto' or no model specified, recommend based on detected intent
    let targetModel = options.preferredModel;
    if (!targetModel || targetModel === 'auto') {
      const suggested = intentRouter.suggestModelForCategory(intentAnalysis.recommendedCategory);
      if (suggested) {
        targetModel = suggested.id;
      }
    }

    // 7. Determine Provider Order
    const providerOrder = providerManager.getActiveProviderOrder(options.preferredProvider);
    let lastError: any = null;

    // 8. Iterate through providers
    for (const provider of providerOrder) {
      // Find active keys for this provider
      const activeKeys = keyManager.getActiveKeysForProvider(provider);

      if (activeKeys.length === 0) {
        failoverTrail.push({
          provider,
          keyLabel: 'None',
          model: (targetModel && isModelSupportedByProvider(targetModel, provider)) 
            ? targetModel 
            : providerManager.getDefaultModel(provider),
          status: 'FAILED',
          errorMessage: `No active API key found for ${provider} (empty, invalid, or in cooldown)`,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Determine model for this provider (use targetModel only if valid for this provider, else fallback to provider's default)
      let modelToUse = providerManager.getDefaultModel(provider);
      if (targetModel && isModelSupportedByProvider(targetModel, provider)) {
        modelToUse = targetModel;
      }

      const adapter = providerManager.getAdapter(provider);

      // Iterate through available keys (Rotation / Fallback)
      for (const key of activeKeys) {
        const maxRetries = options.maxRetriesPerKey ?? 1;
        let attempt = 0;
        let succeeded = false;

        while (attempt <= maxRetries && !succeeded) {
          attempt++;

          try {
            const result = await adapter.sendMessage(
              key.keySecret,
              modelToUse,
              preparedMessages,
              {
                timeoutMs: options.timeoutMs || 30000,
                temperature: options.temperature ?? 0.7,
                maxTokens: options.maxTokens,
              }
            );

            // SUCCESS!
            keyManager.recordKeySuccess(key.id, result.usage.totalTokens);

            failoverTrail.push({
              provider,
              keyLabel: key.label,
              model: modelToUse,
              status: 'SUCCESS',
              timestamp: new Date().toISOString(),
            });

            const totalLatency = Date.now() - overallStartTime;

            // 9. Response Validation & Formatter
            const validation = ResponseValidator.validateAndFormat(result.content, toolsUsed);

            // Log to usage store
            const usageLog: UsageLog = {
              id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              timestamp: new Date().toISOString(),
              conversationId: options.conversationId,
              provider,
              model: modelToUse,
              keyLabel: key.label,
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
              latencyMs: totalLatency,
              status: failoverTrail.length > 1 ? 'FALLBACK' : 'SUCCESS',
              failoverTrail,
            };
            db.addUsageLog(usageLog);

            // Update conversation summary if appropriate
            if (options.conversationId) {
              const allConvMessages = db.getMessages(options.conversationId);
              contextManager.updateSummaryIfAppropriate(options.conversationId, allConvMessages);
            }

            return {
              content: validation.content,
              provider,
              model: modelToUse,
              keyLabel: key.label,
              intent: intentAnalysis.intent,
              toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
              proposals: proposals.length > 0 ? proposals : undefined,
              usage: result.usage,
              latencyMs: totalLatency,
              failoverTrail,
            };
          } catch (err: any) {
            lastError = err;
            const errorDetails = adapter.classifyError(err, err.status);

            // Record key status failure in KeyManager
            keyManager.recordKeyFailure(
              key.id,
              errorDetails.keyStatus,
              errorDetails.message,
              errorDetails.cooldownSeconds
            );

            failoverTrail.push({
              provider,
              keyLabel: key.label,
              model: modelToUse,
              status: 'FAILED',
              httpStatus: errorDetails.httpStatus,
              errorMessage: `[${errorDetails.keyStatus}] ${errorDetails.message}`,
              timestamp: new Date().toISOString(),
            });

            if (errorDetails.isRetryable && attempt <= maxRetries && errorDetails.keyStatus !== 'RATE_LIMITED') {
              const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
              await this.sleep(backoffMs);
              continue;
            }

            break;
          }
        }
      }
    }

    // All providers and keys failed
    const totalLatency = Date.now() - overallStartTime;
    const errorMsg = lastError?.message || 'All AI providers and API keys failed or were exhausted.';

    db.addUsageLog({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      conversationId: options.conversationId,
      provider: options.preferredProvider || 'groq',
      model: targetModel || 'none',
      keyLabel: 'none',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: totalLatency,
      status: 'ERROR',
      errorMessage: errorMsg,
      failoverTrail,
    });

    const detailedSummary = failoverTrail
      .map((t) => `• ${t.provider} (${t.keyLabel}): ${t.errorMessage || 'Failed'}`)
      .join('\n');

    const aggregateError: any = new Error(
      `Gateway Failover Exhausted: Could not complete request across ${providerOrder.length} providers.\n\nAudit Trail:\n${detailedSummary}`
    );
    aggregateError.failoverTrail = failoverTrail;
    throw aggregateError;
  }
}

export const aiGateway = AIGateway.getInstance();
