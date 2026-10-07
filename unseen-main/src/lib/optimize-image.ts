/** Compressione locale: i byte originali non vengono caricati sul server. */
export async function optimizeImage(source: File, maximumDimension = 2400): Promise<File> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maximumDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return source;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.88));
    if (!blob || blob.type !== 'image/webp' || (scale === 1 && blob.size >= source.size)) return source;
    return new File([blob], source.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch { return source; }
  finally { bitmap?.close(); }
}
