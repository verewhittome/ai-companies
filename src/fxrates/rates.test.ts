import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEcbXml, rebase, convertAmount } from "./rates.js";

const XML = `<?xml version="1.0"?><gesmes:Envelope><Cube><Cube time='2026-06-15'>
<Cube currency='USD' rate='1.0800'/><Cube currency='GBP' rate='0.8500'/><Cube currency='JPY' rate='170.00'/>
</Cube></Cube></gesmes:Envelope>`;

test("parses ECB xml incl. implicit EUR base", () => {
  const { date, rates } = parseEcbXml(XML);
  assert.equal(date, "2026-06-15");
  assert.equal(rates.EUR, 1);
  assert.equal(rates.USD, 1.08);
  assert.equal(rates.GBP, 0.85);
});

test("rebases to USD", () => {
  const { rates } = parseEcbXml(XML);
  const r = rebase(rates, "USD", ["EUR", "GBP"]);
  assert.equal(r.EUR, Number((1 / 1.08).toFixed(6)));
  assert.equal(r.GBP, Number((0.85 / 1.08).toFixed(6)));
});

test("converts amounts across currencies", () => {
  const { rates } = parseEcbXml(XML);
  // 100 USD -> GBP = 100 * 0.85/1.08
  assert.equal(convertAmount(rates, "USD", "GBP", 100), Number(((100 * 0.85) / 1.08).toFixed(6)));
  assert.equal(convertAmount(rates, "EUR", "USD", 10), 10.8);
});

test("rejects unknown currency", () => {
  const { rates } = parseEcbXml(XML);
  assert.throws(() => convertAmount(rates, "USD", "ZZZ", 1));
});
