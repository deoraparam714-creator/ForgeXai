import { useMemo, useRef, useState } from 'react';
import { CATALOGUE, RETAILERS, findSku, priceLine } from '../shared/catalogue.js';
import { fallbackParse } from './lib/fallback.js';
import { buildTallyXml } from './lib/tally.js';
import { audioMime, compressImage, fileToBase64 } from './lib/media.js';

const APP_NAME = 'OrderDesk'; // working name – change in one place

const SAMPLES = [
  { label: 'Hindi-English text', text: 'Bhaiya 5 case maggi 12 wala, 2 carton parle g, 10 kg sugar, 3 tata salt box bhejo kal subah' },
  { label: 'Kannada-English text', text: 'Anna 2 box tata salt, 4 case maggi, 1 oil can fortune 15 litre, 3 bag akki. Kal morning deliver madi' },
  { label: 'Vague order', text: '5 biscuit packet, 2 dal bag, 3 sabun carton, 1 colgate carton' },
];

const money = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const FLAG_BELOW = 0.8;

let lineSeq = 0;
const toLine = (l) => ({ ...l, id: ++lineSeq, edited: false, reviewed: false });
const isFlagged = (l) => !l.reviewed && (!l.skuId || l.qty <= 0 || l.confidence < FLAG_BELOW);

