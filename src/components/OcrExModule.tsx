import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  Code, 
  Eye, 
  CheckCircle2, 
  HelpCircle, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  Scissors
} from 'lucide-react';
import { ExamQuestion, BYOKConfig, QuestionType } from '../types';
import { buildLatexEx, parseExBlocks, renderLatexToHtml } from '../lib/latexHelper';
import { SAMPLE_QUESTIONS } from '../data/samples';
import { incrementQuotaCount } from '../lib/storage';

interface OcrExModuleProps {
  questions: ExamQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<ExamQuestion[]>>;
  byok: BYOKConfig;
}

export const OcrExModule: React.FC<OcrExModuleProps> = ({
  questions,
  setQuestions,
  byok,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'latex' | 'compare'>('preview');
  const [rawLatexText, setRawLatexText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({
    'sample-1': true,
    'sample-2': true,
    'sample-3': true,
  });

  // Options
  const [questionTypeChoice, setQuestionTypeChoice] = useState<QuestionType | 'auto'>('auto');
  const [includeSolution, setIncludeSolution] = useState<boolean>(true);

  // Math Compare tool
  const [pix2texResult, setPix2texResult] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync questions to rawLatexText when questions change
  useEffect(() => {
    if (questions.length > 0) {
      const fullLatex = questions.map(q => buildLatexEx(q)).join('\n\n');
      setRawLatexText(fullLatex);
    }
  }, [questions]);

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageFile(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageFile = (file: File) => {
    setErrorMsg(null);
    setImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const handleRunOcr = async () => {
    if (!selectedImage) {
      setErrorMsg('Vui lòng tải lên ảnh hoặc chọn mẫu đề thi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: imageMime,
          questionType: questionTypeChoice,
          includeSolution,
          byok,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi nhận diện đề thi.');
      }

      if (data.latex) {
        incrementQuotaCount();
        const parsed = parseExBlocks(data.latex);
        if (parsed.length > 0) {
          setQuestions(prev => [...prev, ...parsed]);
          // Expand new solutions
          const newExp: Record<string, boolean> = { ...expandedSolutions };
          parsed.forEach(p => (newExp[p.id] = true));
          setExpandedSolutions(newExp);
        } else {
          // If plain block, append single
          const single: ExamQuestion = {
            id: `q-${Date.now()}`,
            statement: data.latex,
            type: 'essay',
            rawLatex: data.latex,
          };
          setQuestions(prev => [...prev, single]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể kết nối đến máy chủ AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComparePix2tex = async () => {
    if (!selectedImage) return;
    setIsComparing(true);
    try {
      // Test proxy or local OCR assistant
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: imageMime,
          questionText: 'Chỉ trích xuất chính xác công thức toán đơn lẻ dưới dạng LaTeX KaTeX chuẩn nhất:',
          byok,
        }),
      });
      const data = await res.json();
      if (data.latex) {
        setPix2texResult(data.latex);
      }
    } catch (e: any) {
      setPix2texResult(`% Lỗi: ${e.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  const handleCopySingle = (q: ExamQuestion) => {
    const code = buildLatexEx(q);
    navigator.clipboard.writeText(code);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteSingle = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateRawLatex = (val: string) => {
    setRawLatexText(val);
    const parsed = parseExBlocks(val);
    if (parsed.length > 0) {
      setQuestions(parsed);
    }
  };

  const toggleSolution = (id: string) => {
    setExpandedSolutions(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLoadSample = (sampleIndex: number) => {
    const sample = SAMPLE_QUESTIONS[sampleIndex];
    if (sample) {
      setQuestions(prev => [...prev, { ...sample, id: `sample-${Date.now()}` }]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Upload Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Dropzone */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Tải ảnh hoặc PDF đề thi
              </h2>
              <span className="text-xs text-slate-400">
                Hỗ trợ kéo thả hoặc <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">Ctrl + V</kbd>
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                selectedImage 
                  ? 'border-blue-500/50 bg-blue-950/20 hover:border-blue-400' 
                  : 'border-slate-700 hover:border-blue-500/50 bg-slate-800/40 hover:bg-slate-800/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedImage ? (
                <div className="space-y-3 w-full">
                  <div className="relative max-h-48 mx-auto overflow-hidden rounded-lg border border-slate-700 shadow-md">
                    <img 
                      src={selectedImage} 
                      alt="Uploaded Exam" 
                      className="max-h-48 mx-auto object-contain bg-slate-950" 
                    />
                  </div>
                  <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã sẵn sàng phân tích đề thi
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-200">
                    Kéo & thả ảnh đề thi vào đây, hoặc nhấn để chọn file
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, WebP (Ảnh chụp đề thi học kỳ, đề kiểm tra, ảnh chụp màn hình)
                  </p>
                </div>
              )}
            </div>

            {/* Quick Sample Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Thử ngay mẫu chuẩn:
              </span>
              <button
                onClick={() => handleLoadSample(0)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                + Mẫu 1: Trắc nghiệm 4 lựa chọn (MCQ)
              </button>
              <button
                onClick={() => handleLoadSample(1)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                + Mẫu 2: Đúng / Sai 4 ý (GDPT 2018)
              </button>
              <button
                onClick={() => handleLoadSample(2)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                + Mẫu 3: Trả lời ngắn / Điền số
              </button>
            </div>
          </div>

          {/* Configuration & Action controls */}
          <div className="w-full lg:w-80 flex flex-col justify-between space-y-4 border-t lg:border-t-0 lg:border-l border-slate-800 lg:pl-6 pt-4 lg:pt-0">
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" /> Tùy chọn xuất mã \begin&#123;ex&#125;
              </h3>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Định dạng câu hỏi mục tiêu:</label>
                <select
                  value={questionTypeChoice}
                  onChange={(e) => setQuestionTypeChoice(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="auto">Tự động nhận diện (Khuyên dùng)</option>
                  <option value="mcq">Trắc nghiệm 4 đáp án (\choice)</option>
                  <option value="true_false">Đúng - Sai 4 ý a,b,c,d (\choiceTF)</option>
                  <option value="short_answer">Trả lời ngắn / Điền số (\shortans)</option>
                  <option value="essay">Tự luận / Câu hỏi mở</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="includeSol"
                  checked={includeSolution}
                  onChange={(e) => setIncludeSolution(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                />
                <label htmlFor="includeSol" className="text-xs text-slate-300 cursor-pointer">
                  Tự động sinh lời giải chi tiết <code className="text-blue-400 font-mono">\loigiai</code>
                </label>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300">
                💡 <strong>Chuẩn gói ex_test:</strong> Mã sinh ra tuân thủ đầy đủ macro <code>\choice</code>, <code>\choiceTF</code>, <code>\True</code>, <code>\loigiai</code> dùng trong đề thi THPT Quốc Gia.
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleRunOcr}
                disabled={isLoading || !selectedImage}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang OCR & Dựng mã {`{ex}`}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt đầu Chuyển đổi sang LaTeX</span>
                  </>
                )}
              </button>

              {selectedImage && (
                <button
                  onClick={handleComparePix2tex}
                  disabled={isComparing}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isComparing ? 'Đang trích xuất công thức...' : 'Trích xuất công thức đối chiếu (Pix2TeX)'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pix2TeX Compare Box (if used) */}
      {pix2texResult && (
        <div className="bg-slate-900 border border-cyan-800/60 rounded-xl p-4 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Scissors className="w-4 h-4" /> Kết quả đối chiếu công thức (Pix2TeX / Vision OCR Helper)
            </h4>
            <button
              onClick={() => {
                navigator.clipboard.writeText(pix2texResult);
              }}
              className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
            >
              Copy công thức
            </button>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto">
            {pix2texResult}
          </div>
        </div>
      )}

      {/* Questions Workspace */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Workspace Subheader Tabs */}
        <div className="border-b border-slate-800 px-6 py-3 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem trước KaTeX ({questions.length} câu)</span>
            </button>

            <button
              onClick={() => setViewMode('latex')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'latex'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Mã nguồn LaTeX ({`\\begin{ex}`})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newQ: ExamQuestion = {
                  id: `q-${Date.now()}`,
                  number: questions.length + 1,
                  type: 'mcq',
                  statement: 'Cho hàm số $y=f(x)$ liên tục trên $\\mathbb{R}$. Mệnh đề nào sau đây đúng?',
                  choices: [
                    { id: 'A', content: 'Phương án A', isCorrect: false },
                    { id: 'B', content: 'Phương án B', isCorrect: true },
                    { id: 'C', content: 'Phương án C', isCorrect: false },
                    { id: 'D', content: 'Phương án D', isCorrect: false },
                  ],
                  solution: 'Lời giải chi tiết câu hỏi...',
                  rawLatex: '',
                };
                setQuestions(prev => [...prev, newQ]);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Thêm câu mới</span>
            </button>

            {questions.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa toàn bộ danh sách câu hỏi hiện tại?')) {
                    setQuestions([]);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs font-medium border border-slate-700 hover:border-red-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === 'preview' ? (
          <div className="p-6 space-y-6">
            {questions.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-3">
                <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
                <p className="text-sm">Chưa có câu hỏi nào trong danh sách.</p>
                <p className="text-xs text-slate-500">
                  Hãy tải ảnh đề thi lên hoặc bấm một trong các nút mẫu chuẩn phía trên để bắt đầu!
                </p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <div 
                  key={q.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors shadow-sm"
                >
                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-400 font-mono text-sm px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                        Câu {idx + 1}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        q.type === 'mcq'
                          ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700'
                          : q.type === 'true_false'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-700'
                          : q.type === 'short_answer'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                          : 'bg-purple-950/60 text-purple-300 border-purple-700'
                      }`}>
                        {q.type === 'mcq' ? 'Trắc nghiệm 4 lựa chọn' : q.type === 'true_false' ? 'Đúng/Sai 4 ý (GDPT 2018)' : q.type === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'}
                      </span>
                      {q.difficulty && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {q.difficulty}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopySingle(q)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                        title="Copy mã \begin{ex} câu này"
                      >
                        {copiedId === q.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === q.id ? 'Đã copy' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSingle(q.id)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                        title="Xóa câu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Statement Statement rendered via KaTeX */}
                  <div 
                    className="text-slate-100 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderLatexToHtml(q.statement) }}
                  />

                  {/* Choices rendering */}
                  {q.type === 'mcq' && q.choices && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.choices.map((c) => (
                        <div
                          key={c.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 transition-colors ${
                            c.isCorrect
                              ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[11px] ${
                            c.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {c.id}.
                          </span>
                          <span 
                            className="flex-1"
                            dangerouslySetInnerHTML={{ __html: renderLatexToHtml(c.content) }}
                          />
                          {c.isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-emerald-400 border border-emerald-500/40 px-1 rounded">
                              \True
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True/False (choiceTF) rendering */}
                  {q.type === 'true_false' && q.choices && (
                    <div className="space-y-1.5 pt-1">
                      {q.choices.map((c) => (
                        <div
                          key={c.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                            c.isCorrect
                              ? 'bg-emerald-950/30 border-emerald-700/50 text-slate-200'
                              : 'bg-rose-950/30 border-rose-800/50 text-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <span className="font-bold text-slate-300 font-mono text-[12px]">{c.id})</span>
                            <span dangerouslySetInnerHTML={{ __html: renderLatexToHtml(c.content) }} />
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            c.isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {c.isCorrect ? 'ĐÚNG (\\True)' : 'SAI'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Short Answer */}
                  {q.type === 'short_answer' && q.shortAnswer && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-center gap-2 text-xs text-emerald-200">
                      <span className="font-semibold text-emerald-400">Đáp số (\shortans):</span>
                      <span className="font-mono font-bold bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-700/50">
                        {q.shortAnswer}
                      </span>
                    </div>
                  )}

                  {/* Solution Collapsible Section */}
                  {q.solution && (
                    <div className="border-t border-slate-800/80 pt-3">
                      <button
                        onClick={() => toggleSolution(q.id)}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                      >
                        {expandedSolutions[q.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>Lời giải chi tiết (\loigiai)</span>
                      </button>

                      {expandedSolutions[q.id] && (
                        <div className="mt-2.5 p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
                          <div dangerouslySetInnerHTML={{ __html: renderLatexToHtml(q.solution) }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Raw LaTeX Editor View */
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Trình biên tập trực tiếp khối <code className="text-blue-400 font-mono">\begin&#123;ex&#125; ... \end&#123;ex&#125;</code>:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawLatexText);
                  setCopiedId('raw-all');
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700"
              >
                {copiedId === 'raw-all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'raw-all' ? 'Đã copy tất cả' : 'Copy tất cả'}</span>
              </button>
            </div>

            <textarea
              value={rawLatexText}
              onChange={(e) => handleUpdateRawLatex(e.target.value)}
              rows={22}
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-xl p-4 focus:outline-none focus:border-blue-500 leading-relaxed scrollbar-thin"
              placeholder="\begin{ex}&#10;Nội dung câu hỏi...&#10;\choice&#10;{A}&#10;{\True B}&#10;{C}&#10;{D}&#10;\loigiai{...}&#10;\end{ex}"
            />
            <p className="text-[11px] text-slate-500">
              Mẹo: Bất kỳ chỉnh sửa nào tại đây sẽ tự động đồng bộ và hiển thị trên tab Xem trước KaTeX.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
