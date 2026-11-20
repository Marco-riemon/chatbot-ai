import { ToolExecutionResult } from './types';

export interface ValidatedResponseResult {
  content: string;
  isValid: boolean;
  warning?: string;
}

export class ResponseValidator {
  public static validateAndFormat(
    rawContent: string,
    toolsUsed?: ToolExecutionResult[]
  ): ValidatedResponseResult {
    if (!rawContent || !rawContent.trim()) {
      return {
        content: 'Maaf, model tidak menghasilkan respons. Silakan coba kembali.',
        isValid: false,
        warning: 'Empty response returned from model',
      };
    }

    let cleaned = rawContent.trim();

    // 1. Strip repetitive robotic filler beginnings if model generated them
    cleaned = cleaned.replace(/^(Certainly!?|Sure!?|Of course!?|As an AI language model,?\s*)\s*/i, '');

    // 2. Append tool verified sources/citations cleanly if tools were executed
    if (toolsUsed && toolsUsed.length > 0) {
      const allSources: { title: string; url?: string; snippet?: string }[] = [];
      for (const t of toolsUsed) {
        if (t.sources) {
          allSources.push(...t.sources);
        }
      }

      if (allSources.length > 0) {
        const citations = allSources
          .map((s, idx) => {
            if (s.url) {
              return `${idx + 1}. [${s.title}](${s.url})`;
            }
            return `${idx + 1}. **${s.title}**`;
          })
          .join('\n');

        cleaned += `\n\n---\n**📚 Sumber & Referensi Terverifikasi:**\n${citations}`;
      }
    }

    return {
      content: cleaned,
      isValid: true,
    };
  }
}

