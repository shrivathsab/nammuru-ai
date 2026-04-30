/**
 * Perceptual hash for NammuruAI near-duplicate detection.
 * Used in /api/classify to fingerprint images at validation time.
 * The hash is stored on the report and checked at submit time.
 */

export const PHASH_THRESHOLDS = {
  IDENTICAL: 5,
  SIMILAR:   15,
  DIFFERENT: 16,
} as const;

/**
 * Compute a 64-character hex perceptual hash from base64 image data.
 * Returns null on failure — callers must handle null gracefully.
 */
export async function computePHash(imageBase64: string): Promise<string | null> {
  try {
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const buffer = Buffer.from(base64Data, 'base64');

    const sharp = await import('sharp').catch(() => null);
    if (sharp) {
      const { data } = await sharp.default(buffer)
        .resize(16, 16, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = Array.from(data as Uint8Array);
      const avg = pixels.reduce((s, v) => s + v, 0) / pixels.length;
      const bits = pixels.map(p => p >= avg ? 1 : 0);

      let hex = '';
      for (let i = 0; i < bits.length; i += 4) {
        hex += (
          (bits[i]   << 3) |
          (bits[i+1] << 2) |
          (bits[i+2] << 1) |
           bits[i+3]
        ).toString(16);
      }
      return hex;
    }

    const bytes = Array.from(buffer.slice(0, 256));
    if (bytes.length === 0) return null;
    const avg = bytes.reduce((s, v) => s + v, 0) / bytes.length;
    const bits = bytes.map(v => v >= avg ? 1 : 0);
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      hex += (
        ((bits[i]   ?? 0) << 3) |
        ((bits[i+1] ?? 0) << 2) |
        ((bits[i+2] ?? 0) << 1) |
         (bits[i+3] ?? 0)
      ).toString(16);
    }
    return hex || null;

  } catch {
    return null;
  }
}

/**
 * Hamming distance between two hex hash strings.
 * Returns 999 if hashes are incompatible lengths.
 * Lower = more similar (0 = identical).
 */
export function pHashDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 999;
  const POPCOUNT = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4] as const;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += POPCOUNT[diff] ?? 0;
  }
  return dist;
}
