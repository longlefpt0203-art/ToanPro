import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Active session in-memory cache for user keys (useful when client browser storage is cleared)
let sessionUserGeminiKey: string | null = null;

// Helper to get or create Gemini client
function getGeminiClient(customKey?: string) {
  const apiKey = customKey?.trim() || sessionUserGeminiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình API Key. Vui lòng thêm GEMINI_API_KEY hoặc cấu hình BYOK trong Cài đặt.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Generate with automatic model fallback when 503 / high demand occurs
async function generateWithModelFallback(ai: GoogleGenAI, contents: any): Promise<string> {
  // Use approved non-deprecated models: gemini-3.8-flash primary, gemini-3.5-flash & gemini-3.1-flash-lite fallbacks
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Mô hình ${model} bận (${err.message?.slice(0, 80)}), tự động chuyển sang mô hình tiếp theo...`);
      lastError = err;
      // Short backoff before next model
      await new Promise(r => setTimeout(r, 350));
      continue;
    }
  }

  throw lastError || new Error('Tất cả mô hình Gemini đều đang có lượng truy cập cao điểm. Vui lòng thử lại sau giây lát!');
}

// Fallback provider helper (Groq & OpenRouter if requested)
async function callGroqOrOpenRouter(provider: 'groq' | 'openrouter', apiKey: string, prompt: string, base64Image?: string, mimeType = 'image/png') {
  const isGroq = provider === 'groq';
  const url = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
  const model = isGroq ? 'llama-3.2-11b-vision-preview' : 'google/gemini-2.5-flash';

  const messages: any[] = [];
  if (base64Image) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Image}` },
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: prompt,
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi từ ${provider.toUpperCase()}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 1. OCR -> ex_test (Hỗ trợ tải nhiều ảnh một lúc hoặc 1 ảnh)
app.post('/api/ocr', async (req: Request, res: Response) => {
  try {
    const { imageBase64, images, mimeType = 'image/png', questionType = 'auto', includeSolution = true, byok } = req.body;

    // Normalize image list
    const inputImages: { base64: string; mime: string }[] = [];
    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img: any) => {
        const raw = typeof img === 'string' ? img : img.imageBase64 || img.base64;
        const mime = (typeof img === 'object' && img.mimeType) ? img.mimeType : mimeType;
        if (raw) {
          inputImages.push({
            base64: raw.replace(/^data:image\/[a-z]+;base64,/, ''),
            mime,
          });
        }
      });
    } else if (imageBase64) {
      inputImages.push({
        base64: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        mime: mimeType,
      });
    }

    if (inputImages.length === 0) {
      return res.status(400).json({ error: 'Thiếu dữ liệu ảnh. Vui lòng tải lên ít nhất một ảnh hoặc dán từ clipboard.' });
    }

    const promptText = `
Bạn là chuyên gia chuyển đổi tài liệu và đề thi Toán học Việt Nam sang mã nguồn LaTeX gói 'ex_test' (chuẩn GDPT 2018 của Bộ GD&ĐT).
Người dùng đã tải lên ${inputImages.length} hình ảnh (các trang đề thi hoặc các câu hỏi được chụp/dán từ màn hình).
Hãy phân tích TẤT CẢ các hình ảnh này theo thứ tự từ đầu đến cuối và trích xuất TOÀN BỘ các câu hỏi thành các khối \\begin{ex}...\\end{ex}.

QUY TẮC CÚ PHÁP BẮT BUỘC (Gói ex_test):
1. Mỗi câu hỏi nằm trong khối:
\\begin{ex}
% [Tên câu / Mức độ / Chuyên đề nếu có]
Nội dung câu hỏi với công thức toán chuẩn $...$ hoặc $$...$$
...
[Cú pháp đáp án tùy theo dạng câu hỏi]
\\loigiai{
[Lời giải chi tiết từng bước theo sư phạm Việt Nam]
}
\\end{ex}

2. DẠNG TRẮC NGHIỆM 4 PHƯƠNG ÁN (MCQ):
Dùng lệnh:
\\choice
{Phương án A}
{\\True Phương án B đúng có \\True ở đầu}
{Phương án C}
{Phương án D}

3. DẠNG ĐÚNG/SAI 4 Ý (Chương trình mới GDPT 2018):
Dùng lệnh:
\\choiceTF
{\\True Ý a đúng}
{Ý b sai}
{\\True Ý c đúng}
{Ý d sai}

4. DẠNG TRẢ LỜI NGẮN / ĐIỀN SỐ:
Dùng lệnh:
\\shortans{Đáp số}

5. LỜI GIẢI:
Luôn kèm theo khối \\loigiai{...} với các bước lập luận rõ ràng và kết luận.

${includeSolution ? 'Hãy giải chi tiết và đưa vào \\loigiai{...}.' : 'Để trống hoặc viết ngắn gọn lời giải.'}

ĐÁNH SỐ THỨ TỰ: Đảm bảo trích xuất liên tục các câu hỏi xuất hiện trên các ảnh, không bỏ sót câu nào.
CHỈ TRẢ VỀ DUY NHẤT mã LaTeX các khối \\begin{ex}...\\end{ex}, không kèm theo lời chào hay markdown thừa.
`;

    let latexOutput = '';

    // Provider check
    if (byok?.selectedProvider === 'groq' && byok?.groqKey) {
      latexOutput = await callGroqOrOpenRouter('groq', byok.groqKey, promptText, inputImages[0].base64, inputImages[0].mime);
    } else if (byok?.selectedProvider === 'openrouter' && byok?.openRouterKey) {
      latexOutput = await callGroqOrOpenRouter('openrouter', byok.openRouterKey, promptText, inputImages[0].base64, inputImages[0].mime);
    } else {
      // Default to Gemini (custom or server key) with support for all images as parts
      const ai = getGeminiClient(byok?.geminiKey);
      const parts: any[] = inputImages.map((img) => ({
        inlineData: {
          mimeType: img.mime,
          data: img.base64,
        },
      }));
      parts.push({ text: promptText });

      latexOutput = await generateWithModelFallback(ai, { parts });
    }

    // Clean backticks
    latexOutput = latexOutput.replace(/```latex/g, '').replace(/```/g, '').trim();

    return res.json({ success: true, latex: latexOutput, count: inputImages.length });
  } catch (error: any) {
    console.error('Error in /api/ocr:', error);
    return res.status(500).json({ error: error.message || 'Lỗi xử lý OCR đề thi.' });
  }
});