export default function App() {
  const [retailer, setRetailer] = useState(RETAILERS[0]);
  const [text, setText] = useState('');
  const [audio, setAudio] = useState(null); // {mimeType, data, name}
  const [image, setImage] = useState(null); // {mimeType, data, previewUrl, name}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // {transcript, language, deliveryNote, model, lines}
  const [confirmed, setConfirmed] = useState(null);
  const [history, setHistory] = useState([]);
  const [recording, setRecording] = useState(false);
  const recRef = useRef(null);

  const lines = result?.lines || [];
  const flaggedCount = lines.filter(isFlagged).length;
  const totals = useMemo(() => {
    let amount = 0, gst = 0;
    for (const l of lines) {
      const p = priceLine(findSku(l.skuId), l.qty);
      amount += p.amount;
      gst += p.gst;
    }
    return { amount, gst, total: amount + gst };
  }, [lines]);

  const noRetype = history.length ? Math.round((history.filter((h) => !h.edited).length / history.length) * 100) : null;

  function updateLine(id, patch, markEdited = true) {
    setResult((r) => ({
      ...r,
      lines: r.lines.map((l) => (l.id === id ? { ...l, ...patch, edited: l.edited || markEdited, reviewed: true } : l)),
    }));
  }
  function removeLine(id) {
    setResult((r) => ({ ...r, lines: r.lines.filter((l) => l.id !== id), removedAny: true }));
  }

  async function onAudioFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAudio({ mimeType: audioMime(f), data: await fileToBase64(f), name: f.name });
    e.target.value = '';
  }
  async function onImageFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const img = await compressImage(f);
      setImage({ ...img, name: f.name });
    } catch {
      setError('Could not read that photo. Try a JPG or PNG.');
    }
    e.target.value = '';
  }

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = (ev) => chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType });
        const file = new File([blob], 'recording', { type: rec.mimeType });
        setAudio({ mimeType: audioMime(file), data: await fileToBase64(blob), name: 'Recorded voice note' });
        setRecording(false);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('Microphone not available. Upload a voice note file instead.');
    }
  }

  async function readOrder() {
    setError('');
    setConfirmed(null);
    setBusy(true);
    try {
      const r = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailer,
          text,
          audio: audio && { mimeType: audio.mimeType, data: audio.data },
          image: image && { mimeType: image.mimeType, data: image.data },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Server returned ${r.status}`);
      setResult({ ...data, lines: data.lines.map(toLine) });
    } catch (e) {
      if (text.trim() && !audio && !image) {
        const f = fallbackParse(text);
        setResult({ ...f, lines: f.lines.map(toLine) });
        setError(`AI unavailable (${e.message}). Showing the offline matcher instead; review every line.`);
      } else {
        setResult(null);
        setError(`${e.message}. Voice and photo orders need the AI; check the API key and try again.`);
      }
    } finally {
      setBusy(false);
    }
  }

  function confirmOrder() {
    const orderNo = 'OD-' + String(history.length + 1).padStart(4, '0');
    const edited = lines.some((l) => l.edited) || !!result.removedAny;
    const valid = lines.filter((l) => l.skuId && l.qty > 0);
    const msg =
      `Hi, order confirmed (${orderNo}):\n` +
      valid.map((l) => `• ${l.qty} ${findSku(l.skuId).unit} ${findSku(l.skuId).name}`).join('\n') +
      `\nTotal ${money(totals.total)} incl. GST.` +
      (result.deliveryNote ? `\nDelivery: ${result.deliveryNote}` : '');
    const xml = buildTallyXml({ retailer, lines: valid, orderNo });
    const entry = { orderNo, retailer, total: totals.total, edited, count: valid.length };
    setConfirmed({ ...entry, msg, xml });
    setHistory((h) => [...h, entry]);
  }

  function downloadXml() {
    const blob = new Blob([confirmed.xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${confirmed.orderNo}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function reset() {
    setResult(null);
    setConfirmed(null);
    setText('');
    setAudio(null);
    setImage(null);
    setError('');
  }

  const hasInput = text.trim() || audio || image;

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{APP_NAME}</h1>
          <p className="sub">WhatsApp orders in. Confirmed bills out. No retyping.</p>
        </div>
        <div className="metric" aria-live="polite">
          <span className="metric-num">{noRetype === null ? '–' : `${noRetype}%`}</span>
          <span className="metric-label">
            orders with no retyping
            <br />
            <small>{history.length} confirmed this session</small>
          </span>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>Incoming order</h2>

          <label className="field">
            Retailer
            <select value={retailer} onChange={(e) => setRetailer(e.target.value)}>
              {RETAILERS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Message
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the WhatsApp text, or attach a voice note or photo below"
            />
          </label>

          <div className="chips" role="group" aria-label="Sample messages">
            {SAMPLES.map((s) => (
              <button key={s.label} className="chip" onClick={() => setText(s.text)}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="attach">
            <label className="btn ghost">
              Voice note file
              <input type="file" accept="audio/*,.opus,.ogg" onChange={onAudioFile} hidden />
            </label>
            <button className={`btn ghost ${recording ? 'rec' : ''}`} onClick={toggleRecord}>
              {recording ? 'Stop recording' : 'Record voice'}
            </button>
            <label className="btn ghost">
              Photo of list
              <input type="file" accept="image/*" onChange={onImageFile} hidden />
            </label>
          </div>

          {(audio || image) && (
            <ul className="attached">
              {audio && (
                <li>
                  Voice: {audio.name} <button onClick={() => setAudio(null)}>Remove</button>
                </li>
              )}
              {image && (
                <li>
                  <img src={image.previewUrl} alt="Attached order list" />
                  <button onClick={() => setImage(null)}>Remove</button>
                </li>
              )}
            </ul>
          )}

          <button className="btn primary" disabled={!hasInput || busy} onClick={readOrder}>
            {busy ? 'Reading order…' : 'Read order'}
          </button>
          {error && <p className="error" role="alert">{error}</p>}
        </section>

        <section className="panel slip-wrap">
          {!result && (
            <div className="empty">
              <h2>Order slip</h2>
              <p>Pick a sample message or attach a voice note, then choose Read order. Matched items, prices and GST appear here.</p>
            </div>
          )}

          {result && (
            <div className="slip">
              <div className="slip-head">
                <h2>Order slip</h2>
                <span className="slip-retailer">{retailer}</span>
              </div>

              {result.transcript && (audio || image) && (
                <details className="transcript" open>
                  <summary>What was heard or read{result.language ? ` (${result.language})` : ''}</summary>
                  <p>{result.transcript}</p>
                </details>
              )}

              {lines.length === 0 && <p className="muted">No order lines found. Add more detail and read again.</p>}

              <ul className="lines">
                {lines.map((l) => {
                  const sku = findSku(l.skuId);
                  const p = priceLine(sku, l.qty);
                  const flag = isFlagged(l);
                  return (
                    <li key={l.id} className={flag ? 'line flag' : 'line'}>
                      <div className="line-top">
                        <span className="phrase">“{l.phrase}”</span>
                        <button className="x" onClick={() => removeLine(l.id)} aria-label={`Remove ${l.phrase}`}>
                          ×
                        </button>
                      </div>
                      <div className="line-edit">
                        <select
                          value={l.skuId}
                          onChange={(e) => updateLine(l.id, { skuId: e.target.value, confidence: 1 })}
                          aria-label="Catalogue item"
                        >
                          <option value="">Choose item…</option>
                          {CATALOGUE.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          value={l.qty || ''}
                          placeholder="Qty"
                          onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })}
                          aria-label="Quantity"
                        />
                        <span className="unit">{sku?.unit || l.unit}</span>
                        <span className="amt">{sku ? money(p.total) : '–'}</span>
                      </div>
                      <div className="line-foot">
                        {flag ? (
                          <>
                            <span className="why">{l.note || 'Check this line'}</span>
                            <button className="link" onClick={() => updateLine(l.id, {}, false)}>
                              Looks right
                            </button>
                          </>
                        ) : (
                          <span className="ok">Matched {Math.round(l.confidence * 100)}%</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {lines.length > 0 && (
                <dl className="totals">
                  <div><dt>Items</dt><dd>{money(totals.amount)}</dd></div>
                  <div><dt>GST</dt><dd>{money(totals.gst)}</dd></div>
                  <div className="grand"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
                </dl>
              )}

              {!confirmed && lines.length > 0 && (
                <div className="confirm-row">
                  {flaggedCount > 0 && <span className="why">{flaggedCount} line{flaggedCount > 1 ? 's' : ''} to check</span>}
                  <button className="btn primary" disabled={flaggedCount > 0} onClick={confirmOrder}>
                    Confirm and send to billing
                  </button>
                </div>
              )}

              {confirmed && (
                <div className="done">
                  <h3>{confirmed.orderNo} confirmed</h3>
                  <p className="muted">Message for the retailer (a WhatsApp Cloud API reply in the full build):</p>
                  <pre>{confirmed.msg}</pre>
                  <div className="attach">
                    <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(confirmed.msg)}`} target="_blank" rel="noreferrer">
                      Open in WhatsApp
                    </a>
                    <button className="btn ghost" onClick={downloadXml}>Download Tally XML</button>
                    <button className="btn primary" onClick={reset}>Next order</button>
                  </div>
                  <p className="muted small">
                    {confirmed.edited ? 'Staff edited this order.' : 'No retyping: staff changed nothing.'} Tally XML is a starter format; test on a Tally demo company first.
                  </p>
                </div>
              )}

              <p className="model">Read by {result.model}. Prices and GST come from the catalogue, not the AI.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
