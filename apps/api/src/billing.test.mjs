import test from "node:test";
import assert from "node:assert/strict";
import { billingCurrencies,billingSnapshot,checkoutCurrencyConfigured,priceEnvKey } from "./billing.mjs";

test("billing price keys use YooKassa currency-specific configuration",()=>{
  assert.equal(priceEnvKey("pro","RUB"),"YOOKASSA_PRICE_RUB_PRO");
  assert.equal(priceEnvKey("pro","USD"),"YOOKASSA_PRICE_USD_PRO");
  assert.equal(checkoutCurrencyConfigured("starter","RUB"),true);
});

test("billing snapshot exposes configured checkout currencies",()=>{
  const previous=process.env.YOOKASSA_PRICE_USD_PRO;
  process.env.YOOKASSA_PRICE_USD_PRO="2990";
  try{
    const snapshot=billingSnapshot({plan:"pro"},{projects:4,leads:12});
    assert.equal(snapshot.provider,"yookassa");
    assert.ok(snapshot.availableCurrencies.includes("RUB"));
    assert.ok(snapshot.availableCurrencies.includes("USD"));
    assert.equal(snapshot.currency,"RUB");
    assert.equal(snapshot.usage.projects,4);
    assert.equal(snapshot.usage.leads,12);
    assert.equal(checkoutCurrencyConfigured("pro","USD"),true);
  }finally{
    if(previous===undefined)delete process.env.YOOKASSA_PRICE_USD_PRO;else process.env.YOOKASSA_PRICE_USD_PRO=previous;
  }
});

test("unknown currency is not advertised",()=>assert.equal(billingCurrencies().includes("GBP"),false));
test("billing snapshot falls back to starter for an unknown plan",()=>{
  const snapshot=billingSnapshot({plan:"unknown"},{});
  assert.equal(snapshot.plan,"starter");
  assert.equal(snapshot.limits.projects,5);
});
