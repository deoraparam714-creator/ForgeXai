// Offline fallback for TEXT orders when the Gemini call fails (demo safety net).
// Simple alias matching – deliberately less capable than the AI path.
import { CATALOGUE } from '../../shared/catalogue.js';

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\u0C80-\u0CFF\u0900-\u097F\s-]/g, ' ').replace(/\s+/g, ' ').trim();

export function fallbackParse(text) {
  const chunks = text
    .split(/[\n,;]+|\band\b/i)
    .map((c) => c.trim())
    .filter(Boolean);
  const lines = [];
  for (const chunk of chunks) {
    const n = norm(chunk);
    const qtyMatch = n.match(/(\d+(?:\.\d+)?)/);
    let best = null;
    let bestLen = 0;
    for (const sku of CATALOGUE) {
      for (const a of [...sku.aliases, sku.name.toLowerCase()]) {
        if (n.includes(a) && a.length > bestLen) {
          best = sku;
          bestLen = a.length;
        }
      }
    }
    if (!qtyMatch && !best) continue;
    lines.push({
      phrase: chunk,
      qty: qtyMatch ? Number(qtyMatch[1]) : 0,
      unit: best?.unit || '',
      skuId: best?.id || '',
      confidence: best ? 0.7 : 0.2,
      note: best ? 'Offline matcher (no AI)' : 'No catalogue match',
    });
  }
  return { transcript: text, language: 'offline', deliveryNote: '', lines, model: 'offline-fallback' };
}
