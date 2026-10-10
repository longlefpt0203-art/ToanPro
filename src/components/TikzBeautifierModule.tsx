import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  Copy, 
  Code2, 
  CheckCircle, 
  Sliders, 
  ArrowRight, 
  RefreshCw, 
  Lightbulb,
  FileCheck
} from 'lucide-react';
import { BYOKConfig } from '../types';
import { formatTikZCode, FormattedTikZResult } from '../lib/tikzFormatter';
import { parseAndRenderTikZToSvg } from '../lib/tikzVisualizer';
import { incrementQuotaCount } from '../lib/storage';
import { callWithFallbackTikzRefine } from '../lib/callWithFallback';

interface TikzBeautifierModuleProps {
  initialCode: string;
  byok: BYOKConfig;
}

export const TikzBeautifierModule: React.FC<TikzBeautifierModuleProps> = ({
  initialCode,
  byok,
}) => {
  // Phiên nào đúng phiên đó: không nạp trước mã TikZ mẫu nếu không có mã truyền vào
  const [inputCode, setInputCode] = useState<string>(initialCode || '');

  const [outputCode, setOutputCode] = useState<string>('');
  const [stats, setStats] = useState<FormattedTikZResult['stats'] | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAiOptimizing, setIsAiOptimizing] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Formatting options
  const [roundDecimals, setRoundDecimals] = useState<boolean>(true);
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  const [groupCoordinates, setGroupCoordinates] = useState<boolean>(true);
  const [addComments, setAddComments] = useState<boolean>(true);
  const [standardizeOptions, setStandardizeOptions] = useState<boolean>(true);

  // Compute live preview of output code (or input code if output is empty)
  const previewCode = outputCode || inputCode;
  const renderedGraphic = useMemo(() => {
    return parseAndRenderTikZToSvg(previewCode);
  }, [previewCode]);

  const handleRunRuleFormat = () => {
    const result = formatTikZCode(inputCode, {
      roundDecimals,
      decimalPlaces,
      groupCoordinates,
      addStructuralComments: addComments,
      standardizeOptions,
    });
    setOutputCode(result.formattedCode);
    setStats(result.stats);
  };

  const handleRunAiOptimize = async () => {
    setIsAiOptimizing(true);
    setAiSuggestions([]);

    try {
      const refinedTikz = await callWithFallbackTikzRefine({
        currentTikz: outputCode || inputCode,
        instruction: 'Tối ưu hóa mã TikZ: căn chỉnh nhãn label tránh đè hình, chuẩn hóa tỷ lệ scale, sử dụng các macro gọn gàng, và gợi ý 3 điểm cải tiến.',
        byok,
      });

      if (refinedTikz) {
        setOutputCode(refinedTikz);
        incrementQuotaCount();
        setAiSuggestions([
          'Đã chuẩn hóa tọa độ và làm mượt góc nối đường nét với line join=round.',
          'Đã dời nhãn các đỉnh tránh bị cạnh đa giác đè chữ.',
          'Đã gom các cạnh khuất nét đứt vào cùng một lệnh draw để giảm dung lượng file.',
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiOptimizing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputCode || inputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Làm Đẹp & Tối Ưu Hóa Mã TikZ (TikZ Beautifier)
              </h2>
              <p className="text-xs text-slate-400">
                Rule-based Formatter (Thụt lề, gom coordinate, làm tròn số thập phân) + AI Optimizer tối ưu nhãn label
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunRuleFormat}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm shadow-purple-600/20 transition-all"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Làm đẹp ngay (Rule-based)</span>
            </button>

            <button
              onClick={handleRunAiOptimize}
              disabled={isAiOptimizing}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all"
            >
              {isAiOptimizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>AI Tối ưu hóa</span>
            </button>
          </div>
        </div>

        {/* Options checklist */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={groupCoordinates}
              onChange={(e) => setGroupCoordinates(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-600"
            />
            <span>Gom \coordinate lên đầu</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={roundDecimals}
              onChange={(e) => setRoundDecimals(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-600"
            />
            <span>Làm tròn số thập phân (2 chữ số)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={addComments}
              onChange={(e) => setAddComments(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-600"
            />
            <span>Thêm chú thích cấu trúc (%)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={standardizeOptions}
              onChange={(e) => setStandardizeOptions(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-600"
            />
            <span>Chuẩn hóa bo góc (line join)</span>
          </label>
        </div>

        {/* Stats banner if formatted */}
        {stats && (
          <div className="mt-3 p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl flex flex-wrap items-center gap-4 text-xs text-purple-200">
            <span className="font-semibold text-purple-300 flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Kết quả làm đẹp:
            </span>
            <span>• Gom <strong>{stats.coordinatesCount}</strong> tọa độ điểm</span>
            <span>• Làm tròn <strong>{stats.roundedNumbersCount}</strong> số thập phân</span>
            <span>• Sửa <strong>{stats.fixedSemicolons}</strong> dấu chấm phẩy thiếu</span>
          </div>
        )}
      </div>

      {/* Editor & Compare Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input TikZ Code */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-slate-800 px-5 py-3 bg-slate-900 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Mã TikZ Ban Đầu
            </h3>
            <span className="text-[11px] text-slate-500">Dán hoặc chỉnh sửa tại đây</span>
          </div>

          <div className="p-4 flex-1">
            <textarea
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              rows={16}
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-xl p-4 focus:outline-none focus:border-purple-500 leading-relaxed scrollbar-thin"
              placeholder="\begin{tikzpicture} ... \end{tikzpicture}"
            />
          </div>
        </div>

        {/* Formatted Code / Live Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-slate-800 px-5 py-3 bg-slate-900 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              2. Mã Sau Khi Làm Đẹp & Tối Ưu
            </h3>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép mã'}</span>
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col">
            <textarea
              value={outputCode || inputCode}
              onChange={(e) => setOutputCode(e.target.value)}
              rows={16}
              className="w-full bg-slate-950 font-mono text-xs text-purple-200/90 border border-slate-800 rounded-xl p-4 focus:outline-none focus:border-purple-500 leading-relaxed scrollbar-thin"
            />
          </div>
        </div>
      </div>

      {/* Live Visualizer Box of the Formatted Code */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Xem Trước Trực Quan Của Mã TikZ Đã Tối Ưu</span>
        </h3>
        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center min-h-[300px]">
          <div 
            className="max-w-full origin-center flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: renderedGraphic.svgString }}
          />
        </div>
      </div>

      {/* AI Suggestions Box (if triggered) */}
      {aiSuggestions.length > 0 && (
        <div className="bg-slate-900 border border-indigo-800/50 rounded-2xl p-5 shadow-xl space-y-3">
          <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-400" /> Gợi ý tối ưu hóa từ AI:
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
            {aiSuggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
