import { IntentAnalysis, ToolExecutionResult, FileOperationProposal } from '../types';
import { CalculatorTool } from './calculator';
import { KnowledgeRetrievalTool } from './knowledge-retrieval';
import { WebSearchTool } from './web-search';
import { FilesystemTool } from './filesystem';

export interface ToolExecutionPackage {
  toolsUsed: ToolExecutionResult[];
  proposals: FileOperationProposal[];
}

export async function executeRequiredTools(
  analysis: IntentAnalysis,
  userQuery: string,
  conversationId?: string
): Promise<ToolExecutionPackage> {
  const toolsUsed: ToolExecutionResult[] = [];
  const proposals: FileOperationProposal[] = [];
  const required = analysis.requiresTools || [];

  for (const toolName of required) {
    if (toolName === 'calculator') {
      const calcResult = CalculatorTool.execute(userQuery);
      if (calcResult) toolsUsed.push(calcResult);
    } else if (toolName === 'knowledge_retrieval') {
      const docResult = KnowledgeRetrievalTool.search(userQuery);
      if (docResult) toolsUsed.push(docResult);
    } else if (toolName === 'web_search') {
      const webResult = await WebSearchTool.search(userQuery);
      if (webResult) toolsUsed.push(webResult);
    } else if (toolName === 'filesystem_list') {
      const listResult = FilesystemTool.listDirectory();
      toolsUsed.push(listResult);
    } else if (toolName === 'filesystem_read' && analysis.detectedTargetFile) {
      const readResult = FilesystemTool.readFile(analysis.detectedTargetFile);
      toolsUsed.push(readResult);
    } else if (toolName === 'filesystem_write' && analysis.detectedTargetFile) {
      const target = analysis.detectedTargetFile;
      const lower = userQuery.toLowerCase();

      // Extract content from code block if present
      const codeBlockMatch = userQuery.match(/```(?:[a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/);
      const extractedContent = codeBlockMatch ? codeBlockMatch[1] : '';

      if (lower.includes('hapus') || lower.includes('delete')) {
        const { toolResult, proposal } = FilesystemTool.proposeDeleteFile(target, conversationId);
        toolsUsed.push(toolResult);
        if (proposal) proposals.push(proposal);
      } else if (lower.includes('edit') || lower.includes('ubah') || lower.includes('ganti')) {
        const { toolResult, proposal } = FilesystemTool.proposeEditFile(target, extractedContent, conversationId);
        toolsUsed.push(toolResult);
        if (proposal) proposals.push(proposal);
      } else {
        // Create file
        const { toolResult, proposal } = FilesystemTool.proposeCreateFile(target, extractedContent, conversationId);
        toolsUsed.push(toolResult);
        if (proposal) proposals.push(proposal);
      }
    }
  }

  return { toolsUsed, proposals };
}
