import { BYOKConfig, ExamQuestion, MathSolveItem, QuotaStats, TikZProject } from '../types';

const BYOK_CONFIG_KEY = 'extex_byok_config';
const QUOTA_STATS_KEY = 'extex_quota_stats';
const QUESTIONS_KEY = 'extex_questions_list';
const TIKZ_PROJECTS_KEY = 'extex_tikz_projects';
const MATH_SOLUTIONS_KEY = 'extex_math_solutions';

export const DEFAULT_BYOK_CONFIG: BYOKConfig = {
  geminiKey: '',
  groqKey: '',
  openRouterKey: '',
  pix2texUrl: 'https://breezedeus-pix2tex.hf.space/predict',
  providerPriority: ['gemini', 'groq', 'openrouter'],
  selectedProvider: 'auto',
  dailyQuotaLimit: 1500,
};

// In-memory memory cache in case browser storage is blocked
let memoryBYOKConfig: BYOKConfig | null = null;

export function getBYOKConfig(): BYOKConfig {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        raw = localStorage.getItem(BYOK_CONFIG_KEY);
      } catch {
        // localStorage blocked or restricted
      }
      if (!raw) {
        try {
          raw = sessionStorage.getItem(BYOK_CONFIG_KEY);
        } catch {
          // sessionStorage blocked
        }
      }
    }

    if (!raw && memoryBYOKConfig) {
      return memoryBYOKConfig;
    }
    if (!raw) return DEFAULT_BYOK_CONFIG;

    const parsed = JSON.parse(raw);
    const resolved: BYOKConfig = {
      ...DEFAULT_BYOK_CONFIG,
      ...parsed,
      geminiKey: typeof parsed.geminiKey === 'string' ? parsed.geminiKey.trim() : '',
      groqKey: typeof parsed.groqKey === 'string' ? parsed.groqKey.trim() : '',
      openRouterKey: typeof parsed.openRouterKey === 'string' ? parsed.openRouterKey.trim() : '',
      pix2texUrl: typeof parsed.pix2texUrl === 'string' ? parsed.pix2texUrl.trim() : DEFAULT_BYOK_CONFIG.pix2texUrl,
    };
    memoryBYOKConfig = resolved;
    return resolved;
  } catch (e) {
    console.error('Lỗi đọc BYOK config từ storage:', e);
    return memoryBYOKConfig || DEFAULT_BYOK_CONFIG;
  }
}

export function saveBYOKConfig(config: BYOKConfig): void {
  try {
    const sanitized: BYOKConfig = {
      ...config,
      geminiKey: (config.geminiKey || '').trim(),
      groqKey: (config.groqKey || '').trim(),
      openRouterKey: (config.openRouterKey || '').trim(),
      pix2texUrl: (config.pix2texUrl || '').trim(),
    };
    memoryBYOKConfig = sanitized;

    if (typeof window !== 'undefined') {
      const jsonStr = JSON.stringify(sanitized);
      try {
        localStorage.setItem(BYOK_CONFIG_KEY, jsonStr);
      } catch {
        // Ignored
      }
      try {
        sessionStorage.setItem(BYOK_CONFIG_KEY, jsonStr);
      } catch {
        // Ignored
      }

      // Sync with server session if custom geminiKey exists
      if (sanitized.geminiKey) {
        fetch('/api/byok-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geminiKey: sanitized.geminiKey }),
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Failed to save BYOK config:', e);
  }
}

export function getQuotaStats(): QuotaStats {
  const today = new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem(QUOTA_STATS_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed: QuotaStats = JSON.parse(raw);
    if (parsed.date !== today) {
      return { date: today, count: 0 };
    }
    return parsed;
  } catch {
    return { date: today, count: 0 };
  }
}

export function incrementQuotaCount(): QuotaStats {
  const stats = getQuotaStats();
  stats.count += 1;
  try {
    localStorage.setItem(QUOTA_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to update quota stats:', e);
  }
  return stats;
}

// Purge old saved session questions from browser storage immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(QUESTIONS_KEY);
    localStorage.removeItem(TIKZ_PROJECTS_KEY);
    localStorage.removeItem(MATH_SOLUTIONS_KEY);
    localStorage.removeItem('extex_questions');
    localStorage.removeItem('extex_questions_list');
  } catch {
    // Ignore
  }
}

export function getSavedQuestions(): ExamQuestion[] {
  // Phiên nào thì đúng phiên đó: không nạp câu mẫu hay phiên cũ
  return [];
}

export function saveQuestions(_questions: ExamQuestion[]): void {
  // Phiên nào thì đúng phiên đó: không lưu sang các phiên sau
}

export function getSavedTikZProjects(): TikZProject[] {
  return [];
}

export function saveTikZProjects(_projects: TikZProject[]): void {
  // Session-only
}

export function getSavedMathSolutions(): MathSolveItem[] {
  return [];
}

export function saveMathSolutions(_items: MathSolveItem[]): void {
  // Session-only
}
