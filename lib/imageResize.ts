export function resizeImage(
  dataUrl: string,
  maxDimension = 1200,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxDimension / Math.max(w, h));
      const width = Math.round(w * scale);
      const height = Math.round(h * scale);

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2d context from OffscreenCanvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.convertToBlob({ type: 'image/jpeg', quality }).then((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }).catch(reject);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
