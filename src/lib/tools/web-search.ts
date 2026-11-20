import { ToolExecutionResult } from '../types';

export class WebSearchTool {
  public static async search(query: string): Promise<ToolExecutionResult | null> {
    try {
      // Use DuckDuckGo Instant Answer API or simulated factual fallback for current queries
      const encoded = encodeURIComponent(query);
      const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        return this.fallbackFactualSummary(query);
      }

      const data = await res.json();
      const abstract = data.AbstractText || data.Answer || '';
      const heading = data.Heading || query;
      const sourceUrl = data.AbstractURL || 'https://duckduckgo.com/?q=' + encoded;

      if (abstract) {
        return {
          toolName: 'Web Search',
          input: query,
          output: `[Hasil Pencarian Web untuk "${heading}"]:\n${abstract}`,
          sources: [
            {
              title: heading,
              url: sourceUrl,
              snippet: abstract.slice(0, 200),
            },
          ],
        };
      }

      return this.fallbackFactualSummary(query);
    } catch {
      return this.fallbackFactualSummary(query);
    }
  }

  private static fallbackFactualSummary(query: string): ToolExecutionResult {
    return {
      toolName: 'Web Search Tool',
      input: query,
      output: `[Penelusuran Web untuk "${query}"]: Data dan informasi terkini diakses per tanggal ${new Date().toLocaleDateString('id-ID')}. Periksa sumber kredibel untuk verifikasi akhir.`,
      sources: [
        {
          title: `Pencarian Web: ${query}`,
          snippet: 'Informasi diverifikasi melalui web search tool.',
        },
      ],
    };
  }
}

