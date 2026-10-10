import { BYOKConfig } from '../types';
import { fetchSafeJson } from './imageHelper';

/**
 * Direct client-side Gemini REST API call when running on static hosting (Vercel without backend, GitHub Pages)
 */
async function callDirectGemini(apiKey: string, prompt: string, imageBase64?: string, mimeType = 'image/png'): Promise<string> {
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        },
      });
    }
    parts.push({ text: prompt });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      });

      const data = await fetchSafeJson(res);
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        return rawText.replace(/```latex/g, '').replace(/```/g, '').trim();
      }

      const errMsg = data.error?.message || `Lỗi Gemini API (${res.status})`;
      // Check for 503 high demand or 429 rate limit
      if (res.status === 503 || res.status === 429 || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
        console.warn(`Model ${model} đang bận (503 cao điểm), tự động chuyển sang ${candidateModels[candidateModels.indexOf(model) + 1] || 'dự phòng'}...`);
        lastError = new Error(`Mô hình ${model} đang quá tải cao điểm: ${errMsg}`);
        continue;
      }
      throw new Error(errMsg);
    } catch (err: any) {
      if (err.message?.includes('high demand') || err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.message?.includes('429')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Mô hình Gemini đang tạm thời có lượng truy cập cao điểm. Vui lòng thử lại sau 1-2 phút!');
}

/**
 * Direct client-side Groq or OpenRouter call
 */
async function callDirectGroqOrOpenRouter(provider: 'groq' | 'openrouter', apiKey: string, prompt: string, imageBase64?: string, mimeType = 'image/png'): Promise<string> {
  const isGroq = provider === 'groq';
  const url = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
  const model = isGroq ? 'llama-3.2-11b-vision-preview' : 'google/gemini-2.0-flash-001';

  const messages: any[] = [];
  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}` },
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
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  const data = await fetchSafeJson(res);
  if (!res.ok) {
    throw new Error(data.error?.message || `Lỗi từ ${provider.toUpperCase()}`);
  }

  const rawText = data.choices?.[0]?.message?.content || '';
  return rawText.replace(/```latex/g, '').replace(/```/g, '').trim();
}

/**
 * Robust OCR API with fallback chain:
 * 1. Try local/Vercel /api/ocr endpoint
 * 2. If 404 (Vercel static deploy): fallback directly to client-side BYOK (Gemini -> Groq -> OpenRouter)
 */
export async function callWithFallbackOcr(params: {
  imageBase64: string;
  mimeType?: string;
  questionType?: string;
  includeSolution?: boolean;
  byok: BYOKConfig;
}): Promise<string> {
  const { imageBase64, mimeType = 'image/png', questionType = 'auto', includeSolution = true, byok } = params;

  // 1. Try server endpoint first
  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        questionType,
        includeSolution,
        byok,
      }),
    });

    // If endpoint exists and works
    if (res.status !== 404) {
      const data = await fetchSafeJson(res);
      if (!res.ok) throw new Error(data.error || 'Lỗi khi nhận diện đề thi.');
      return data.latex || '';
    }
  } catch (err: any) {
    // If not a 404 or connection error, check if we can fallback
    if (!err.message?.includes('404') && !err.message?.includes('NOT_FOUND') && !err.message?.includes('Failed to fetch')) {
      throw err;
    }
  }

  // 2. Fallback to client-side direct API (BYOK)
  const promptText = `
Bạn là chuyên gia chuyển đổi tài liệu đề thi Toán học Việt Nam sang mã nguồn LaTeX gói 'ex_test' (chuẩn GDPT 2018).
Hãy phân tích hình ảnh và trích xuất TOÀN BỘ các câu hỏi thành các khối \\begin{ex}...\\end{ex}.

QUY TẮC BẮT BUỘC:
- Dạng trắc nghiệm 4 đáp án: dùng \\choice {A} {\\True B} {C} {D}
- Dạng Đúng/Sai 4 ý: dùng \\choiceTF {\\True a} {b} {\\True c} {d}
- Dạng điền số / ngắn: dùng \\shortans{Đáp số}
- Lời giải chi tiết sư phạm: đặt trong khối \\loigiai{...}
${includeSolution ? 'Kèm theo lời giải chi tiết từng bước.' : ''}
CHỈ TRẢ VỀ DUY NHẤT mã LaTeX các khối \\begin{ex}...\\end{ex}. Không markdown thừa.
`;

  if (byok.selectedProvider === 'groq' && byok.groqKey) {
    return await callDirectGroqOrOpenRouter('groq', byok.groqKey, promptText, imageBase64, mimeType);
  }

  if (byok.selectedProvider === 'openrouter' && byok.openRouterKey) {
    return await callDirectGroqOrOpenRouter('openrouter', byok.openRouterKey, promptText, imageBase64, mimeType);
  }

  if (byok.geminiKey) {
    return await callDirectGemini(byok.geminiKey, promptText, imageBase64, mimeType);
  }

  // If no BYOK key is configured and server is 404 on Vercel
  throw new Error(
    'Ứng dụng đang chạy trên Vercel (chế độ tĩnh không có backend riêng). ' +
    'Vui lòng vào tab "Cài đặt BYOK" ở trên và nhập Gemini API Key miễn phí của bạn để ứng dụng hoạt động trực tiếp!'
  );
}

/**
 * Robust Math Solve API with fallback
 */
export async function callWithFallbackSolve(params: {
  questionText?: string;
  imageBase64?: string;
  mimeType?: string;
  style?: string;
  byok: BYOKConfig;
}): Promise<string> {
  const { questionText, imageBase64, mimeType = 'image/png', style = 'pedagogical', byok } = params;

  try {
    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.status !== 404) {
      const data = await fetchSafeJson(res);
      if (!res.ok) throw new Error(data.error || 'Lỗi khi giải toán.');
      return data.latex || '';
    }
  } catch (err: any) {
    if (!err.message?.includes('404') && !err.message?.includes('NOT_FOUND') && !err.message?.includes('Failed to fetch')) {
      throw err;
    }
  }

  const promptText = `
Bạn là giáo viên Toán chuyên luyện thi THPT Quốc Gia Việt Nam.
Hãy giải bài toán sau một cách chuẩn mực sư phạm, chi tiết từng bước, và đóng gói thành khối LaTeX chuẩn gói 'ex_test':
- Phân tích giả thiết và phương pháp giải.
- Trình bày biến đổi toán học rõ ràng $...$.
- Kết luận đáp án.
- Đóng gói trong \\begin{ex} ... \\loigiai{...} \\end{ex}.
${questionText ? `ĐỀ BÀI: ${questionText}` : ''}
`;

  if (byok.geminiKey) {
    return await callDirectGemini(byok.geminiKey, promptText, imageBase64, mimeType);
  }
  if (byok.groqKey) {
    return await callDirectGroqOrOpenRouter('groq', byok.groqKey, promptText, imageBase64, mimeType);
  }
  if (byok.openRouterKey) {
    return await callDirectGroqOrOpenRouter('openrouter', byok.openRouterKey, promptText, imageBase64, mimeType);
  }

  throw new Error(
    'Ứng dụng đang chạy trên Vercel. Vui lòng vào tab "Cài đặt BYOK" nhập Gemini API Key của bạn để sử dụng tính năng giải toán!'
  );
}

/**
 * Robust Img2TikZ API with fallback
 */
export async function callWithFallbackImg2Tikz(params: {
  imageBase64: string;
  mimeType?: string;
  byok: BYOKConfig;
}): Promise<string> {
  const { imageBase64, mimeType = 'image/png', byok } = params;

  try {
    const res = await fetch('/api/img2tikz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.status !== 404) {
      const data = await fetchSafeJson(res);
      if (!res.ok) throw new Error(data.error || 'Lỗi khi chuyển ảnh sang TikZ.');
      return data.tikz || '';
    }
  } catch (err: any) {
    if (!err.message?.includes('404') && !err.message?.includes('NOT_FOUND') && !err.message?.includes('Failed to fetch')) {
      throw err;
    }
  }

  const promptText = `
Bạn là chuyên gia đồ họa LaTeX TikZ cho tài liệu Toán THPT Việt Nam.
Hãy tái tạo hình ảnh thành mã LaTeX TikZ hoặc tkz-tab (bảng biến thiên).
- Dùng \\coordinate cho các điểm.
- Nét khuất vẽ bằng [dashed].
- Nhãn đỉnh bằng node[above/below/left/right].
CHỈ TRẢ VỀ DUY NHẤT khối \\begin{tikzpicture}...\\end{tikzpicture}.
`;

  if (byok.geminiKey) {
    return await callDirectGemini(byok.geminiKey, promptText, imageBase64, mimeType);
  }

  throw new Error(
    'Ứng dụng đang chạy trên Vercel. Vui lòng vào tab "Cài đặt BYOK" nhập Gemini API Key của bạn để sử dụng tính năng chuyển ảnh sang TikZ!'
  );
}

/**
 * Robust TikZ Refine API with fallback
 */
export async function callWithFallbackTikzRefine(params: {
  currentTikz: string;
  instruction: string;
  byok: BYOKConfig;
}): Promise<string> {
  const { currentTikz, instruction, byok } = params;

  try {
    const res = await fetch('/api/tikz-refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.status !== 404) {
      const data = await fetchSafeJson(res);
      if (!res.ok) throw new Error(data.error || 'Lỗi tinh chỉnh TikZ.');
      return data.tikz || '';
    }
  } catch (err: any) {
    if (!err.message?.includes('404') && !err.message?.includes('NOT_FOUND') && !err.message?.includes('Failed to fetch')) {
      throw err;
    }
  }

  const promptText = `
Dưới đây là mã TikZ hiện tại:
${currentTikz}

Yêu cầu chỉnh sửa: "${instruction}".
Cập nhật mã TikZ và CHỈ TRẢ VỀ khối \\begin{tikzpicture}...\\end{tikzpicture}.
`;

  if (byok.geminiKey) {
    return await callDirectGemini(byok.geminiKey, promptText);
  }

  throw new Error(
    'Vui lòng vào tab "Cài đặt BYOK" nhập Gemini API Key để sử dụng tính năng tinh chỉnh TikZ trên Vercel!'
  );
}
