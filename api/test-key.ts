import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { provider, apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp API Key để kiểm tra.' });
    }

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const testRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Ping test. Reply with: OK',
      });
      return res.status(200).json({ success: true, message: 'Kết nối Gemini API thành công!', reply: testRes.text });
    }

    return res.status(400).json({ success: false, message: 'Nhà cung cấp không hỗ trợ.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: `Kiểm tra thất bại: ${error.message}` });
  }
}
