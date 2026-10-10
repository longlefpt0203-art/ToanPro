import React, { useState } from 'react';
import { 
  Calculator, 
  Upload, 
  Sparkles, 
  Copy, 
  Check, 
  PlusCircle, 
  RefreshCw, 
  BookOpen, 
  Cpu, 
  CheckCircle2,
  FileCheck,
  History
} from 'lucide-react';
import { ExamQuestion, BYOKConfig, MathSolveItem } from '../types';
import { renderLatexToHtml, parseExBlocks } from '../lib/latexHelper';
import { incrementQuotaCount } from '../lib/storage';
import { callWithFallbackSolve } from '../lib/callWithFallback';

interface MathSolverModuleProps {
  byok: BYOKConfig;
  onAddQuestionToExam: (question: ExamQuestion) => void;
}

export const MathSolverModule: React.FC<MathSolverModuleProps> = ({
  byok,
  onAddQuestionToExam,
}) => {
  const [questionInput, setQuestionInput] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [solveStyle, setSolveStyle] = useState<'pedagogical' | 'concise' | 'casio'>('pedagogical');
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result (phiên nào đúng phiên đó, ban đầu để trống)
  const [latexResult, setLatexResult] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [addedToExam, setAddedToExam] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<MathSolveItem[]>([]);

  // Clipboard paste listener
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageFile = (file: File) => {
    setImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSolve = async () => {
    if (!questionInput.trim() && !selectedImage) {
      setErrorMessage('Vui lòng nhập đề bài hoặc tải ảnh câu hỏi.');
      return;
    }

    setIsSolving(true);
    setErrorMessage(null);
    setAddedToExam(false);

    try {
      const latex = await callWithFallbackSolve({
        questionText: questionInput,
        imageBase64: selectedImage || undefined,
        mimeType: imageMime,
        style: solveStyle,
        byok,
      });

      if (latex) {
        setLatexResult(latex);
        incrementQuotaCount();

        // Save to current session history
        const newItem: MathSolveItem = {
          id: `sol-${Date.now()}`,
          question: questionInput || 'Giải từ ảnh',
          solution: latex,
          rawLatex: latex,
          createdAt: Date.now(),
        };
        const updated = [newItem, ...historyItems.slice(0, 19)];
        setHistoryItems(updated);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể giải bài toán này.');
    } finally {
      setIsSolving(false);
    }
  };

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latexResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToExam = () => {
    const parsed = parseExBlocks(latexResult);
    if (parsed.length > 0) {
      onAddQuestionToExam(parsed[0]);
    } else {
      onAddQuestionToExam({
        id: `sol-q-${Date.now()}`,
        statement: questionInput || 'Bài toán',
        type: 'essay',
        solution: latexResult,
        rawLatex: latexResult,
      });
    }
    setAddedToExam(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Trợ lý Giải Toán Tự Động & Đóng Gói \loigiai
              </h2>
              <p className="text-xs text-slate-400">
                Nhập đề bài hoặc ảnh chụp • Giải từng bước chuẩn mực sư phạm Việt Nam • Xuất khối LaTeX hoàn chỉnh
              </p>
            </div>
          </div>

          {/* Style Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSolveStyle('pedagogical')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                solveStyle === 'pedagogical' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chuẩn Sư phạm
            </button>
            <button
              onClick={() => setSolveStyle('concise')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                solveStyle === 'concise' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rút gọn
            </button>
            <button
              onClick={() => setSolveStyle('casio')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                solveStyle === 'casio' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Mẹo Casio FX-580</span>
            </button>
          </div>
        </div>

        {/* Input Zone */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Nội dung câu hỏi hoặc đề bài (Hỗ trợ công thức $...$):
            </label>
            <textarea
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
              placeholder="Ví dụ: Cho hàm số y = x^3 - 3x + 2. Tìm tọa độ các điểm cực trị của đồ thị hàm số và viết phương trình đường thẳng đi qua hai điểm cực trị đó..."
            />
          </div>

          {/* Optional Image Upload */}
          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Hoặc tải ảnh câu hỏi toán:
              </label>
              <div 
                className="border-2 border-dashed border-slate-700 rounded-xl p-3 text-center bg-slate-950/50 hover:border-emerald-500/50 cursor-pointer transition-colors min-h-[110px] flex flex-col items-center justify-center"
                onClick={() => document.getElementById('math-image-upload')?.click()}
              >
                <input
                  id="math-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
                  }}
                />
                {selectedImage ? (
                  <div className="relative">
                    <img src={selectedImage} alt="Problem preview" className="max-h-24 mx-auto rounded object-contain" />
                    <span className="text-[10px] text-emerald-400 block mt-1">Đã chọn ảnh</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-5 h-5 mx-auto text-emerald-400" />
                    <p className="text-xs text-slate-400">Tải ảnh chụp đề bài</p>
                  </div>
                )}
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800">
                {errorMessage}
              </p>
            )}

            <button
              onClick={handleSolve}
              disabled={isSolving}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              {isSolving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang phân tích & giải bài...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu Giải toán</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Solution Output Box */}
      {latexResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Kết quả Lời Giải Toán Học Sư Phạm</h3>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleCopyLatex}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép mã LaTeX'}</span>
              </button>

              <button
                onClick={handleAddToExam}
                disabled={addedToExam}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  addedToExam
                    ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                }`}
              >
                {addedToExam ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                <span>{addedToExam ? 'Đã thêm vào Đề thi (Module 1)' : 'Thêm vào Đề thi'}</span>
              </button>
            </div>
          </div>

          {/* KaTeX Math Solution View */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm leading-relaxed space-y-4">
            <div dangerouslySetInnerHTML={{ __html: renderLatexToHtml(latexResult) }} />
          </div>

          {/* Raw LaTeX Accordion */}
          <details className="text-xs group">
            <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-mono flex items-center gap-1">
              Xem mã nguồn LaTeX thô (\begin&#123;ex&#125; & \loigiai&#123;...&#125;)
            </summary>
            <div className="mt-2 p-3 bg-slate-950 rounded-lg font-mono text-[11px] text-emerald-300/90 overflow-x-auto border border-slate-800">
              <pre>{latexResult}</pre>
            </div>
          </details>
        </div>
      )}

      {/* History of solved problems */}
      {historyItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-400" /> Lịch sử trong phiên này ({historyItems.length})
            </h3>
            <button
              onClick={() => setHistoryItems([])}
              className="text-[11px] text-slate-400 hover:text-red-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:border-red-800 transition-colors"
            >
              Xóa lịch sử phiên
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {historyItems.slice(0, 4).map((it) => (
              <div
                key={it.id}
                onClick={() => setLatexResult(it.solution)}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors space-y-1.5"
              >
                <p className="text-xs font-semibold text-slate-200 truncate">{it.question}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {new Date(it.createdAt).toLocaleTimeString()} • Nhấn để xem lại lời giải
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
