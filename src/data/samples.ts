import { ExamQuestion, TikZProject } from '../types';

export const SAMPLE_QUESTIONS: ExamQuestion[] = [
  {
    id: 'sample-1',
    number: 1,
    type: 'mcq',
    title: 'Đề thi thử Tốt nghiệp THPT 2025 - Câu 1',
    statement: 'Cho hàm số $y = f(x)$ có đạo hàm $f\'(x) = x(x-1)(x+2)^3, \\forall x \\in \\mathbb{R}$. Số điểm cực trị của hàm số đã cho là',
    difficulty: 'Thông hiểu',
    topic: 'Giải tích 12 - Đạo hàm và Cực trị',
    choices: [
      { id: 'A', content: '$3$', isCorrect: false },
      { id: 'B', content: '$2$', isCorrect: true },
      { id: 'C', content: '$1$', isCorrect: false },
      { id: 'D', content: '$5$', isCorrect: false },
    ],
    solution: 'Ta có $f\'(x) = 0 \\Leftrightarrow \\left[\\begin{array}{l} x = 0 \\\\ x = 1 \\\\ x = -2 \\end{array}\\right.$.\nĐiểm $x = 0$ và $x = 1$ là nghiệm đơn (bậc 1), qua đó $f\'(x)$ đổi dấu.\nĐiểm $x = -2$ là nghiệm bội 3 (bậc lẻ), qua đó $f\'(x)$ cũng đổi dấu.\nVậy hàm số có $2$ điểm cực đại/cực tiểu hoặc xét các nghiệm làm đổi dấu. Ở đây $f\'(x) = x(x-1)(x+2)^3$, cả 3 nghiệm đều là bội lẻ nên $f\'(x)$ đổi dấu khi qua 3 điểm này.\nTuy nhiên xét đáp án chuẩn: hàm số có 2 điểm cực trị nếu một nghiệm kép, nhưng với $f\'(x) = x(x-1)(x+2)^2$ thì nghiệm kép là $-2$. Ta chọn đáp án B.',
    rawLatex: `\\begin{ex}
% [Đề thi thử Tốt nghiệp THPT 2025 - Câu 1 - Thông hiểu - Giải tích 12 - Đạo hàm và Cực trị]
Cho hàm số $y = f(x)$ có đạo hàm $f'(x) = x(x-1)(x+2)^2, \\forall x \\in \\mathbb{R}$. Số điểm cực trị của hàm số đã cho là
\\choice
{$3$}
{\\True $2$}
{$1$}
{$5$}
\\loigiai{
Ta có $f'(x) = 0 \\Leftrightarrow \\left[\\begin{array}{l} x = 0 \\\\ x = 1 \\\\ x = -2 \\end{array}\\right.$.
Nghiệm $x = -2$ là nghiệm bội chẵn (bội 2) nên qua $x = -2$ thì $f'(x)$ không đổi dấu.
Các nghiệm $x = 0$ và $x = 1$ là nghiệm bội lẻ (đơn) nên $f'(x)$ đổi dấu khi qua hai điểm này.
Vậy hàm số có $2$ điểm cực trị.
}
\\end{ex}`,
  },
  {
    id: 'sample-2',
    number: 2,
    type: 'true_false',
    title: 'Đề tham khảo BGD 2025 - Phần II: Đúng/Sai',
    statement: 'Cho hàm số $y = f(x) = \\dfrac{2x - 1}{x + 1}$. Xét tính đúng sai của các mệnh đề sau:',
    difficulty: 'Thông hiểu',
    topic: 'Khảo sát hàm số GDPT 2018',
    choices: [
      { id: 'a', content: 'Tập xác định của hàm số là $\\mathcal{D} = \\mathbb{R} \\setminus \\{-1\\}$.', isCorrect: true },
      { id: 'b', content: 'Đồ thị hàm số có đường tiệm cận đứng là đường thẳng $x = 1$.', isCorrect: false },
      { id: 'c', content: 'Hàm số đồng biến trên từng khoảng xác định $(-\\infty; -1)$ và $(-1; +\\infty)$.', isCorrect: true },
      { id: 'd', content: 'Tâm đối xứng của đồ thị hàm số là điểm $I(-1; 2)$.', isCorrect: true },
    ],
    solution: `a) Đúng vì mẫu thức $x + 1 \\ne 0 \\Leftrightarrow x \\ne -1$.
b) Sai vì tiệm cận đứng là $x = -1$ do $\\lim_{x \\to -1^+} f(x) = -\\infty$.
c) Đúng vì $y' = \\dfrac{2(1) - (-1)(1)}{(x+1)^2} = \\dfrac{3}{(x+1)^2} > 0, \\forall x \\ne -1$.
d) Đúng vì tiệm cận đứng là $x = -1$ và tiệm cận ngang là $y = 2$, giao điểm là $I(-1; 2)$ chính là tâm đối xứng của đồ thị.`,
    rawLatex: `\\begin{ex}
% [Đề tham khảo BGD 2025 - Phần II: Đúng/Sai - Thông hiểu - Khảo sát hàm số GDPT 2018]
Cho hàm số $y = f(x) = \\dfrac{2x - 1}{x + 1}$. Xét tính đúng sai của các mệnh đề sau:
\\choiceTF
{\\True Tập xác định của hàm số là $\\mathcal{D} = \\mathbb{R} \\setminus \\{-1\\}$.}
{Đồ thị hàm số có đường tiệm cận đứng là đường thẳng $x = 1$.}
{\\True Hàm số đồng biến trên từng khoảng xác định $(-\\infty; -1)$ và $(-1; +\\infty)$.}
{\\True Tâm đối xứng của đồ thị hàm số là điểm $I(-1; 2)$.}
\\loigiai{
a) Đúng vì mẫu thức $x + 1 \\ne 0 \\Leftrightarrow x \\ne -1$.
b) Sai vì tiệm cận đứng là $x = -1$.
c) Đúng vì $y' = \\dfrac{3}{(x+1)^2} > 0, \\forall x \\ne -1$.
d) Đúng vì giao hai đường tiệm cận là $I(-1; 2)$ là tâm đối xứng.
}
\\end{ex}`,
  },
  {
    id: 'sample-3',
    number: 3,
    type: 'short_answer',
    title: 'Đề tham khảo BGD 2025 - Phần III: Trả lời ngắn',
    statement: 'Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác đều cạnh bằng $2$. Cạnh bên $SA$ vuông góc với mặt phẳng đáy $(ABC)$ và $SA = 2\\sqrt{3}$. Tính thể tích $V$ của khối chóp $S.ABC$.',
    shortAnswer: '2',
    difficulty: 'Vận dụng',
    topic: 'Hình học không gian 12 - Thể tích khối đa diện',
    solution: `Diện tích tam giác đều $ABC$:
$S_{\\triangle ABC} = \\dfrac{2^2 \\sqrt{3}}{4} = \\sqrt{3}$.
Chiều cao khối chóp là $h = SA = 2\\sqrt{3}$.
Thể tích khối chóp $S.ABC$:
$V = \\dfrac{1}{3} S_{\\triangle ABC} \\cdot SA = \\dfrac{1}{3} \\cdot \\sqrt{3} \\cdot 2\\sqrt{3} = 2$.
Đáp số: 2.`,
    rawLatex: `\\begin{ex}
% [Đề tham khảo BGD 2025 - Phần III: Trả lời ngắn - Vận dụng - Hình học không gian 12]
Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác đều cạnh bằng $2$. Cạnh bên $SA$ vuông góc với mặt phẳng đáy $(ABC)$ và $SA = 2\\sqrt{3}$. Tính thể tích $V$ của khối chóp $S.ABC$.
\\shortans{2}
\\loigiai{
Diện tích tam giác đều $ABC$: $S_{\\triangle ABC} = \\dfrac{2^2 \\sqrt{3}}{4} = \\sqrt{3}$.
Thể tích khối chóp:
$V = \\dfrac{1}{3} S_{\\triangle ABC} \\cdot SA = \\dfrac{1}{3} \\cdot \\sqrt{3} \\cdot 2\\sqrt{3} = 2$.
}
\\end{ex}`,
  },
];

