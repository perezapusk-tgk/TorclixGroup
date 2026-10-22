import test from "node:test";
import assert from "node:assert/strict";
import { billingCurrencies, billingSnapshot, checkoutCurrencyConfigured, priceEnvKey } from "./billing.mjs";

test("billing price keys use base EUR and currency-specific Stripe prices",()=>{
  assert.equal(priceEnvKey("pro","EUR"),"STRIPE_PRICE_PRO");
  assert.equal(priceEnvKey("pro","USD"),"STRIPE_PRICE_PRO_USD");
  assert.equal(priceEnvKey("starter","RUB"),"STRIPE_PRICE_STARTER_RUB");
});

test("billing snapshot exposes configured checkout currencies",()=>{
  const previous=process.env.STRIPE_PRICE_PRO_USD;
  process.env.STRIPE_PRICE_PRO_USD="price_test_usd";
  try{
    const snapshot=billingSnapshot({plan:"pro"},{projects:4,leads:12});
    assert.ok(snapshot.availableCurrencies.includes("EUR"));
    assert.ok(snapshot.availableCurrencies.includes("USD"));
    assert.equal(snapshot.usage.projects,4);
    assert.equal(snapshot.usage.leads,12);
    assert.equal(checkoutCurrencyConfigured("pro","USD"),true);
  }finally{
    if(previous===undefined) delete process.env.STRIPE_PRICE_PRO_USD;
    else process.env.STRIPE_PRICE_PRO_USD=previous;
  }
});

test("unknown currency is not advertised",()=>{
  assert.equal(billingCurrencies().includes("GBP"),false);
});

test("billing snapshot falls back to starter for an unknown plan",()=>{
  const snapshot=billingSnapshot({plan:"unknown"},{});
  assert.equal(snapshot.plan,"starter");
  assert.equal(snapshot.limits.projects,5);
});
