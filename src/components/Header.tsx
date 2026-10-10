import React from 'react';
import { 
  FileCode, 
  Camera, 
  Calculator, 
  Shapes, 
  Sparkles, 
  Settings, 
  Download, 
  Copy, 
  Check, 
  Activity,
  Layers
} from 'lucide-react';
import { ExamQuestion } from '../types';
import { generateFullDocumentTex } from '../lib/latexHelper';
import { getQuotaStats } from '../lib/storage';

interface HeaderProps {
  activeTab: 'ocr' | 'solve' | 'img2tikz' | 'beautify' | 'settings';
  setActiveTab: (tab: 'ocr' | 'solve' | 'img2tikz' | 'beautify' | 'settings') => void;
  questions: ExamQuestion[];
  isByokActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  questions,
  isByokActive,
}) => {
  const [copiedAll, setCopiedAll] = React.useState(false);
  const quota = getQuotaStats();

  const handleCopyAll = () => {
    const fullTex = generateFullDocumentTex(questions, 'Đề Thi Tuyển Chọn - ExTeX Studio');
    navigator.clipboard.writeText(fullTex);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadTex = () => {
    const fullTex = generateFullDocumentTex(questions, 'De_Thi_ExTeX_Studio');
    const blob = new Blob([fullTex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `De_Thi_ExTeX_${new Date().toISOString().slice(0, 10)}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
            <span className="font-serif font-black text-xl italic tracking-tighter">Ex</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                ExTeX Studio
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  GDPT 2018
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Chuyển đề thi ảnh/PDF sang LaTeX gói <code className="text-blue-400 font-mono">ex_test</code> • Giải toán • TikZ
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 text-xs">
          {/* Quota Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hôm nay: <strong className="text-white font-mono">{quota.count}</strong> yêu cầu</span>
          </div>

          {/* BYOK Status Indicator */}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isByokActive 
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isByokActive ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
            {isByokActive ? 'BYOK Cá nhân' : 'Server AI Sẵn sàng'}
          </button>

          {/* Quick Copy / Download TeX */}
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-medium text-slate-200 transition-colors"
            title="Sao chép toàn bộ đề thi chuẩn .tex"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedAll ? 'Đã sao chép!' : 'Copy Toàn Bộ .tex'}</span>
          </button>

          <button
            onClick={handleDownloadTex}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-white shadow-sm shadow-blue-500/20 transition-colors"
            title="Tải file .tex hoàn chỉnh về máy"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải File .tex ({questions.length} câu)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-t border-slate-800/80 bg-slate-900/95 px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 max-w-7xl mx-auto overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
              activeTab === 'ocr'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-4 h-4 text-blue-400" />
            <span>1. OCR → ex_test</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {questions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('solve')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
              activeTab === 'solve'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>2. Giải toán tự động (\loigiai)</span>
          </button>

          <button
            onClick={() => setActiveTab('img2tikz')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
              activeTab === 'img2tikz'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shapes className="w-4 h-4 text-amber-400" />
            <span>3. Ảnh → TikZ & Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('beautify')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
              activeTab === 'beautify'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>4. Làm đẹp & Tối ưu TikZ</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
              activeTab === 'settings'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>5. Cài đặt BYOK</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
