import { BYOKConfig, ExamQuestion, MathSolveItem, QuotaStats, TikZProject } from '../types';
import { SAMPLE_QUESTIONS, SAMPLE_TIKZ_PROJECTS } from '../data/samples';

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

export function getBYOKConfig(): BYOKConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BYOK_CONFIG_KEY) : null;
    if (!raw) return DEFAULT_BYOK_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BYOK_CONFIG,
      ...parsed,
      geminiKey: typeof parsed.geminiKey === 'string' ? parsed.geminiKey.trim() : '',
      groqKey: typeof parsed.groqKey === 'string' ? parsed.groqKey.trim() : '',
      openRouterKey: typeof parsed.openRouterKey === 'string' ? parsed.openRouterKey.trim() : '',
      pix2texUrl: typeof parsed.pix2texUrl === 'string' ? parsed.pix2texUrl.trim() : DEFAULT_BYOK_CONFIG.pix2texUrl,
    };
  } catch (e) {
    console.error('Lỗi đọc BYOK config từ localStorage:', e);
    return DEFAULT_BYOK_CONFIG;
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
    if (typeof window !== 'undefined') {
      localStorage.setItem(BYOK_CONFIG_KEY, JSON.stringify(sanitized));
    }
  } catch (e) {
    console.error('Failed to save BYOK config to localStorage:', e);
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

export function getSavedQuestions(): ExamQuestion[] {
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY);
    if (!raw) return SAMPLE_QUESTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_QUESTIONS;
  } catch {
    return SAMPLE_QUESTIONS;
  }
}

export function saveQuestions(questions: ExamQuestion[]): void {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch (e) {
    console.error('Failed to save questions:', e);
  }
}

export function getSavedTikZProjects(): TikZProject[] {
  try {
    const raw = localStorage.getItem(TIKZ_PROJECTS_KEY);
    if (!raw) return SAMPLE_TIKZ_PROJECTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_TIKZ_PROJECTS;
  } catch {
    return SAMPLE_TIKZ_PROJECTS;
  }
}

export function saveTikZProjects(projects: TikZProject[]): void {
  try {
    localStorage.setItem(TIKZ_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save TikZ projects:', e);
  }
}

export function getSavedMathSolutions(): MathSolveItem[] {
  try {
    const raw = localStorage.getItem(MATH_SOLUTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMathSolutions(items: MathSolveItem[]): void {
  try {
    localStorage.setItem(MATH_SOLUTIONS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save math solutions:', e);
  }
}
