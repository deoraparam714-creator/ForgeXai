// Starter Tally import XML (Sales Order). NOT yet tested against a live Tally company:
// test on a Tally demo company and adjust ledger names (party, sales, GST ledgers) to match the trader's books.
import { findSku, priceLine } from '../../shared/catalogue.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export function buildTallyXml({ retailer, lines, company = 'Demo Distributor', orderNo }) {
  const date = ymd(new Date());
  let total = 0;
  const items = lines
    .filter((l) => l.skuId && l.qty > 0)
    .map((l) => {
      const sku = findSku(l.skuId);
      const p = priceLine(sku, l.qty);
      total += p.total;
      return `
        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${esc(sku.name)}</STOCKITEMNAME>
          <RATE>${sku.price}/${esc(sku.unit)}</RATE>
          <AMOUNT>${p.amount}</AMOUNT>
          <ACTUALQTY>${l.qty} ${esc(sku.unit)}</ACTUALQTY>
          <BILLEDQTY>${l.qty} ${esc(sku.unit)}</BILLEDQTY>
          <NARRATION>GST ${sku.gst}%</NARRATION>
        </ALLINVENTORYENTRIES.LIST>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES><SVCURRENTCOMPANY>${esc(company)}</SVCURRENTCOMPANY></STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales Order" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales Order</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${esc(orderNo)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${esc(retailer)}</PARTYLEDGERNAME>
            <NARRATION>Order captured by OrderDesk (WhatsApp). Total incl. GST: ${Math.round(total * 100) / 100}</NARRATION>${items}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;
}