// 2. Math Solve -> \loigiai{...}
app.post('/api/solve', async (req: Request, res: Response) => {
  try {
    const { questionText, imageBase64, mimeType = 'image/png', style = 'pedagogical', byok } = req.body;

    if (!questionText && !imageBase64) {
      return res.status(400).json({ error: 'Cần cung cấp đề bài hoặc ảnh câu hỏi.' });
    }

    const promptText = `
Bạn là giáo viên Toán chuyên luyện thi THPT Quốc Gia Việt Nam.
Hãy giải bài toán sau một cách chuẩn mực sư phạm, chi tiết từng bước, và đóng gói thành khối LaTeX chuẩn gói 'ex_test':

YÊU CẦU:
1. Phân tích giả thiết và định hướng phương pháp giải.
2. Trình bày các bước biến đổi đại số / hình học / giải tích rõ ràng, công thức toán viết dạng $...$ hoặc $$...$$.
3. Nếu có bấm máy Casio (fx-580VN X / fx-880BTG), hãy ghi chú mẹo bấm.
4. Kết luận đáp án rõ ràng.
5. Định dạng đầu ra:
\\begin{ex}
[Nội dung đề bài hoàn chỉnh]
\\choice % nếu là trắc nghiệm
{A}
{\\True B}
{C}
{D}
\\loigiai{
[Toàn bộ lời giải chi tiết theo các mục:
+ Phân tích & Hướng giải
+ Các bước giải chi tiết
+ Kết luận]
}
\\end{ex}
`;

    let solutionOutput = '';

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const ai = getGeminiClient(byok?.geminiKey);
      solutionOutput = await generateWithModelFallback(ai, {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: `${promptText}\n\nĐề bài kèm theo (nếu có): ${questionText || ''}` },
        ],
      });
    } else {
      const ai = getGeminiClient(byok?.geminiKey);
      solutionOutput = await generateWithModelFallback(ai, `${promptText}\n\nĐỀ BÀI:\n${questionText}`);
    }

    solutionOutput = solutionOutput.replace(/```latex/g, '').replace(/```/g, '').trim();

    return res.json({ success: true, latex: solutionOutput });
  } catch (error: any) {
    console.error('Error in /api/solve:', error);
    return res.status(500).json({ error: error.message || 'Lỗi giải toán tự động.' });
  }
});

