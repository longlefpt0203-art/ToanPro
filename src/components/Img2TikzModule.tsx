import React, { useState, useMemo } from 'react';
import { 
  Shapes, 
  Upload, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Send, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Wand2,
  Image as ImageIcon
} from 'lucide-react';
import { BYOKConfig, TikZProject } from '../types';
import { SAMPLE_TIKZ_PROJECTS } from '../data/samples';
import { parseAndRenderTikZToSvg } from '../lib/tikzVisualizer';
import { incrementQuotaCount, getSavedTikZProjects, saveTikZProjects } from '../lib/storage';

interface Img2TikzModuleProps {
  byok: BYOKConfig;
  onSendToBeautifier: (code: string) => void;
}

export const Img2TikzModule: React.FC<Img2TikzModuleProps> = ({
  byok,
  onSendToBeautifier,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active TikZ Code
  const [activeTikzCode, setActiveTikzCode] = useState<string>(SAMPLE_TIKZ_PROJECTS[0].code);
  const [refinePrompt, setRefinePrompt] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Rendered SVG
  const renderedGraphic = useMemo(() => {
    return parseAndRenderTikZToSvg(activeTikzCode);
  }, [activeTikzCode]);

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

  const handleGenerateTikz = async () => {
    if (!selectedImage) {
      setErrorMessage('Vui lòng chọn hoặc kéo thả ảnh hình vẽ / đồ thị.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/img2tikz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: imageMime,
          byok,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi chuyển ảnh sang TikZ.');
      }

      if (data.tikz) {
        setActiveTikzCode(data.tikz);
        incrementQuotaCount();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo mã TikZ.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineTikz = async () => {
    if (!refinePrompt.trim()) return;

    setIsRefining(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/tikz-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTikz: activeTikzCode,
          instruction: refinePrompt,
          byok,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tinh chỉnh TikZ.');
      }

      if (data.tikz) {
        setActiveTikzCode(data.tikz);
        setRefinePrompt('');
        incrementQuotaCount();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tinh chỉnh mã TikZ.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTikzCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([renderedGraphic.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TikZ_Figure_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Shapes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Ảnh → TikZ (Hình học & Đồ thị & Bảng biến thiên)
              </h2>
              <p className="text-xs text-slate-400">
                Nhận diện hình ảnh hình học 3D, đồ thị hàm số Oxy, bảng biến thiên tkz-tab • Live Preview tương tác
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Hình mẫu:</span>
            {SAMPLE_TIKZ_PROJECTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveTikzCode(p.code)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                {p.title.split(' ')[0]} {p.title.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Upload & Convert Grid */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Tải ảnh hình vẽ đề thi (hoặc chọn hình mẫu phía trên):
            </label>
            <div
              onClick={() => document.getElementById('tikz-image-upload')?.click()}
              className="border-2 border-dashed border-slate-700 rounded-xl p-5 text-center bg-slate-950/40 hover:border-amber-500/50 cursor-pointer transition-colors min-h-[140px] flex flex-col items-center justify-center"
            >
              <input
                id="tikz-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
                }}
              />
              {selectedImage ? (
                <div className="space-y-2">
                  <img src={selectedImage} alt="Uploaded geometry" className="max-h-32 mx-auto rounded object-contain" />
                  <p className="text-xs text-amber-400 font-medium">Đã tải ảnh lên. Nhấn bắt đầu bên dưới!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageIcon className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-200">Kéo & thả ảnh hình học hoặc đồ thị vào đây</p>
                  <p className="text-[11px] text-slate-500">Hỗ trợ hình chóp, lăng trụ, đồ thị hàm bậc 3/trùng phương, bảng biến thiên</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-end space-y-3">
            {errorMessage && (
              <p className="text-xs text-red-300 bg-red-950/50 border border-red-800 p-2.5 rounded-lg">
                {errorMessage}
              </p>
            )}

            <button
              onClick={handleGenerateTikz}
              disabled={isGenerating || !selectedImage}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang dựng mã TikZ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Chuyển ảnh thành TikZ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-side Workspace: Live Preview & Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Live Visualizer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-slate-800 px-5 py-3 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Preview (SVG Vector)
              </h3>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-slate-400 font-mono w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.2))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDownloadSvg}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
                title="Tải ảnh vector SVG"
              >
                <Download className="w-3 h-3" />
                <span>Xuất SVG</span>
              </button>
            </div>
          </div>

          {/* SVG Viewport */}
          <div className="p-6 bg-slate-950 flex-1 flex items-center justify-center overflow-auto min-h-[360px]">
            <div 
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease' }}
              className="max-w-full origin-center flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: renderedGraphic.svgString }}
            />
          </div>

          {/* Refine / Chat Assistant Footer */}
          <div className="border-t border-slate-800 p-4 bg-slate-900/95 space-y-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5 text-amber-400" /> Chat tinh chỉnh trực tiếp hình vẽ TikZ:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRefineTikz();
                }}
                placeholder="Ví dụ: Đổi màu cạnh thành đỏ, thêm điểm M trên SA, nét đứt AC..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleRefineTikz}
                disabled={isRefining || !refinePrompt.trim()}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {isRefining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Gửi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-slate-800 px-5 py-3 bg-slate-900 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Mã Nguồn TikZ (tikzpicture)
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => onSendToBeautifier(activeTikzCode)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800 transition-colors"
                title="Gửi sang tab Làm đẹp & Tối ưu TikZ"
              >
                <Sparkles className="w-3 h-3" />
                <span>Làm đẹp TikZ</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Đã sao chép' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col">
            <textarea
              value={activeTikzCode}
              onChange={(e) => setActiveTikzCode(e.target.value)}
              rows={18}
              className="w-full flex-1 bg-slate-950 font-mono text-xs text-amber-200/90 border border-slate-800 rounded-xl p-4 focus:outline-none focus:border-amber-500 leading-relaxed scrollbar-thin"
              placeholder="\begin{tikzpicture}&#10;...&#10;\end{tikzpicture}"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Bạn có thể sửa trực tiếp tọa độ (x,y) hoặc các đường nét ở đây; bản xem trước SVG bên trái sẽ tự động phản ánh thay đổi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
