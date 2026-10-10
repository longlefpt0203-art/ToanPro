import katex from 'katex';
import { ExamQuestion, QuestionType } from '../types';

/**
 * Format an ExamQuestion object into standard \begin{ex} ... \end{ex} LaTeX string
 */
export function buildLatexEx(question: ExamQuestion): string {
  const parts: string[] = [];
  
  // Tag / metadata header comment
  const meta: string[] = [];
  if (question.title) meta.push(question.title);
  if (question.difficulty) meta.push(question.difficulty);
  if (question.topic) meta.push(question.topic);
  
  if (meta.length > 0) {
    parts.push(`% [${meta.join(' - ')}]`);
  }
  
  parts.push('\\begin{ex}');
  
  // Statement
  const statement = question.statement.trim();
  parts.push(statement);
  
  // TikZ code if embedded
  if (question.hasTikz && question.tikzCode) {
    parts.push('\\begin{center}');
    parts.push(question.tikzCode.trim());
    parts.push('\\end{center}');
  }
  
  // Choices according to format
  if (question.type === 'mcq' && question.choices && question.choices.length > 0) {
    parts.push('\\choice');
    question.choices.forEach(c => {
      const isTrue = c.isCorrect ? '\\True ' : '';
      parts.push(`{${isTrue}${c.content.trim()}}`);
    });
  } else if (question.type === 'true_false' && question.choices && question.choices.length > 0) {
    parts.push('\\choiceTF');
    question.choices.forEach(c => {
      const isTrue = c.isCorrect ? '\\True ' : '';
      parts.push(`{${isTrue}${c.content.trim()}}`);
    });
  } else if (question.type === 'short_answer' && question.shortAnswer) {
    parts.push(`\\shortans{${question.shortAnswer.trim()}}`);
  }
  
  // Solution \loigiai{...}
  if (question.solution && question.solution.trim()) {
    parts.push('\\loigiai{');
    parts.push(question.solution.trim());
    parts.push('}');
  }
  
  parts.push('\\end{ex}');
  return parts.join('\n');
}

/**
 * Parse raw latex string containing multiple \begin{ex} ... \end{ex} blocks into structured ExamQuestion array
 */
export function parseExBlocks(rawText: string): ExamQuestion[] {
  const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/g;
  const questions: ExamQuestion[] = [];
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = exRegex.exec(rawText)) !== null) {
    const blockContent = match[1];
    const fullBlock = match[0];

    // Check for \loigiai{...}
    let solution = '';
    let contentWithoutSolution = blockContent;
    const loigiaiMatch = /\\loigiai\{([\s\S]*)\}(?=\s*$)/.exec(blockContent);
    if (loigiaiMatch) {
      solution = loigiaiMatch[1];
      contentWithoutSolution = blockContent.replace(loigiaiMatch[0], '');
    }

    // Determine type and choices
    let type: QuestionType = 'essay';
    const choices: { id: string; content: string; isCorrect: boolean }[] = [];
    let shortAnswer: string | undefined;

    // Check for \choiceTF {..}{..}{..}{..}
    if (contentWithoutSolution.includes('\\choiceTF')) {
      type = 'true_false';
      const tfParts = extractBracketGroups(contentWithoutSolution.split('\\choiceTF')[1] || '');
      const labels = ['a', 'b', 'c', 'd'];
      tfParts.slice(0, 4).forEach((part, i) => {
        const isCorrect = part.includes('\\True');
        const cleanContent = part.replace(/\\True\s*/g, '').trim();
        choices.push({
          id: labels[i] || `ý ${i + 1}`,
          content: cleanContent,
          isCorrect,
        });
      });
      contentWithoutSolution = contentWithoutSolution.split('\\choiceTF')[0];
    } else if (contentWithoutSolution.includes('\\choice')) {
      type = 'mcq';
      const mcqParts = extractBracketGroups(contentWithoutSolution.split('\\choice')[1] || '');
      const labels = ['A', 'B', 'C', 'D'];
      mcqParts.slice(0, 4).forEach((part, i) => {
        const isCorrect = part.includes('\\True');
        const cleanContent = part.replace(/\\True\s*/g, '').trim();
        choices.push({
          id: labels[i] || `${i + 1}`,
          content: cleanContent,
          isCorrect,
        });
      });
      contentWithoutSolution = contentWithoutSolution.split('\\choice')[0];
    } else if (contentWithoutSolution.includes('\\shortans')) {
      type = 'short_answer';
      const shortansMatch = /\\shortans\{([^}]+)\}/.exec(contentWithoutSolution);
      if (shortansMatch) {
        shortAnswer = shortansMatch[1].trim();
        contentWithoutSolution = contentWithoutSolution.replace(shortansMatch[0], '');
      }
    }

    // Check for tikz
    let tikzCode = '';
    let hasTikz = false;
    const tikzMatch = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/.exec(contentWithoutSolution);
    if (tikzMatch) {
      hasTikz = true;
      tikzCode = tikzMatch[0];
      contentWithoutSolution = contentWithoutSolution.replace(tikzMatch[0], '');
      contentWithoutSolution = contentWithoutSolution.replace(/\\begin\{center\}\s*\\end\{center\}/g, '');
    }

    const statement = contentWithoutSolution.trim();

    questions.push({
      id: `q-${Date.now()}-${index}`,
      number: index,
      type,
      statement,
      choices: choices.length > 0 ? choices : undefined,
      shortAnswer,
      solution: solution.trim(),
      rawLatex: fullBlock,
      hasTikz,
      tikzCode: tikzCode || undefined,
      difficulty: 'Thông hiểu',
    });

    index++;
  }

  // If no \begin{ex} found, wrap entire text as single question
  if (questions.length === 0 && rawText.trim().length > 0) {
    questions.push({
      id: `q-${Date.now()}-1`,
      number: 1,
      type: 'essay',
      statement: rawText.trim(),
      rawLatex: `\\begin{ex}\n${rawText.trim()}\n\\end{ex}`,
      difficulty: 'Thông hiểu',
    });
  }

  return questions;
}

