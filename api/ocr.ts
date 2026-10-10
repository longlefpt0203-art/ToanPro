import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mimeType = 'image/png', questionType = 'auto', includeSolution = true, byok } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu ảnh.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const apiKey = byok?.geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'Chưa cấu hình API Key. Hãy nhập Gemini API Key trong tab Cài đặt (BYOK) hoặc thiết lập GEMINI_API_KEY trên Vercel.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const promptText = `
Bạn là chuyên gia chuyển đổi tài liệu và đề thi Toán học Việt Nam sang mã nguồn LaTeX gói 'ex_test' (chuẩn GDPT 2018).
Hãy phân tích hình ảnh và trích xuất TOÀN BỘ các câu hỏi thành các khối \\begin{ex}...\\end{ex}.

QUY TẮC CÚ PHÁP:
- Dạng trắc nghiệm 4 phương án: \\choice {A} {\\True B} {C} {D}
- Dạng Đúng/Sai 4 ý: \\choiceTF {\\True a} {b} {\\True c} {d}
- Dạng trả lời ngắn / điền số: \\shortans{Đáp số}
- Kèm theo khối \\loigiai{...} với lời giải chi tiết.
${includeSolution ? 'Hãy giải chi tiết từng bước.' : ''}

CHỈ TRẢ VỀ DUY NHẤT mã LaTeX các khối \\begin{ex}...\\end{ex}. Không có markdown thừa.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: promptText },
        ],
      },
    });

    const latexOutput = (response.text || '').replace(/```latex/g, '').replace(/```/g, '').trim();
    return res.status(200).json({ success: true, latex: latexOutput });
  } catch (error: any) {
    console.error('Vercel API OCR error:', error);
    return res.status(500).json({ error: error.message || 'Lỗi nhận diện đề thi trên Vercel.' });
  }
}
