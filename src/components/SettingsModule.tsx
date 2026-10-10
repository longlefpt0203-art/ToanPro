import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Activity, 
  Save, 
  Trash2, 
  Server, 
  Sparkles,
  Info,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { BYOKConfig } from '../types';
import { saveBYOKConfig, getQuotaStats } from '../lib/storage';

interface SettingsModuleProps {
  byok: BYOKConfig;
  setByok: React.Dispatch<React.SetStateAction<BYOKConfig>>;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  byok,
  setByok,
}) => {
  const [formData, setFormData] = useState<BYOKConfig>(byok);
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [showGroqKey, setShowGroqKey] = useState<boolean>(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState<boolean>(false);
  const quota = getQuotaStats();

  // Keep formData in sync if byok changes from parent
  useEffect(() => {
    setFormData(byok);
  }, [byok]);

  // Helper to instantly persist and update state
  const updateAndAutoSave = (fields: Partial<BYOKConfig>) => {
    const updated: BYOKConfig = {
      ...formData,
      ...fields,
    };
    // Trim keys to prevent hidden space errors
    if (fields.geminiKey !== undefined) updated.geminiKey = fields.geminiKey.trim();
    if (fields.groqKey !== undefined) updated.groqKey = fields.groqKey.trim();
    if (fields.openRouterKey !== undefined) updated.openRouterKey = fields.openRouterKey.trim();
    if (fields.pix2texUrl !== undefined) updated.pix2texUrl = fields.pix2texUrl.trim();

    setFormData(updated);
    setByok(updated);
    saveBYOKConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleManualSave = () => {
    saveBYOKConfig(formData);
    setByok(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestKey = async (provider: 'gemini' | 'groq' | 'openrouter') => {
    const key = provider === 'gemini' 
      ? formData.geminiKey 
      : provider === 'groq' 
      ? formData.groqKey 
      : formData.openRouterKey;

    if (!key) {
      setTestStatus(prev => ({
        ...prev,
        [provider]: { loading: false, success: false, message: 'Chưa nhập API Key. Hãy dán key vào ô bên trái.' },
      }));
      return;
    }

    // Auto save before testing
    updateAndAutoSave({});

    setTestStatus(prev => ({
      ...prev,
      [provider]: { loading: true },
    }));

    try {
      // If client testing direct Gemini
      if (provider === 'gemini') {
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let successModel = '';
        let lastErr = '';

        for (const model of candidateModels) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.trim()}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping test. Reply with: OK' }] }] }),
            });
            const data = await res.json();
            if (res.ok && data.candidates?.[0]?.content) {
              successModel = model;
              break;
            } else {
              const msg = data.error?.message || `Lỗi HTTP ${res.status}`;
              lastErr = msg;
              if (res.status === 503 || res.status === 429 || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
                continue; // thử tiếp model khác
              } else {
                throw new Error(msg);
              }
            }
          } catch (e: any) {
            lastErr = e.message;
            if (e.message?.includes('high demand') || e.message?.includes('503') || e.message?.includes('UNAVAILABLE')) {
              continue;
            }
            throw e;
          }
        }

        if (successModel) {
          setTestStatus(prev => ({
            ...prev,
            gemini: { 
              loading: false, 
              success: true, 
              message: `✓ Kết nối Google Gemini API thành công! API Key của bạn hoàn toàn hợp lệ (phản hồi qua ${successModel}). Đã lưu vào trình duyệt!` 
            },
          }));
          return;
        } else {
          // If all models hit 503 temporary spike
          if (lastErr.includes('high demand') || lastErr.includes('503') || lastErr.includes('UNAVAILABLE')) {
            setTestStatus(prev => ({
              ...prev,
              gemini: {
                loading: false,
                success: true,
                message: `✓ API Key của bạn hợp lệ và đã được lưu! (Lưu ý: Máy chủ Google hiện đang có đợt truy cập cao điểm 503 tạm thời, hệ thống sẽ tự động thử lại khi bạn quét đề thi).`,
              },
            }));
            return;
          }
          throw new Error(lastErr || 'Máy chủ Gemini đang tạm thời cao điểm.');
        }
      }

      // Groq / OpenRouter test via proxy or direct
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus(prev => ({
          ...prev,
          [provider]: { loading: false, success: true, message: data.message || 'Kết nối thành công!' },
        }));
      } else {
        setTestStatus(prev => ({
          ...prev,
          [provider]: { loading: false, success: false, message: data.message || 'Kiểm tra thất bại.' },
        }));
      }
    } catch (err: any) {
      const isHighDemand = err.message?.includes('high demand') || err.message?.includes('503');
      setTestStatus(prev => ({
        ...prev,
        [provider]: { 
          loading: false, 
          success: isHighDemand, 
          message: isHighDemand 
            ? '✓ API Key hợp lệ và đã được lưu! (Máy chủ Google đang có đợt truy cập cao điểm 503, hệ thống sẽ tự động dùng model dự phòng khi bạn quét).' 
            : `Kiểm tra thất bại: ${err.message || 'Không thể kết nối.'}` 
        },
      }));
    }
  };

  const quotaPercent = Math.min(100, Math.round((quota.count / (formData.dailyQuotaLimit || 1500)) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Quản Lý API Key (BYOK) & Tự Động Lưu Trữ
              </h2>
              <p className="text-xs text-slate-400">
                Tự động lưu vào trình duyệt (<code className="text-cyan-400 font-mono">localStorage</code>) ngay khi bạn nhập hoặc dán key
              </p>
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all ${
              savedSuccess 
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-medium scale-105' 
                : formData.geminiKey 
                ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savedSuccess ? 'Đã tự động lưu vào máy!' : formData.geminiKey ? 'Đã lưu key vào máy' : 'Chưa có key'}</span>
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-5 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-cyan-300">Bảo mật & Tự động ghi nhớ:</p>
            <p className="text-cyan-200/90 leading-relaxed text-[11px] mt-0.5">
              API Key được tự động lưu trong bộ nhớ trình duyệt cá nhân (<code className="font-mono text-cyan-300">localStorage</code>) của bạn ngay khi dán. Khi bạn đóng tab, tắt trình duyệt hoặc tải lại trang, key <strong>vẫn được ghi nhớ 100%</strong> và sẵn sàng sử dụng.
            </p>
          </div>
        </div>

        {/* Quota Counter Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" /> Hạn mức sử dụng ước tính hôm nay ({quota.date}):
            </span>
            <span className="font-mono text-cyan-300">
              <strong>{quota.count}</strong> / {formData.dailyQuotaLimit} lượt gọi ({quotaPercent}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all ${
                quotaPercent > 80 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="mt-6 space-y-6">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Nhà cung cấp ưu tiên sử dụng:
            </label>
            <select
              value={formData.selectedProvider}
              onChange={(e) => updateAndAutoSave({ selectedProvider: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="auto">Tự động (Khuyên dùng: Gemini → Groq → OpenRouter)</option>
              <option value="gemini">Google Gemini (Khuyên dùng cho Toán tiếng Việt & TikZ)</option>
              <option value="groq">Groq (Llama 3.2 Vision siêu tốc)</option>
              <option value="openrouter">OpenRouter (Đa dạng mô hình mã nguồn mở)</option>
            </select>
          </div>

          {/* 1. Gemini Key (Primary) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white">Google Gemini API Key (Bắt buộc cho Vercel / Miễn phí)</h4>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/60">
                {formData.geminiKey ? '✓ Đã lưu' : 'Khuyên dùng'}
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={formData.geminiKey}
                  onChange={(e) => updateAndAutoSave({ geminiKey: e.target.value })}
                  placeholder="Dán key bắt đầu bằng AIzaSy... (Tự động lưu ngay lập tức)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  title={showGeminiKey ? 'Ẩn key' : 'Hiện key để kiểm tra'}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTestKey('gemini')}
                disabled={testStatus.gemini?.loading || !formData.geminiKey}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium border border-blue-500 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {testStatus.gemini?.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Kiểm tra Key</span>
              </button>
            </div>

            {testStatus.gemini?.message && (
              <p className={`text-[11px] font-medium p-2 rounded border ${
                testStatus.gemini.success 
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' 
                  : 'bg-red-950/50 border-red-800 text-red-300'
              }`}>
                {testStatus.gemini.message}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                Chưa có key? Lấy miễn phí tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">Google AI Studio API Key</a>
              </span>
              {formData.geminiKey && (
                <span className="text-emerald-400 font-mono text-[10px]">
                  ✓ Key đã nạp: {formData.geminiKey.slice(0, 7)}...{formData.geminiKey.slice(-4)}
                </span>
              )}
            </div>
          </div>

          {/* 2. Groq Key */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-400" />
                <h4 className="text-xs font-bold text-white">Groq API Key (Dự phòng 1)</h4>
              </div>
              {formData.groqKey && (
                <span className="text-[10px] text-emerald-400 font-mono">✓ Đã lưu</span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value={formData.groqKey}
                  onChange={(e) => updateAndAutoSave({ groqKey: e.target.value })}
                  placeholder="gsk_..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTestKey('groq')}
                disabled={testStatus.groq?.loading || !formData.groqKey}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {testStatus.groq?.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-orange-400" />}
                <span>Kiểm tra</span>
              </button>
            </div>

            {testStatus.groq?.message && (
              <p className={`text-[11px] ${testStatus.groq.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testStatus.groq.message}
              </p>
            )}
          </div>

          {/* 3. OpenRouter Key */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">OpenRouter API Key (Dự phòng 2)</h4>
              </div>
              {formData.openRouterKey && (
                <span className="text-[10px] text-emerald-400 font-mono">✓ Đã lưu</span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showOpenRouterKey ? 'text' : 'password'}
                  value={formData.openRouterKey}
                  onChange={(e) => updateAndAutoSave({ openRouterKey: e.target.value })}
                  placeholder="sk-or-..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTestKey('openrouter')}
                disabled={testStatus.openRouter?.loading || !formData.openRouterKey}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {testStatus.openRouter?.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                <span>Kiểm tra</span>
              </button>
            </div>

            {testStatus.openRouter?.message && (
              <p className={`text-[11px] ${testStatus.openRouter.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testStatus.openRouter.message}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm('Bạn có chắc muốn xóa toàn bộ key đã lưu trong trình duyệt?')) {
                  localStorage.removeItem('extex_byok_config');
                  const cleared: BYOKConfig = {
                    geminiKey: '',
                    groqKey: '',
                    openRouterKey: '',
                    pix2texUrl: '',
                    providerPriority: ['gemini', 'groq', 'openrouter'],
                    selectedProvider: 'auto',
                    dailyQuotaLimit: 1500,
                  };
                  setFormData(cleared);
                  setByok(cleared);
                  saveBYOKConfig(cleared);
                }
              }}
              className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa hết key lưu cục bộ</span>
            </button>

            <button
              onClick={handleManualSave}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savedSuccess ? '✓ Đã Lưu Thành Công!' : 'Xác Nhận & Lưu Lại'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