// 3. Image -> TikZ
app.post('/api/img2tikz', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/png', categoryHint, byok } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Cần cung cấp ảnh để chuyển sang TikZ.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const promptText = `
Bạn là chuyên gia đồ họa LaTeX TikZ hàng đầu cho các tài liệu Toán THPT Việt Nam.
Hãy phân tích hình ảnh được cung cấp và tái tạo lại chính xác bằng mã LaTeX TikZ hoặc tkz-tab.

QUY TẮC CỐ ĐỊNH:
1. Nếu hình là BẢNG BIẾN THIÊN hoặc BẢNG XÉT DẤU:
   Dùng gói 'tkz-tab' với cú pháp chuẩn:
   \\begin{tikzpicture}
   \\tkzTabInit[lgt=1.5,espcl=2.5]{$x$/1,$y'$/1,$y$/2}{...}
   \\tkzTabLine{...}
   \\tkzTabVar{...}
   \\end{tikzpicture}

2. Nếu là HÌNH HỌC KHÔNG GIAN (chóp, lăng trụ, nón, trụ, cầu):
   - Luôn đặt tọa độ bằng \\coordinate.
   - Cạnh khuất nhìn từ góc nhìn giáo khoa THPT PHẢI vẽ bằng nét đứt [dashed].
   - Cạnh nhìn thấy vẽ bằng nét liền.
   - Đặt nhãn đỉnh node bằng \\foreach \\p/\\pos in {A/left, B/below, ...} \\fill (\\p) circle (1.2pt) node[\\pos] {$\\p$};
   - Tùy chọn mở đầu: [scale=1, font=\\footnotesize, line join=round, line cap=round, >=stealth].

3. Nếu là ĐỒ THỊ HÀM SỐ (hàm bậc 3, hàm trùng phương, hàm phân thức):
   - Vẽ trục tọa độ [->] (-x,0)--(x,0) node[right]{$x$}.
   - Gốc tọa độ O, các điểm cực trị có đường gióng nét đứt [dashed].
   - Vẽ đường cong bằng \\draw[thick, smooth, domain=...] plot (\\x, {...});

CHỈ TRẢ VỀ DUY NHẤT khối \\begin{tikzpicture}...\\end{tikzpicture}, không kèm giải thích thừa hay markdown.
`;

    const ai = getGeminiClient(byok?.geminiKey);
    const tikzOutputRaw = await generateWithModelFallback(ai, {
      parts: [
        { inlineData: { mimeType, data: cleanBase64 } },
        { text: promptText },
      ],
    });

    let tikzOutput = tikzOutputRaw.replace(/```latex/g, '').replace(/```/g, '').trim();

    return res.json({ success: true, tikz: tikzOutput });
  } catch (error: any) {
    console.error('Error in /api/img2tikz:', error);
    return res.status(500).json({ error: error.message || 'Lỗi chuyển ảnh sang TikZ.' });
  }
});

// 4. TikZ Refine (Chat tinh chỉnh TikZ)
app.post('/api/tikz-refine', async (req: Request, res: Response) => {
  try {
    const { currentTikz, instruction, byok } = req.body;

    if (!currentTikz || !instruction) {
      return res.status(400).json({ error: 'Thiếu mã TikZ hiện tại hoặc hướng dẫn tinh chỉnh.' });
    }

    const promptText = `
Bạn là chuyên gia TikZ. Dưới đây là mã TikZ hiện tại:
\`\`\`latex
${currentTikz}
\`\`\`

YÊU CẦU TINH CHỈNH TỪ NGƯỜI DÙNG:
"${instruction}"

Hãy áp dụng yêu cầu trên một cách chính xác vào mã TikZ, đảm bảo:
- Cú pháp TikZ chuẩn xác không bị lỗi biên dịch.
- Giữ nguyên các phần không bị yêu cầu thay đổi.
- CHỈ TRẢ VỀ DUY NHẤT khối \\begin{tikzpicture}...\\end{tikzpicture}.
`;

    const ai = getGeminiClient(byok?.geminiKey);
    const refinedRaw = await generateWithModelFallback(ai, promptText);

    let refinedTikz = refinedRaw.replace(/```latex/g, '').replace(/```/g, '').trim();
    return res.json({ success: true, tikz: refinedTikz });
  } catch (error: any) {
    console.error('Error in /api/tikz-refine:', error);
    return res.status(500).json({ error: error.message || 'Lỗi tinh chỉnh TikZ.' });
  }
});

