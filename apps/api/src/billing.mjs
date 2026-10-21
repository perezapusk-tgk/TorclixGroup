import { setOrganizationPlan } from "./storage.mjs";
export const plans={starter:{price:49,projects:5,members:2,storage_gb:5,monthly_visitors:10000,leads:500},pro:{price:299,projects:50,members:10,storage_gb:100,monthly_visitors:100000,leads:10000},scale:{price:799,projects:250,members:50,storage_gb:500,monthly_visitors:1000000,leads:100000}};

const supportedCurrencies=["EUR","USD","RUB"];
export function billingCurrencies(){
  return supportedCurrencies.filter(currency=>currency==="EUR"||process.env["STRIPE_PRICE_STARTER_"+currency]||process.env["STRIPE_PRICE_PRO_"+currency]||process.env["STRIPE_PRICE_SCALE_"+currency]);
}
export function priceEnvKey(plan,currency="EUR"){
  const c=String(currency||"EUR").toUpperCase();
  return c==="EUR"?"STRIPE_PRICE_"+String(plan).toUpperCase():"STRIPE_PRICE_"+String(plan).toUpperCase()+"_"+c;
}
export function checkoutCurrencyConfigured(plan,currency="EUR"){
  return !!String(process.env[priceEnvKey(plan,currency)]||"").trim();
}

export function billingSnapshot(org,counts={}){
  const plan=plans[org.plan]||plans.starter;
  return {plan:org.plan,price:plan.price,limits:plan,availableCurrencies:billingCurrencies(),usage:{projects:counts.projects||0,members:counts.members||1,staff:counts.staff||0,storage_gb:counts.storage_gb||0,monthly_visitors:counts.monthly_visitors||0,leads:counts.leads||0}};
}

export async function createCheckoutSession({organizationId,plan,successUrl,cancelUrl,currency="EUR"}){
  const secret=String(process.env.STRIPE_SECRET_KEY||"").trim();
  const normalizedCurrency=String(currency||"EUR").toUpperCase();
  const priceId=String(process.env[priceEnvKey(plan,normalizedCurrency)]||"").trim();
  if(!secret||!priceId) return {configured:false,error:"Stripe checkout для выбранной валюты не настроен",currency:normalizedCurrency};
  const form=new URLSearchParams({mode:"subscription",success_url:successUrl||"",cancel_url:cancelUrl||"",client_reference_id:organizationId,"metadata[organization_id]":organizationId,"metadata[plan]":plan,"metadata[currency]":normalizedCurrency,"line_items[0][price]":priceId,"line_items[0][quantity]":"1"});
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{authorization:"Bearer "+secret,"content-type":"application/x-www-form-urlencoded"},body:form});
  const data=await response.json();
  if(!response.ok) return {configured:true,error:data?.error?.message||"Stripe checkout failed",currency:normalizedCurrency};
  return {configured:true,id:data.id,url:data.url,currency:normalizedCurrency};
}

export function stripeConfigured(){
  return !!(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_PRICE_STARTER&&process.env.STRIPE_PRICE_PRO&&process.env.STRIPE_PRICE_SCALE);
}

export async function changePlan(organizationId,plan){
  const allowed=new Set(["starter","pro","scale"]);
  if(!allowed.has(plan))throw new Error("Invalid plan");
  const result=await setOrganizationPlan(organizationId,plan);
  if(!result)return null;
  return {plan:result.plan,price:plans[result.plan]?.price||0,source:result.source};
}
