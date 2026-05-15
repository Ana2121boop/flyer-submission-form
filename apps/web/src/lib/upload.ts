import { api } from './api';

const MAX_DIMENSION = 1600;
const TARGET_BYTES = 1_000_000;

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);

  // Step down quality until we hit target bytes
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (blob && blob.size <= TARGET_BYTES) return blob;
    if (quality === 0.4 && blob) return blob;
  }
  return file;
}

export async function uploadImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const compressed = await compressImage(file);
  const contentType = compressed.type || 'image/jpeg';

  const { uploadUrl, publicUrl } = await api<{ uploadUrl: string; publicUrl: string }>('/api/uploads/presign', {
    method: 'POST',
    body: {
      fileName: file.name,
      contentType,
      contentLength: compressed.size,
    },
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Upload failed: network error'));
    xhr.send(compressed);
  });

  return publicUrl;
}
