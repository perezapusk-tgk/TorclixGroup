import { setOrganizationPlan } from "./storage.mjs";

export const plans={
  starter:{price:490,projects:5,members:2,storage_gb:5,monthly_visitors:10000,leads:500},
  pro:{price:2990,projects:50,members:10,storage_gb:100,monthly_visitors:100000,leads:10000},
  scale:{price:7990,projects:250,members:50,storage_gb:500,monthly_visitors:1000000,leads:100000}
};

const supportedCurrencies=["RUB","USD"];

export function billingCurrencies(){
  return supportedCurrencies.filter(currency=>currency==="RUB" || process.env["YOOKASSA_PRICE_"+currency+"_STARTER"] || process.env["YOOKASSA_PRICE_"+currency+"_PRO"] || process.env["YOOKASSA_PRICE_"+currency+"_SCALE"]);
}

export function priceEnvKey(plan,currency="RUB"){
  const c=String(currency||"RUB").toUpperCase();
  return "YOOKASSA_PRICE_"+c+"_"+String(plan).toUpperCase();
}

export function checkoutCurrencyConfigured(plan,currency="RUB"){
  return !!String(process.env[priceEnvKey(plan,currency)]||"").trim() || (String(currency).toUpperCase()==="RUB" && Number.isFinite(Number(plans[plan]?.price)));
}

export function billingSnapshot(org,counts={}){
  const plan=plans[org.plan]||plans.starter;
  return {
    provider:"yookassa",
    plan:plans[org.plan]?org.plan:"starter",
    price:plan.price,
    currency:"RUB",
    limits:plan,
    availableCurrencies:billingCurrencies(),
    usage:{
      projects:counts.projects||0,
      members:counts.members||1,
      staff:counts.staff||0,
      storage_gb:counts.storage_gb||0,
      monthly_visitors:counts.monthly_visitors||0,
      leads:counts.leads||0
    }
  };
}

export async function createCheckoutSession({organizationId,plan,successUrl,cancelUrl,currency="RUB"}){
  const shopId=String(process.env.YOOKASSA_SHOP_ID||"").trim();
  const secret=String(process.env.YOOKASSA_SECRET_KEY||"").trim();
  const normalizedCurrency=String(currency||"RUB").toUpperCase();
  const configuredAmount=process.env[priceEnvKey(plan,normalizedCurrency)];
  const amount=Number(configuredAmount||plans[plan]?.price);
  if(!shopId||!secret) return {configured:false,error:"ЮKassa не настроена: добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY",currency:normalizedCurrency};
  if(!plans[plan]||!Number.isFinite(amount)||amount<=0) return {configured:false,error:"Для выбранного тарифа не задана корректная сумма",currency:normalizedCurrency};
  const form={
    amount:{value:amount.toFixed(2),currency:normalizedCurrency},
    capture:true,
    confirmation:{type:"redirect",return_url:successUrl||cancelUrl||""},
    description:"TorclixGroup · тариф "+plan,
    metadata:{organization_id:organizationId,plan,currency:normalizedCurrency}
  };
  const idempotence=cryptoRandomKey();
  const response=await fetch("https://api.yookassa.ru/v3/payments",{
    method:"POST",
    headers:{
      authorization:"Basic "+Buffer.from(shopId+":"+secret).toString("base64"),
      "content-type":"application/json",
      "Idempotence-Key":idempotence
    },
    body:JSON.stringify(form)
  });
  const data=await response.json();
  if(!response.ok) return {configured:true,error:data?.description||data?.type||"Ошибка ЮKassa",currency:normalizedCurrency};
  return {configured:true,id:data.id,url:data?.confirmation?.confirmation_url||null,status:data.status,currency:normalizedCurrency};
}

function cryptoRandomKey(){
  return globalThis.crypto?.randomUUID?.() || "tg-"+Date.now()+"-"+Math.random().toString(36).slice(2);
}

export function yookassaConfigured(){
  const shopId=String(process.env.YOOKASSA_SHOP_ID||"").trim();
  const secret=String(process.env.YOOKASSA_SECRET_KEY||"").trim();
  return !!(shopId&&secret);
}

// Kept as compatibility aliases for the current API route names.
export const stripeConfigured=yookassaConfigured;

export async function changePlan(organizationId,plan){
  if(!plans[plan]) throw new Error("Invalid plan");
  const result=await setOrganizationPlan(organizationId,plan);
  if(!result)return null;
  return {plan:result.plan,price:plans[result.plan]?.price||0,source:result.source};
}