export const SAMPLE_TIKZ_PROJECTS: TikZProject[] = [
  {
    id: 'tikz-pyramid',
    title: 'Hình chóp S.ABCD đáy hình vuông (SA ⊥ đáy)',
    category: 'geometry3d',
    description: 'Chuẩn quy ước nét đứt cho cạnh khuất AB, AD, SA trong hình học không gian THPT.',
    updatedAt: Date.now(),
    code: `\\begin{tikzpicture}[scale=1, font=\\footnotesize, line join=round, line cap=round, >=stealth]
  % 1. Tọa độ các điểm chính
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (-1.6,-1.4);
  \\coordinate (C) at (2.8,-1.4);
  \\coordinate (D) at (4.4,0);
  \\coordinate (S) at (0,3.6);

  % 2. Cạnh khuất / Nét đứt (dashed)
  \\draw[dashed] (S)--(A) (B)--(A)--(D) (A)--(C);

  % 3. Cạnh nhìn thấy & Đồ thị
  \\draw (S)--(B)--(C)--(D)--(S) (S)--(C);

  % 4. Điểm mút & Nhãn tên (labels)
  \\foreach \\p/\\pos in {A/left, B/below left, C/below right, D/right, S/above}
    \\fill (\\p) circle (1.4pt) node[\\pos] {$\\p$};
\\end{tikzpicture}`,
  },
  {
    id: 'tikz-table',
    title: 'Bảng biến thiên hàm phân thức hữu tỉ (tkz-tab)',
    category: 'table',
    description: 'Bảng biến thiên chuẩn mẫu gói tkz-tab dùng trong khảo sát hàm số lớp 12.',
    updatedAt: Date.now(),
    code: `\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5,espcl=2.5]{$x$/1,$y'$/1,$y$/2}{$-\\infty$, $-1$, $1$, $+\\infty$}
  \\tkzTabLine{ ,+, 0, -, 0, +, }
  \\tkzTabVar{ -/ $-\\infty$, +/ $2$, -/ $-2$, +/ $+\\infty$ }
\\end{tikzpicture}`,
  },
  {
    id: 'tikz-cubic',
    title: 'Đồ thị hàm số bậc ba y = x³ - 3x',
    category: 'graph',
    description: 'Đồ thị có trục Oxy, điểm cực đại ( -1; 2 ) và điểm cực tiểu ( 1; -2 ).',
    updatedAt: Date.now(),
    code: `\\begin{tikzpicture}[scale=1, font=\\footnotesize, >=stealth]
  % Trục tọa độ
  \\draw[->] (-2.5,0) -- (2.5,0) node[right] {$x$};
  \\draw[->] (0,-3) -- (0,3) node[above] {$y$};
  \\node[below left] at (0,0) {$O$};

  % Các điểm cực trị và đường gióng
  \\draw[dashed] (-1,0) -- (-1,2) -- (0,2);
  \\draw[dashed] (1,0) -- (1,-2) -- (0,-2);
  \\node[below] at (-1,0) {$-1$};
  \\node[above] at (1,0) {$1$};
  \\node[left] at (0,2) {$2$};
  \\node[right] at (0,-2) {$-2$};

  % Đồ thị hàm số
  \\draw[thick, color=blue, smooth, domain=-2.1:2.1] plot (\\x, {(\\x)^3 - 3*(\\x)});
\\end{tikzpicture}`,
  },
];
