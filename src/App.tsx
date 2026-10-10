import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OcrExModule } from './components/OcrExModule';
import { MathSolverModule } from './components/MathSolverModule';
import { Img2TikzModule } from './components/Img2TikzModule';
import { TikzBeautifierModule } from './components/TikzBeautifierModule';
import { SettingsModule } from './components/SettingsModule';
import { ExamQuestion, BYOKConfig } from './types';
import { getBYOKConfig, saveBYOKConfig } from './lib/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ocr' | 'solve' | 'img2tikz' | 'beautify' | 'settings'>('ocr');
  // Phiên nào đúng phiên đó: khởi tạo danh sách câu hỏi trống ban đầu
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [byok, setByok] = useState<BYOKConfig>(() => getBYOKConfig());
  const [beautifierCode, setBeautifierCode] = useState<string>('');

  // Persist BYOK config automatically
  useEffect(() => {
    saveBYOKConfig(byok);
  }, [byok]);

  const handleAddQuestionToExam = (newQ: ExamQuestion) => {
    setQuestions(prev => [...prev, { ...newQ, number: prev.length + 1 }]);
    setActiveTab('ocr');
  };

  const handleSendToBeautifier = (code: string) => {
    setBeautifierCode(code);
    setActiveTab('beautify');
  };

  const isByokActive = Boolean(byok.geminiKey || byok.groqKey || byok.openRouterKey);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        questions={questions}
        isByokActive={isByokActive}
      />

      {/* Main Module Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'ocr' && (
          <OcrExModule
            questions={questions}
            setQuestions={setQuestions}
            byok={byok}
          />
        )}

        {activeTab === 'solve' && (
          <MathSolverModule
            byok={byok}
            onAddQuestionToExam={handleAddQuestionToExam}
          />
        )}

        {activeTab === 'img2tikz' && (
          <Img2TikzModule
            byok={byok}
            onSendToBeautifier={handleSendToBeautifier}
          />
        )}

        {activeTab === 'beautify' && (
          <TikzBeautifierModule
            initialCode={beautifierCode}
            byok={byok}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModule
            byok={byok}
            setByok={setByok}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            <strong>ExTeX Studio</strong> — Nền tảng biên soạn đề thi Toán học chuẩn LaTeX gói <code className="text-blue-400 font-mono">ex_test</code> & GDPT 2018.
          </p>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>BYOK Fallback: Gemini • Groq • OpenRouter</span>
            <span>•</span>
            <span>Tương thích: TeXStudio, Overleaf, VSCode</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
