export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'essay';

export interface QuestionChoice {
  id: string; // 'A', 'B', 'C', 'D' hoặc 'a', 'b', 'c', 'd'
  content: string;
  isCorrect: boolean;
}

export interface ExamQuestion {
  id: string;
  number?: number;
  type: QuestionType;
  title?: string;
  statement: string; // Đề bài
  choices?: QuestionChoice[]; // 4 lựa chọn cho trắc nghiệm hoặc đúng/sai
  shortAnswer?: string; // Đáp án điền khuyết
  solution?: string; // Lời giải chi tiết \loigiai{...}
  rawLatex: string; // Khối \begin{ex} ... \end{ex}
  hasTikz?: boolean;
  tikzCode?: string;
  difficulty?: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
  topic?: string;
  confidence?: number;
}

export interface BYOKConfig {
  geminiKey: string;
  groqKey: string;
  openRouterKey: string;
  pix2texUrl: string;
  providerPriority: ('gemini' | 'groq' | 'openrouter')[];
  selectedProvider: 'auto' | 'gemini' | 'groq' | 'openrouter';
  dailyQuotaLimit: number; // Mặc định 1500 RPM / RPD
}

export interface QuotaStats {
  date: string;
  count: number;
  tokensUsed?: number;
}

export interface TikZProject {
  id: string;
  title: string;
  code: string;
  category: 'geometry3d' | 'geometry2d' | 'graph' | 'table' | 'custom';
  description?: string;
  updatedAt: number;
}

export interface MathSolveItem {
  id: string;
  question: string;
  solution: string;
  rawLatex: string;
  category?: string;
  createdAt: number;
}
