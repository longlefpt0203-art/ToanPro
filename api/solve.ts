import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { questionText, imageBase64, mimeType = 'image/png', byok } = req.body;
    const apiKey = byok?.geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Chưa có API Key. Hãy nhập Gemini API Key trong tab Cài đặt.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const promptText = `
Bạn là giáo viên Toán chuyên luyện thi THPT Quốc Gia.
Hãy giải bài toán sau chuẩn mực sư phạm, chi tiết từng bước, và đóng gói thành khối \\begin{ex} ... \\loigiai{...} \\end{ex}.
${questionText ? `ĐỀ BÀI: ${questionText}` : ''}
`;

    let response;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: cleanBase64 } },
            { text: promptText },
          ],
        },
      });
    } else {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
      });
    }

    const latexOutput = (response.text || '').replace(/```latex/g, '').replace(/```/g, '').trim();
    return res.status(200).json({ success: true, latex: latexOutput });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Lỗi giải toán.' });
  }
}
