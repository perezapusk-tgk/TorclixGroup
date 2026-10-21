import { setOrganizationPlan } from "./storage.mjs";
export const plans={starter:{price:49,projects:5,members:2,storage_gb:5,monthly_visitors:10000,leads:500},pro:{price:299,projects:50,members:10,storage_gb:100,monthly_visitors:100000,leads:10000},scale:{price:799,projects:250,members:50,storage_gb:500,monthly_visitors:1000000,leads:100000}};
export function billingSnapshot(org,counts={}){const plan=plans[org.plan]||plans.pro;return {plan:org.plan,price:plan.price,limits:plan,usage:{projects:counts.projects||0,members:counts.members||1,storage_gb:counts.storage_gb||0,monthly_visitors:counts.monthly_visitors||0,leads:counts.leads||0}};}

export async function createCheckoutSession({organizationId,plan,successUrl,cancelUrl}){
  const secret=String(process.env.STRIPE_SECRET_KEY||"").trim();
  const priceId=String(process.env["STRIPE_PRICE_"+String(plan||"").toUpperCase()]||"").trim();
  if(!secret||!priceId) return {configured:false,error:"Stripe billing is not configured"};
  const form=new URLSearchParams({mode:"subscription",success_url:successUrl||"",cancel_url:cancelUrl||"",client_reference_id:organizationId,"line_items[0][price]":priceId,"line_items[0][quantity]":"1"});
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{authorization:"Bearer "+secret,"content-type":"application/x-www-form-urlencoded"},body:form});
  const data=await response.json();
  if(!response.ok) return {configured:true,error:data?.error?.message||"Stripe checkout failed"};
  return {configured:true,id:data.id,url:data.url};
}

export function stripeConfigured(){return !!(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_PRICE_STARTER&&process.env.STRIPE_PRICE_PRO&&process.env.STRIPE_PRICE_SCALE);}

export async function changePlan(organizationId,plan){const allowed=new Set(["starter","pro","scale"]);if(!allowed.has(plan))throw new Error("Invalid plan");const result=await setOrganizationPlan(organizationId,plan);if(!result)return null;return {plan:result.plan,price:plans[result.plan]?.price||0,source:result.source};}

