import fs from 'fs';
import path from 'path';
import { ToolExecutionResult } from '../types';

interface DocumentChunk {
  fileName: string;
  section: string;
  content: string;
}

export class KnowledgeRetrievalTool {
  private static chunksCache: DocumentChunk[] | null = null;

  private static loadChunks(): DocumentChunk[] {
    if (this.chunksCache) return this.chunksCache;

    const files = ['framework.md', 'quality-blueprint.md', 'README.md'];
    const chunks: DocumentChunk[] = [];

    for (const f of files) {
      const filePath = path.join(process.cwd(), f);
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          // Split by Markdown headings ##
          const sections = raw.split(/\n(?=##?\s)/g);
          for (const sec of sections) {
            const firstLine = sec.split('\n')[0].replace(/^#+\s*/, '').trim();
            chunks.push({
              fileName: f,
              section: firstLine || f,
              content: sec.trim().slice(0, 800), // excerpt
            });
          }
        } catch (e) {
          console.error('Error reading doc:', f, e);
        }
      }
    }

    this.chunksCache = chunks;
    return chunks;
  }

  public static search(query: string, maxResults = 2): ToolExecutionResult | null {
    const chunks = this.loadChunks();
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    if (queryTerms.length === 0) return null;

    // Score chunks based on term occurrences
    const scored = chunks.map((chunk) => {
      let score = 0;
      const lowerContent = chunk.content.toLowerCase();
      const lowerSection = chunk.section.toLowerCase();

      for (const term of queryTerms) {
        if (lowerSection.includes(term)) score += 3;
        if (lowerContent.includes(term)) score += 1;
      }

      return { chunk, score };
    });

    const relevant = scored
      .filter((s) => s.score > 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    if (relevant.length === 0) return null;

    const sources = relevant.map((r) => ({
      title: `${r.chunk.fileName} — ${r.chunk.section}`,
      snippet: r.chunk.content.slice(0, 300) + '...',
    }));

    const outputText = relevant
      .map((r, i) => `[Dokumen: ${r.chunk.fileName} > ${r.chunk.section}]:\n${r.chunk.content}`)
      .join('\n\n');

    return {
      toolName: 'Knowledge Base Retrieval (RAG)',
      input: query,
      output: outputText,
      sources,
    };
  }
}

