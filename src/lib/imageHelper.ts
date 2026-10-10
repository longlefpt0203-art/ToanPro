/**
 * Utility for client-side image compression & optimization for OCR
 * Resizes large images (phone photos, large scans) to max 1600px at 85% JPEG quality.
 * Reduces payload from 10-20MB down to ~200-300KB without loss of math readability.
 */
export async function optimizeImageForOcr(
  dataUrl: string, 
  maxDim = 1600, 
  quality = 0.85
): Promise<{ dataUrl: string; mimeType: string; size: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      // If already small and not too heavy, keep it
      if (width <= maxDim && height <= maxDim && dataUrl.length < 800000) {
        resolve({
          dataUrl,
          mimeType: 'image/jpeg',
          size: Math.round(dataUrl.length * 0.75),
        });
        return;
      }

      // Calculate scale ratio
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ dataUrl, mimeType: 'image/jpeg', size: dataUrl.length });
        return;
      }

      // White background for transparent PNGs / formulas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const optimized = canvas.toDataURL('image/jpeg', quality);
      resolve({
        dataUrl: optimized,
        mimeType: 'image/jpeg',
        size: Math.round(optimized.length * 0.75),
      });
    };

    img.onerror = () => {
      resolve({ dataUrl, mimeType: 'image/jpeg', size: dataUrl.length });
    };

    img.src = dataUrl;
  });
}

/**
 * Safely parse JSON from fetch response without throwing syntax error if server returned HTML or text
 */
export async function fetchSafeJson<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    if (!res.ok) {
      if (text.includes('Payload Too Large') || res.status === 413) {
        throw new Error('Dung lượng ảnh quá lớn vượt quá giới hạn của máy chủ. Vui lòng tải từng ảnh hoặc giảm kích thước.');
      }
      if (text.includes('504') || text.includes('Gateway Timeout') || res.status === 504) {
        throw new Error('Máy chủ phản hồi quá thời gian chờ (Timeout). Vui lòng thử lại với từng ảnh riêng lẻ.');
      }
      throw new Error(`Máy chủ trả về lỗi (${res.status}): ${text.slice(0, 150).replace(/<[^>]*>?/gm, '').trim() || res.statusText}`);
    }
    throw new Error(`Dữ liệu trả về không hợp lệ: ${text.slice(0, 100)}`);
  }
}
