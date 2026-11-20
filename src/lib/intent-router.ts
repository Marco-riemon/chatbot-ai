import { UserIntent, IntentAnalysis, ModelCategory, ModelInfo } from './types';
import { DEFAULT_MODELS } from './providers-config';

export class IntentRouter {
  private static instance: IntentRouter;

  public static getInstance(): IntentRouter {
    if (!IntentRouter.instance) {
      IntentRouter.instance = new IntentRouter();
    }
    return IntentRouter.instance;
  }

  public analyzeIntent(text: string): IntentAnalysis {
    const lower = text.toLowerCase().trim();

    // 0. Filesystem Operations (Workspace Exploration, Read, Write, Delete)
    // 0a. List Directory / Show folder contents / What project is here
    const hasListDir = /\b(lihat isi folder|daftar file|list file|tampilkan file|ada file apa|struktur folder|isi direktori|isi folder|list directory|terdapat project apa|ada project apa|project apa saja|proyek apa saja|isi workspace|workspace saat ini|project saat ini|file workspace)\b/.test(lower);
    if (hasListDir) {
      return {
        intent: 'technical_coding',
        confidence: 0.95,
        recommendedCategory: 'Fast Response',
        requiresTools: ['filesystem_list'],
        explanation: 'Permintaan melihat struktur dan daftar file pada workspace lokal.',
      };
    }

    // 0b. Read File content
    const readFileMatch = text.match(/\b(?:baca file|lihat isi file|tampilkan isi|buka file|isi dari file|periksa file|read file)\s+[`"']?([a-zA-Z0-9_\-\.\/\\]+)[`"']?/i);
    if (readFileMatch && readFileMatch[1]) {
      return {
        intent: 'technical_coding',
        confidence: 0.95,
        recommendedCategory: 'Reasoning',
        requiresTools: ['filesystem_read'],
        detectedTargetFile: readFileMatch[1].trim(),
        explanation: `Permintaan membaca konten file "${readFileMatch[1]}" dari workspace.`,
      };
    }

    // 0c. Create / Edit / Delete file
    const fileWriteMatch = text.match(/\b(?:buatkan file|buat file|tulis file|create file|edit file|ubah file|ganti file|hapus file|delete file)\s+[`"']?([a-zA-Z0-9_\-\.\/\\]+)[`"']?/i);
    if (fileWriteMatch && fileWriteMatch[1]) {
      return {
        intent: 'technical_coding',
        confidence: 0.95,
        recommendedCategory: 'Reasoning',
        requiresTools: ['filesystem_write'],
        detectedTargetFile: fileWriteMatch[1].trim(),
        explanation: `Permintaan modifikasi file "${fileWriteMatch[1]}" pada workspace (memerlukan persetujuan keamanan).`,
      };
    }

    // 1. Math / Calculation Check
    // e.g. "hitung 15 * 40", "berapa 240 / 6", expressions like "120 + 450"
    const hasMathSymbols = /[\d\s]+[\+\-\*\/\^%][\d\s\+\-\*\/\^%\(\)\.]+/.test(lower);
    const hasCalcKeywords = /\b(hitung|berapa|kalkulasi|calculate|total|sum|akar|pangkat)\b/.test(lower);
    if ((hasMathSymbols && hasCalcKeywords) || /^[\d\s\+\-\*\/\(\)\.\^%]+$/.test(lower)) {
      return {
        intent: 'calculation',
        confidence: 0.95,
        recommendedCategory: 'Fast Response',
        requiresTools: ['calculator'],
        explanation: 'Pertanyaan mengandung ekspresi matematika atau permintaan perhitungan numerik.',
      };
    }

    // 2. Project Documentation / Knowledge Base Check
    // Queries referencing the system, framework, blueprint, gateway architecture, API keys in this project
    const hasProjectKeywords = /\b(blueprint|framework|ai gateway|project ini|arsitektur gateway|failover|store\.json|groq|rotasi key)\b/.test(lower);
    if (hasProjectKeywords) {
      return {
        intent: 'explanation',
        confidence: 0.9,
        recommendedCategory: 'General Purpose',
        requiresTools: ['knowledge_retrieval'],
        explanation: 'Pertanyaan berkaitan dengan dokumentasi internal atau arsitektur sistem proyek ini.',
      };
    }

    // 3. Technical & Coding Check
    const hasCodeKeywords = /\b(function|def |class |const |let |var |import |export |return |async |await |select |from |where |api|jwt|endpoint|python|typescript|javascript|react|node|sql|regex|docker|git|bug|syntax)\b/.test(lower);
    const hasCodeBlocks = text.includes('```') || text.includes('{') && text.includes('}');
    if (hasCodeKeywords || hasCodeBlocks) {
      return {
        intent: 'technical_coding',
        confidence: 0.88,
        recommendedCategory: 'Reasoning',
        explanation: 'Pertanyaan teknis seputar pemrograman, algoritma, atau arsitektur perangkat lunak.',
      };
    }

    // 4. Troubleshooting Check
    const hasTroubleshoot = /\b(error|gagal|failed|exception|crash|tidak jalan|kenapa begini|fix|kenapa salah|debug|stack trace)\b/.test(lower);
    if (hasTroubleshoot) {
      return {
        intent: 'troubleshooting',
        confidence: 0.85,
        recommendedCategory: 'Reasoning',
        explanation: 'Pertanyaan troubleshooting mencari akar masalah dan solusi perbaikan.',
      };
    }

    // 5. Fresh Information / Web Search Check
    const hasCurrentInfo = /\b(terbaru|hari ini|saat ini|tahun ini|berita|harga sekarang|kurs|jadwal terkini|versi terbaru|cuaca)\b/.test(lower);
    if (hasCurrentInfo) {
      return {
        intent: 'current_info',
        confidence: 0.82,
        recommendedCategory: 'Fast Response',
        requiresTools: ['web_search'],
        explanation: 'Pertanyaan membutuhkan informasi terkini atau data faktual terbaru.',
      };
    }

    // 6. Recommendation & Comparison Check
    const hasRecommendation = /\b(rekomendasi|saran|pilihan mana|bandingkan|perbedaan antara|kelebihan dan kekurangan|vs)\b/.test(lower);
    if (hasRecommendation) {
      return {
        intent: 'recommendation',
        confidence: 0.8,
        recommendedCategory: 'General Purpose',
        explanation: 'Permintaan rekomendasi, analisis opsi, atau perbandingan fitur.',
      };
    }

    // 7. Detailed Explanation Check
    const hasExplanation = /\b(jelaskan|bagaimana cara|apa yang dimaksud|kenapa|mengapa|prinsip kerja)\b/.test(lower);
    if (hasExplanation) {
      return {
        intent: 'explanation',
        confidence: 0.75,
        recommendedCategory: 'General Purpose',
        explanation: 'Permintaan penjelasan konsep atau mekanisme secara terstruktur.',
      };
    }

    // 8. Follow-up Check
    const hasFollowUp = /\b(lalu|kemudian|maksudnya|yang tadi|kalau begitu|bagaimana dengan)\b/.test(lower);
    if (hasFollowUp && lower.length < 50) {
      return {
        intent: 'follow_up',
        confidence: 0.7,
        recommendedCategory: 'Fast Response',
        explanation: 'Pertanyaan lanjutan yang mengacu pada konteks pembahasan sebelumnya.',
      };
    }

    // Default: General Question
    return {
      intent: 'general_question',
      confidence: 0.6,
      recommendedCategory: 'Fast Response',
      explanation: 'Pertanyaan umum atau percakapan interaktif biasa.',
    };
  }

  // Suggest optimal model based on detected category
  public suggestModelForCategory(category: ModelCategory, availableModels: ModelInfo[] = DEFAULT_MODELS): ModelInfo | null {
    const match = availableModels.find((m) => m.category === category && m.isActive);
    if (match) return match;

    // Fallback to fast response or first available
    return availableModels.find((m) => m.isActive) || null;
  }
}

export const intentRouter = IntentRouter.getInstance();