// 5. Test Key endpoint (with automatic candidate model fallback)
app.post('/api/test-key', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp API Key để kiểm tra.' });
    }

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const reply = await generateWithModelFallback(ai, 'Ping test. Reply with: OK');
      // Store in session cache
      sessionUserGeminiKey = apiKey.trim();
      return res.json({ success: true, message: 'Kết nối Google Gemini API thành công!', reply });
    } else if (provider === 'groq') {
      const reply = await callGroqOrOpenRouter('groq', apiKey, 'Reply with OK');
      return res.json({ success: true, message: 'Kết nối Groq API thành công!', reply });
    } else if (provider === 'openrouter') {
      const reply = await callGroqOrOpenRouter('openrouter', apiKey, 'Reply with OK');
      return res.json({ success: true, message: 'Kết nối OpenRouter API thành công!', reply });
    }

    return res.status(400).json({ success: false, message: 'Nhà cung cấp không hỗ trợ.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: `Kiểm tra thất bại: ${error.message}` });
  }
});

// 6. System Status endpoint (checks server-side keys & environment)
app.get('/api/system-status', (req: Request, res: Response) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const keyPrefix = hasEnvKey ? `${process.env.GEMINI_API_KEY!.slice(0, 6)}...${process.env.GEMINI_API_KEY!.slice(-4)}` : null;
  return res.json({
    status: 'ok',
    hasServerKey: hasEnvKey,
    serverKeyPrefix: keyPrefix,
    hasSessionKey: Boolean(sessionUserGeminiKey),
    sessionKeyPrefix: sessionUserGeminiKey ? `${sessionUserGeminiKey.slice(0, 6)}...${sessionUserGeminiKey.slice(-4)}` : null,
    models: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
  });
});

// 7. Session BYOK sync endpoint
app.post('/api/byok-session', (req: Request, res: Response) => {
  const { geminiKey } = req.body;
  if (typeof geminiKey === 'string' && geminiKey.trim()) {
    sessionUserGeminiKey = geminiKey.trim();
  }
  return res.json({ success: true, cached: Boolean(sessionUserGeminiKey) });
});

// Export app for serverless / Vercel compatibility
export default app;

// Mount Vite middleware for development
async function start() {
  const port = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(port, () => {
    console.log(`ExTeX Studio server running on port ${port}`);
  });
}

// Only start listener if run directly
if (process.env.VERCEL !== '1') {
  start().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
