# OrderDesk (working name) – prototype

WhatsApp-style orders (text, voice note, photo of a handwritten list) → Gemini reads and matches to the catalogue → staff review flagged lines → confirmed order + retailer reply text + Tally XML.

## What is AI and what is not
- Gemini: transcribes voice, reads handwriting, extracts lines, maps colloquial names to catalogue SKUs.
- Plain code: catalogue validation, prices, GST, totals, Tally XML. The model never does the maths.

## Run locally
```bash
npm install
npm i -g vercel
cp .env.example .env.local      # paste your Gemini key
vercel dev                      # runs the site AND /api/parse
```
(`npm run dev` alone serves only the UI; /api/parse needs `vercel dev`.)

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. vercel.com → Add New → Project → import the repo (Framework: Vite, auto-detected).
3. Settings → Environment Variables: add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`). Redeploy.
Never put the key in client code; only `api/parse.js` reads it.

## Replace before the real demo
- `shared/catalogue.js`: use the trader's real SKU list, prices, GST and the aliases his retailers actually use.
- Tally XML: test on a Tally demo company; adjust ledger names.
- Rename: change `APP_NAME` in `src/App.jsx` and `<title>` in `index.html`.

## Not built yet (next steps)
- WhatsApp Cloud API webhook (n8n or a Vercel function) so retailers get the confirmation reply in chat.
- Alias learning: save staff corrections so the same phrase matches next time.
- Auth, multi-trader, order history in Supabase.
