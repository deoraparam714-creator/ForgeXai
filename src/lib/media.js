// Browser-side helpers: shrink photos and turn files into base64 so requests stay under Vercel's ~4.5 MB body limit.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
}

export async function compressImage(file, maxSide = 1400, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { mimeType: 'image/jpeg', data: dataUrl.split(',')[1], previewUrl: dataUrl };
}

// WhatsApp voice notes are .opus/.ogg; browsers sometimes report an empty or odd type.
export function audioMime(file) {
  const t = (file.type || '').toLowerCase();
  if (t.includes('ogg') || t.includes('opus')) return 'audio/ogg';
  if (t.includes('mpeg') || t.includes('mp3')) return 'audio/mp3';
  if (t.includes('wav')) return 'audio/wav';
  if (t.includes('aac') || t.includes('m4a') || t.includes('mp4')) return 'audio/aac';
  if (t.includes('webm')) return 'audio/webm';
  const n = file.name.toLowerCase();
  if (n.endsWith('.opus') || n.endsWith('.ogg')) return 'audio/ogg';
  if (n.endsWith('.mp3')) return 'audio/mp3';
  if (n.endsWith('.m4a') || n.endsWith('.aac')) return 'audio/aac';
  if (n.endsWith('.wav')) return 'audio/wav';
  return t || 'audio/ogg';
}