/**
 * Helper to extract balanced curly braces groups {group1} {group2} ...
 */
function extractBracketGroups(str: string): string[] {
  const groups: string[] = [];
  let depth = 0;
  let current = '';
  let inGroup = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{') {
      if (depth === 0) {
        inGroup = true;
        current = '';
      } else {
        current += char;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        inGroup = false;
        groups.push(current.trim());
      } else {
        current += char;
      }
    } else if (inGroup) {
      current += char;
    }
  }

  return groups;
}

/**
 * Generate full standalone .tex file document compatible with TeXStudio and Overleaf
 */
export function generateFullDocumentTex(questions: ExamQuestion[], title: string = 'Đề Thi Thử Nghiệm - ExTeX Studio'): string {
  const questionsLatex = questions.map(q => buildLatexEx(q)).join('\n\n% =========================================\n\n');

  return `% =======================================================
% TÀI LIỆU BIÊN SOẠN BẰNG EXTEX STUDIO
% Chuẩn cấu trúc đề thi THPT Bộ Giáo dục & Đào tạo (GDPT 2018)
% Hỗ trợ biên dịch trên TeXStudio, Overleaf, VS Code LaTeX Workshop
% =======================================================
\\documentclass[12pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb,amsfonts,amsthm}
\\usepackage{geometry}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}

\\usepackage{tikz}
\\usepackage{tkz-tab}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\usetikzlibrary{calc,arrows.meta,intersections,shapes.geometric}

\\usepackage{multicol}
\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\lhead{ExTeX Studio - Đề Thi Chuẩn}
\\rhead{\\thepage}
\\cfoot{}

% --- Giả lập hoặc nạp gói ex_test ---
\\makeatletter
\\@ifundefined{ex}{
  \\newcounter{excounter}
  \\newenvironment{ex}[1][]{%
    \\refstepcounter{excounter}%
    \\par\\medskip\\noindent\\textbf{Câu \\theexcounter.}~#1\\ignorespaces
  }{\\par\\medskip}
}{}

\\@ifundefined{choice}{
  \\newcommand{\\choice}[4]{%
    \\par\\noindent
    \\begin{tabular}{p{0.48\\linewidth}p{0.48\\linewidth}}
      \\textbf{A.} #1 & \\textbf{B.} #2 \\\\[4pt]
      \\textbf{C.} #3 & \\textbf{D.} #4
    \\end{tabular}\\par
  }
}{}

\\@ifundefined{choiceTF}{
  \\newcommand{\\choiceTF}[4]{%
    \\par\\noindent
    \\begin{tabular}{p{0.48\\linewidth}p{0.48\\linewidth}}
      a) #1 & b) #2 \\\\[4pt]
      c) #3 & d) #4
    \\end{tabular}\\par
  }
}{}

\\@ifundefined{True}{\\newcommand{\\True}{}}{}
\\@ifundefined{shortans}{\\newcommand{\\shortans}[1]{\\par\\textbf{Đáp số:} #1\\par}}{}
\\@ifundefined{loigiai}{
  \\newcommand{\\loigiai}[1]{%
    \\par\\smallskip\\noindent\\textit{\\textbf{Lời giải.}}~#1\\par
  }
}{}
\\makeatother

\\begin{document}

\\begin{center}
  {\\Large\\bfseries ${title.toUpperCase()}}\\\\[6pt]
  {\\small\\itshape Thời gian làm bài: 90 phút (Không kể thời gian phát đề)}\\\\[12pt]
  \\hrule height 1pt
\\end{center}
\\vspace{10pt}

${questionsLatex}

\\end{document}
`;
}

/**
 * Safely render LaTeX string using KaTeX (mixed text and math $...$ and $$...$$)
 */
export function renderLatexToHtml(input: string): string {
  if (!input) return '';

  // Clean common LaTeX macros for KaTeX preview display
  let text = input
    .replace(/\\True/g, '✓')
    .replace(/\\bfseries/g, '')
    .replace(/\\itshape/g, '')
    .replace(/\\par/g, '<br/>');

  // Replace $$ ... $$ display math
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return `<div class="katex-display my-2 flex justify-center">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="text-red-500 font-mono text-xs">[Math error: ${math}]</div>`;
    }
  });

  // Replace $ ... $ inline math
  text = text.replace(/\$([^\$]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-500 font-mono text-xs">[${math}]</span>`;
    }
  });

  // Convert line breaks to <br/>
  return text.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, ' ');
}
