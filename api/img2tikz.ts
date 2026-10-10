import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64, mimeType = 'image/png', byok } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Thiếu dữ liệu ảnh.' });

    const apiKey = byok?.geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Chưa có API Key. Hãy nhập Gemini API Key trong tab Cài đặt.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const promptText = `
Bạn là chuyên gia đồ họa LaTeX TikZ.
Hãy phân tích ảnh và tái tạo bằng mã TikZ hoặc tkz-tab (bảng biến thiên).
CHỈ TRẢ VỀ DUY NHẤT khối \\begin{tikzpicture}...\\end{tikzpicture}.
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

    const tikzOutput = (response.text || '').replace(/```latex/g, '').replace(/```/g, '').trim();
    return res.status(200).json({ success: true, tikz: tikzOutput });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Lỗi chuyển ảnh sang TikZ.' });
  }
}
