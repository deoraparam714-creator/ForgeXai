// Sample distributor catalogue. Prices are ILLUSTRATIVE – replace with the trader's real price list.
// Aliases are the colloquial names retailers actually use; the AI also sees these.
export const CATALOGUE = [
  { id: 'MAGGI-70-12', name: 'Maggi 2-Minute Masala 70g', pack: 'case of 12', unit: 'case', price: 144, gst: 12, aliases: ['maggi 12 wala', 'maggi masala', 'maggi noodles', 'maggi'] },
  { id: 'PARLEG-800', name: 'Parle-G Biscuit 800g', pack: 'carton of 10', unit: 'carton', price: 560, gst: 18, aliases: ['parle g', 'parleg', 'parle-g', 'parle biscuit'] },
  { id: 'TATASALT-1', name: 'Tata Salt 1kg', pack: 'box of 25', unit: 'box', price: 650, gst: 0, aliases: ['tata salt', 'salt box', 'uppu', 'namak'] },
  { id: 'SUGAR-50', name: 'Sugar 50kg bag', pack: '50 kg', unit: 'bag', price: 2150, gst: 0, aliases: ['sugar', 'sakkare', 'chini', 'shakkar'] },
  { id: 'ATTA-AASH-10', name: 'Aashirvaad Atta 10kg', pack: 'bag of 10 kg', unit: 'bag', price: 480, gst: 0, aliases: ['aashirvaad atta', 'atta', 'godhi hittu', 'wheat flour'] },
  { id: 'OIL-FORT-15', name: 'Fortune Sunflower Oil 15L', pack: 'can of 15 L', unit: 'can', price: 1870, gst: 5, aliases: ['fortune oil', 'oil can', 'sunflower oil', 'fortune 15 litre', 'yenne'] },
  { id: 'OIL-FORT-1', name: 'Fortune Sunflower Oil 1L', pack: 'case of 12', unit: 'case', price: 1480, gst: 5, aliases: ['fortune oil 1 litre', 'oil pouch', 'oil 1l'] },
  { id: 'SURF-1', name: 'Surf Excel Easy Wash 1kg', pack: 'case of 12', unit: 'case', price: 1620, gst: 18, aliases: ['surf excel', 'surf', 'washing powder', 'detergent'] },
  { id: 'DETTOL-75', name: 'Dettol Soap 75g', pack: 'carton of 48', unit: 'carton', price: 2340, gst: 18, aliases: ['dettol sabun', 'dettol soap', 'dettol'] },
  { id: 'LIFEBUOY-100', name: 'Lifebuoy Soap 100g', pack: 'carton of 48', unit: 'carton', price: 1680, gst: 18, aliases: ['lifebuoy', 'lifebuoy sabun'] },
  { id: 'TOORDAL-30', name: 'Toor Dal 30kg bag', pack: '30 kg', unit: 'bag', price: 3900, gst: 0, aliases: ['toor dal', 'tur dal', 'togari bele', 'arhar'] },
  { id: 'MOONGDAL-30', name: 'Moong Dal 30kg bag', pack: '30 kg', unit: 'bag', price: 3600, gst: 0, aliases: ['moong dal', 'hesaru bele', 'green dal'] },
  { id: 'REDLABEL-250', name: 'Brooke Bond Red Label Tea 250g', pack: 'carton of 24', unit: 'carton', price: 3360, gst: 5, aliases: ['red label', 'red label chai', 'tea powder', 'chai patti'] },
  { id: 'BRU-100', name: 'Bru Instant Coffee 100g', pack: 'carton of 24', unit: 'carton', price: 4560, gst: 18, aliases: ['bru', 'bru coffee', 'instant coffee'] },
  { id: 'GOODDAY-75', name: 'Britannia Good Day Cashew 75g', pack: 'carton of 60', unit: 'carton', price: 1200, gst: 18, aliases: ['good day', 'goodday', 'good day biscuit'] },
  { id: 'MARIE-250', name: 'Britannia Marie Gold 250g', pack: 'carton of 24', unit: 'carton', price: 1440, gst: 18, aliases: ['marie', 'marie gold', 'marie biscuit'] },
  { id: 'KURKURE-30', name: 'Kurkure Masala Munch 30g', pack: 'carton of 60', unit: 'carton', price: 1140, gst: 12, aliases: ['kurkure', 'kurkure packet'] },
  { id: 'LAYS-26', name: "Lay's Classic Salted 26g", pack: 'carton of 60', unit: 'carton', price: 1080, gst: 12, aliases: ['lays', "lay's", 'chips', 'lays packet'] },
  { id: 'COLGATE-100', name: 'Colgate Strong Teeth 100g', pack: 'carton of 72', unit: 'carton', price: 4320, gst: 18, aliases: ['colgate', 'toothpaste', 'colgate paste'] },
  { id: 'PARACHUTE-200', name: 'Parachute Coconut Oil 200ml', pack: 'carton of 48', unit: 'carton', price: 5280, gst: 18, aliases: ['parachute', 'coconut oil', 'thengina yenne'] },
  { id: 'VIM-500', name: 'Vim Dishwash Bar 500g', pack: 'carton of 24', unit: 'carton', price: 1560, gst: 18, aliases: ['vim', 'vim bar', 'dishwash'] },
  { id: 'AGARBATTI-CY', name: 'Cycle Pure Agarbatti', pack: 'carton of 48', unit: 'carton', price: 1920, gst: 12, aliases: ['agarbatti', 'incense', 'cycle agarbatti', 'udbatti'] },
  { id: 'RICE-SONA-26', name: 'Sona Masoori Rice 26kg', pack: '26 kg bag', unit: 'bag', price: 1560, gst: 0, aliases: ['sona masoori', 'rice bag', 'akki', 'rice'] },
  { id: 'MAIDA-30', name: 'Maida 30kg bag', pack: '30 kg', unit: 'bag', price: 1140, gst: 0, aliases: ['maida', 'refined flour'] },
];

export const RETAILERS = [
  'Lakshmi Stores, Chickpet',
  'Gowda Provision, Yeshwanthpur',
  'Sri Venkateshwara Kirana',
  'Cafe Namma Adda',
];

export function findSku(id) {
  return CATALOGUE.find((s) => s.id === id) || null;
}

// All money maths lives here, never in the AI.
export function priceLine(sku, qty) {
  if (!sku || !qty) return { amount: 0, gst: 0, total: 0 };
  const amount = Math.round(sku.price * qty * 100) / 100;
  const gst = Math.round(amount * sku.gst) / 100;
  return { amount, gst, total: Math.round((amount + gst) * 100) / 100 };
}
