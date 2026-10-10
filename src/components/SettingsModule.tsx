import React, { useState } from 'react';
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
  Info
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
  const quota = getQuotaStats();

  const handleSave = () => {
    setByok(formData);
    saveBYOKConfig(formData);
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
        [provider]: { loading: false, success: false, message: 'Chưa nhập API Key.' },
      }));
      return;
    }

    setTestStatus(prev => ({
      ...prev,
      [provider]: { loading: true },
    }));

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
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
      setTestStatus(prev => ({
        ...prev,
        [provider]: { loading: false, success: false, message: err.message || 'Không thể kết nối.' },
      }));
    }
  };

  const quotaPercent = Math.min(100, Math.round((quota.count / (formData.dailyQuotaLimit || 1500)) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Quản Lý API Key (BYOK) & Dự Phòng Đa Nhà Cung Cấp
            </h2>
            <p className="text-xs text-slate-400">
              Cơ chế Bring Your Own Key: Lưu trữ trực tiếp tại trình duyệt (localStorage), không lưu server
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-5 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-cyan-300">Cam kết bảo mật & Quyền riêng tư:</p>
            <p className="text-cyan-200/90 leading-relaxed text-[11px] mt-0.5">
              Tất cả API Key cá nhân của bạn chỉ được lưu trong bộ nhớ máy cục bộ (<code className="font-mono">localStorage</code>). Khi gửi yêu cầu xử lý, key chỉ dùng trực tiếp cho phiên gọi đó. Bạn hoàn toàn có thể sử dụng server AI mặc định mà không cần nhập key nếu chưa có!
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

          {quotaPercent > 80 && (
            <p className="text-[11px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Bạn đã dùng hơn 80% hạn mức ngày hôm nay. Hãy cân nhắc đổi sang key cá nhân dự phòng.
            </p>
          )}
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
              onChange={(e) => setFormData(prev => ({ ...prev, selectedProvider: e.target.value as any }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="auto">Tự động (Thử lần lượt: Gemini → Groq → OpenRouter)</option>
              <option value="gemini">Google Gemini (Khuyên dùng cho Toán tiếng Việt & TikZ)</option>
              <option value="groq">Groq (Llama 3.2 Vision siêu tốc)</option>
              <option value="openrouter">OpenRouter (Đa dạng mô hình mã nguồn mở)</option>
            </select>
          </div>

          {/* 1. Gemini Key */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white">Google Gemini API Key (BYOK)</h4>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Khuyên dùng</span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={formData.geminiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, geminiKey: e.target.value }))}
                placeholder="Để trống để dùng Server Key AI Studio, hoặc nhập AIzaSy..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleTestKey('gemini')}
                disabled={testStatus.gemini?.loading || !formData.geminiKey}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {testStatus.gemini?.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                <span>Kiểm tra</span>
              </button>
            </div>

            {testStatus.gemini?.message && (
              <p className={`text-[11px] ${testStatus.gemini.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testStatus.gemini.message}
              </p>
            )}

            <p className="text-[11px] text-slate-500">
              Lấy key miễn phí tại <strong>Google AI Studio</strong> (miễn phí hạn mức hàng ngàn request mỗi ngày).
            </p>
          </div>

          {/* 2. Groq Key */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-400" />
                <h4 className="text-xs font-bold text-white">Groq API Key (Dự phòng 1)</h4>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={formData.groqKey}
                onChange={(e) => setFormData(prev => ({ ...prev, groqKey: e.target.value }))}
                placeholder="gsk_..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => handleTestKey('groq')}
                disabled={testStatus.groq?.loading || !formData.groqKey}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
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
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={formData.openRouterKey}
                onChange={(e) => setFormData(prev => ({ ...prev, openRouterKey: e.target.value }))}
                placeholder="sk-or-..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleTestKey('openrouter')}
                disabled={testStatus.openRouter?.loading || !formData.openRouterKey}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
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

          {/* 4. Pix2TeX Endpoint */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-400" /> Dịch vụ Pix2TeX (Hugging Face Spaces)
            </h4>
            <input
              type="text"
              value={formData.pix2texUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, pix2texUrl: e.target.value }))}
              placeholder="https://...hf.space/predict"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
            />
            <p className="text-[11px] text-slate-500">
              Endpoint bọc FastAPI pix2tex để trích xuất công thức toán đơn lẻ và đối chiếu.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm('Bạn có chắc muốn xóa toàn bộ key đã lưu trong trình duyệt?')) {
                  localStorage.removeItem('extex_byok_config');
                  setFormData({
                    geminiKey: '',
                    groqKey: '',
                    openRouterKey: '',
                    pix2texUrl: '',
                    providerPriority: ['gemini', 'groq', 'openrouter'],
                    selectedProvider: 'auto',
                    dailyQuotaLimit: 1500,
                  });
                }
              }}
              className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa hết key lưu cục bộ</span>
            </button>

            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Đã lưu thành công!' : 'Lưu Cài Đặt BYOK'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
