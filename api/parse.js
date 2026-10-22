// POST /api/parse  { text?, audio?: {mimeType, data}, image?: {mimeType, data}, retailer? }
// Gemini reads text / voice / handwriting and maps each line to a catalogue SKU.
// Prices, GST and totals are NOT computed here or by the AI – see shared/catalogue.js.
import { CATALOGUE } from '../shared/catalogue.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SKU_IDS = new Set(CATALOGUE.map((s) => s.id));

const SYSTEM = `You are the order-entry clerk for an Indian FMCG distributor in Bengaluru.
Retailers send orders on WhatsApp as text, voice notes or photos of handwritten lists, mixing English, Kannada, Hindi, Tamil and Telugu.
Your job: turn the message into structured order lines.

Rules:
- If audio is given, transcribe it faithfully first (keep the original language/script mix, e.g. Kanglish) into "transcript".
- If an image is given, read the handwritten or printed list into "transcript" as plain lines.
- For each ordered item output: phrase (exactly what the retailer said/wrote), quantity (number), unit (as said, e.g. case, carton, box, bag, kg, packet), sku_id, confidence (0 to 1), note.
- sku_id MUST be one of the catalogue ids below. If no item fits, or the phrase is too vague to choose (e.g. "biscuit", "dal", "soap"), use "" and confidence under 0.5, and explain in note.
- "12 wala", "48 wala" etc. refer to pack size, not quantity.
- If quantity is missing, use 0 and say so in note. Never guess quantities.
- Never invent items that were not ordered. Ignore greetings and delivery chat, but if a delivery time is stated put it in delivery_note.
- Keep note short, in English.

Catalogue (id | name | pack | known aliases):
${CATALOGUE.map((s) => `${s.id} | ${s.name} | ${s.pack} | ${s.aliases.join(', ')}`).join('\n')}`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    language: { type: 'STRING' },
    delivery_note: { type: 'STRING' },
    lines: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          phrase: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          unit: { type: 'STRING' },
          sku_id: { type: 'STRING' },
          confidence: { type: 'NUMBER' },
          note: { type: 'STRING' },
        },
        required: ['phrase', 'quantity', 'unit', 'sku_id', 'confidence', 'note'],
      },
    },
  },
  required: ['transcript', 'language', 'lines'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server.' });

  const { text = '', audio, image, retailer = '' } = req.body || {};
  if (!text.trim() && !audio && !image) {
    return res.status(400).json({ error: 'Send text, a voice note or a photo.' });
  }

  const parts = [];
  parts.push({ text: `Retailer: ${retailer || 'unknown'}\nMessage text: ${text.trim() || '(none)'}` });
  if (audio?.data) parts.push({ inlineData: { mimeType: audio.mimeType || 'audio/ogg', data: audio.data } });
  if (image?.data) parts.push({ inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.data } });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: data?.error?.message || `Gemini returned ${r.status}` });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: 'Gemini did not return valid JSON. Try again.' });
    }

    // Deterministic guard: the model may only pick real catalogue ids.
    const lines = (parsed.lines || []).map((l) => {
      const valid = SKU_IDS.has(l.sku_id);
      return {
        phrase: String(l.phrase || ''),
        qty: Number(l.quantity) > 0 ? Number(l.quantity) : 0,
        unit: String(l.unit || ''),
        skuId: valid ? l.sku_id : '',
        confidence: valid ? Math.max(0, Math.min(1, Number(l.confidence) || 0)) : Math.min(0.4, Number(l.confidence) || 0),
        note: String(l.note || ''),
      };
    });

    return res.status(200).json({
      transcript: parsed.transcript || '',
      language: parsed.language || '',
      deliveryNote: parsed.delivery_note || '',
      lines,
      model: MODEL,
    });
  } catch (e) {
    return res.status(502).json({ error: `Could not reach Gemini: ${e.message}` });
  }
}
