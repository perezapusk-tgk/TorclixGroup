import crypto from "node:crypto";
import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import {
  initStorage,listProjects,getProject,getPublishedProject,saveProject,getDocument,getPublishedDocument,saveDocument,publishDocument,unpublishDocument,listDomains,saveDomain,listRecords,saveRecord,
  newId,getSessionUser,listOrganizationsForUser,getMembershipRole,listTeamMembers,getOrganizationById,findDomain,verifyDomain,getTelegramIntegration,listTelegramIntegrations,saveTelegramIntegration,listCatalogItems,getCatalogItem,saveCatalogItem,archiveCatalogItem,listOrders,saveOrder,updateOrderStatus,updateClientPortal,getClientPortal,ensureClientPortalToken,updatePublicClientPortal,listStaff,saveStaff,listCalendarEvents,saveCalendarEvent,updateStripeBilling,findOrganizationByStripe
} from "./storage.mjs";
import { can } from "../../../packages/access/src/index.mjs";
import { authenticateRequest } from "../../../packages/auth/src/index.mjs";
import { billingSnapshot,changePlan,plans,createCheckoutSession,stripeConfigured,billingCurrencies,checkoutCurrencyConfigured } from "./billing.mjs";
import { configureTelegramBot, telegramApi, telegramMiniAppUrl, verifyTelegramInitData } from "./telegram.mjs";
import { updateOrderStatusWithStockRelease } from "./order-status.mjs";
import { listInvoices,createInvoice,updateInvoiceStatus } from "./invoices.mjs";
import { recordEvent,analyticsSummary,recordAudit,listAudit } from "./analytics.mjs";

const port=Number(process.env.PORT||4000);
const rateBuckets=new Map();
const idempotencyCache=new Map();
function rateLimit(key,limit=30,windowMs=60000){
  const now=Date.now(); const hit=rateBuckets.get(key);
  if(!hit||now-hit.startedAt>=windowMs){rateBuckets.set(key,{startedAt:now,count:1});return true;}
  hit.count+=1; return hit.count<=limit;
}
function requestKey(req){const value=String(req.headers["idempotency-key"]||"").trim();return value&&/^[A-Za-z0-9._:-]{8,128}$/.test(value)?value:null;}
const projects=new Map([
  ["p1",{id:"p1",name:"Maison Noire",type:"website_mini_app",industry:"restaurant",status:"active",organizationId:"org_demo",slug:"maison-noire"}],
  ["p2",{id:"p2",name:"Forma Fitness",type:"mini_app",industry:"fitness",status:"active",organizationId:"org_demo",slug:"forma-fitness"}]
]);
const clients=new Map(),leads=new Map(),bookings=new Map(),catalogItems=new Map(),orders=new Map();
const publishedProjects=new Set();
const legacyProjectIds={p1:"00000000-0000-4000-8000-000000000101",p2:"00000000-0000-4000-8000-000000000102"};
function resolvePublicProjectId(projectId){return legacyProjectIds[projectId]||projectId;}
async function getPublicProject(projectId){
  if(process.env.DATABASE_URL) return await getPublishedProject(projectId);
  const demo=projects.get(projectId);
  return demo||await getPublishedProject(projectId);
}
function isDemoProject(projectId){return !!projects.get(projectId)&&projects.get(projectId).organizationId==="org_demo";}
function demoCatalog(projectId){
  if(projectId==="p1") return [
    {id:"demo-p1-1",projectId,name:"Авторский завтрак",description:"Яйцо, авокадо, тост и кофе",price:14.9,currency:"EUR",status:"active",stock:null,itemType:"service"},
    {id:"demo-p1-2",projectId,name:"Паста трюфель",description:"Домашняя паста с пармезаном",price:19.5,currency:"EUR",status:"active",stock:null,itemType:"product"},
    {id:"demo-p1-3",projectId,name:"Дегустационный сет",description:"Выбор шефа на двоих",price:32,currency:"EUR",status:"active",stock:null,itemType:"product"}
  ];
  if(projectId==="p2") return [
    {id:"demo-p2-1",projectId,name:"Пробная тренировка",description:"Знакомство с тренером — 45 минут",price:0,currency:"EUR",status:"active",stock:null,itemType:"service"},
    {id:"demo-p2-2",projectId,name:"Персональная тренировка",description:"Индивидуальная программа",price:35,currency:"EUR",status:"active",stock:null,itemType:"service"},
    {id:"demo-p2-3",projectId,name:"Месячный абонемент",description:"Безлимитный доступ к залу",price:79,currency:"EUR",status:"active",stock:null,itemType:"service"}
  ];
  return [];
}


function headers(extra={}){return {
  "content-type":"application/json; charset=utf-8",
  ...(process.env.CORS_ORIGIN?{"access-control-allow-origin":process.env.CORS_ORIGIN}:{}),
  "vary":"Origin",
  "x-content-type-options":"nosniff",
  "x-frame-options":"DENY",
  "referrer-policy":"strict-origin-when-cross-origin",
  ...(process.env.NODE_ENV==="production"?{"strict-transport-security":"max-age=31536000; includeSubDomains"}:{}),
  "access-control-allow-methods":"GET,POST,PUT,PATCH,OPTIONS",
  "access-control-allow-headers":"content-type,authorization,x-torclix-user,x-torclix-organization,x-torclix-trial,idempotency-key,x-telegram-bot-api-secret-token",
  ...extra
};}
function json(res,status,data){res.writeHead(status,headers());res.end(JSON.stringify(data));}
function html(res,status,body){res.writeHead(status,{"content-type":"text/html; charset=utf-8"});res.end(body);}
async function body(req){let raw="";for await(const chunk of req){raw+=chunk;if(raw.length>1024*1024){const error=new Error("Request body too large");error.status=413;throw error;}}if(!raw)return {};try{return JSON.parse(raw);}catch{const error=new Error("Invalid JSON body");error.status=400;throw error;}}
function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function notifyTelegramUser(userId,text){if(!process.env.TELEGRAM_BOT_TOKEN||!userId)return;try{await telegramApi("sendMessage",{chat_id:userId,text});}catch(error){console.warn("Telegram notification failed",error?.message||error);}}
async function notifyTelegramAdmin(text){const chatId=String(process.env.TELEGRAM_ADMIN_CHAT_ID||"").trim();if(!chatId||!process.env.TELEGRAM_BOT_TOKEN)return;try{await telegramApi("sendMessage",{chat_id:chatId,text});}catch(error){console.warn("Telegram admin notification failed",error?.message||error);}}

function defaultDocument(projectId){return {projectId,activePage:"home",accent:"#d8ff3e",miniApp:{modules:["home","catalog","booking","profile","notifications"],navigation:["home","catalog","booking","profile","notifications"],theme:{accent:"#d8ff3e",mode:"dark"}},pages:[{id:"home",name:"Главная",blocks:[
  {id:"b1",type:"Hero",title:"Ваш бизнес — в одном цифровом пространстве",body:"Сайт, заявки, записи и мини‑приложение Telegram управляются из одной студии TorclixGroup."},
  {id:"b2",type:"Features",title:"Всё необходимое вашим клиентам",body:"Услуги, каталог, бронирование, заявки и клиентский путь — в одном удобном интерфейсе."},
  {id:"b3",type:"CTA",title:"Готовы начать?",body:"Оставьте заявку или откройте мини‑приложение прямо в Telegram."}
]}]};}
function renderPreview(project,doc){
  const page=doc.pages?.find(p=>p.id===doc.activePage)||doc.pages?.[0];
  const projectId=esc(project.id);
  const accent=esc(doc.accent||"#d8ff3e");
  const blocks=(page?.blocks||[]).map((b,i)=>`<section class="site-section" id="section-${i}">
    <div class="section-index">0${i+1} · ${esc(b.type==="Hero"?"Главный экран":b.type==="Features"?"Возможности":b.type==="CTA"?"Действие":b.type)}</div>
    <h2>${esc(b.title)}</h2><p>${esc(b.body)}</p>
    <button class="primary action" data-action="request">${b.type==="Booking"?"Записаться":b.type==="CTA"?"Оставить заявку":"Подробнее"} →</button>
  </section>`).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(project.name)} — сайт клиента, созданный в TorclixGroup"><title>${esc(project.name)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#080808;color:#f5f5f0;font-family:Inter,Arial,sans-serif}header{position:sticky;top:0;z-index:5;padding:20px 8vw;display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #222;background:rgba(8,8,8,.9);backdrop-filter:blur(12px)}header a{color:#f5f5f0;text-decoration:none}.brand{font-weight:900;letter-spacing:.08em}.header-actions{display:flex;gap:8px}.header-actions button,.nav-link{border:1px solid #2b2b2b;background:#111;color:#fff;border-radius:999px;padding:9px 13px;text-decoration:none;cursor:pointer}.hero{padding:90px 8vw 70px;max-width:1050px}.eyebrow,.section-index{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${accent};font-weight:800}.hero h1{font-size:clamp(52px,9vw,120px);line-height:.9;margin:14px 0 20px;max-width:1000px}.hero p{max-width:720px;font-size:20px;line-height:1.6;color:#aaa}.site-section,.shop,.request{padding:72px 8vw;border-top:1px solid #222}.site-section h2,.shop h2{font-size:clamp(40px,7vw,88px);line-height:.95;margin:16px 0}.site-section p{max-width:700px;font-size:20px;line-height:1.6;color:#aaa}.primary{border:0;border-radius:14px;padding:13px 18px;background:${accent};color:#080808;font-weight:850;cursor:pointer}.action{margin-top:10px}.shop h2{margin-bottom:28px}.catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.item{border:1px solid #292929;border-radius:20px;padding:18px;background:#101010}.item h3{margin:0 0 8px;font-size:22px}.muted{color:#999;line-height:1.5}.price{font-size:20px;font-weight:800;margin:14px 0}.cart{margin-top:20px;border:1px solid #292929;border-radius:20px;padding:18px;display:none}.cart.open{display:block}.cart-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #222}.field{width:100%;padding:12px;margin:6px 0;border:1px solid #333;border-radius:12px;background:#090909;color:#fff}.request-grid{max-width:650px}.status{min-height:20px;color:#aaa;margin-top:10px}.foot{padding:40px 8vw;color:#777;border-top:1px solid #222}.toast{position:fixed;right:20px;bottom:20px;padding:14px 16px;border-radius:14px;background:#151515;border:1px solid #333;display:none;z-index:20}.toast.open{display:block}@media(max-width:640px){header,.hero,.site-section,.shop,.request,.foot{padding-left:20px!important;padding-right:20px!important}.header-actions .nav-link{display:none}.hero{padding-top:55px}}
</style></head><body>
<header><a class="brand" href="#">${esc(project.name)}</a><div class="header-actions"><a class="nav-link" href="#catalog-section">Каталог</a><a id="telegramLink" class="nav-link" href="#" target="_blank" rel="noopener" hidden>Открыть в Telegram</a><button class="nav-link" data-action="request">Записаться / заявка</button></div></header>
<main><section class="hero"><div class="eyebrow">Клиентский сайт · TorclixGroup</div><h1>${esc(project.name)}</h1><p>${esc(page?.blocks?.[0]?.body||"Цифровой сервис для клиентов.")}</p><button class="primary action" data-action="request">Начать →</button></section>${blocks}
<section class="shop" id="catalog-section"><div class="section-index">Каталог</div><h2>Товары и услуги</h2><div id="catalog" class="catalog"><div class="muted">Загружаем каталог…</div></div>
<div id="cart" class="cart"><strong>Корзина</strong><div id="cartItems"></div><div class="price">Итого: <span id="cartTotal">0.00</span> <span id="cartCurrency">EUR</span></div><input id="customerName" class="field" placeholder="Ваше имя"><input id="customerEmail" class="field" placeholder="Email"><input id="customerPhone" class="field" placeholder="Телефон"><button id="order" class="primary">Оформить заказ</button><div id="orderStatus" class="status"></div></div></section>
<section class="request" id="request"><div class="section-index">Связаться</div><h2>Оставить заявку</h2><div class="request-grid"><input id="requestName" class="field" placeholder="Ваше имя"><input id="requestPhone" class="field" placeholder="Телефон"><input id="requestEmail" class="field" placeholder="Email"><textarea id="requestMessage" class="field" placeholder="Что вас интересует?" rows="4"></textarea><input id="requestWhen" class="field" type="datetime-local"><button id="requestSubmit" class="primary">Отправить заявку</button><div id="requestStatus" class="status"></div></div></section>
</main><footer class="foot">Создано и опубликовано в TorclixGroup · ${esc(project.name)}</footer><div id="toast" class="toast"></div>
<script>
const projectId="${projectId}";const cart=new Map();const catalogEl=document.getElementById("catalog");const cartEl=document.getElementById("cart");
async function hydrateTelegramLink(){try{const r=await fetch("/public/projects/"+encodeURIComponent(projectId)+"/telegram");const j=await r.json();const link=document.getElementById("telegramLink");if(r.ok&&j.data?.enabled&&j.data?.projectBotUrl){link.href=j.data.projectBotUrl;link.hidden=false}}catch{}}
void hydrateTelegramLink();
const escClient=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]||c));const money=(n,c)=>Number(n||0).toFixed(2)+" "+(c||"EUR");
function toast(t){const el=document.getElementById("toast");el.textContent=t;el.classList.add("open");setTimeout(()=>el.classList.remove("open"),2800)}
const analyticsSession=(()=>{try{const k="tg-analytics-session";let v=localStorage.getItem(k);if(!v){v=crypto.randomUUID();localStorage.setItem(k,v)}return v}catch{return "anon-"+Date.now().toString(36)}})();
async function track(type,path=location.pathname,extra={}){try{await fetch("/public/projects/"+encodeURIComponent(projectId)+"/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type,sessionId:analyticsSession,path,referrer:document.referrer||"",...extra}),keepalive:true})}catch{}}
void track("pageview");
document.addEventListener("click",e=>{const b=e.target.closest("button,a");if(!b)return;const label=(b.textContent||"").trim().slice(0,120);if(label)void track("click",location.pathname,{metadata:{label}})},{passive:true});
function renderCart(){const rows=[...cart.values()];document.getElementById("cartItems").innerHTML=rows.length?rows.map(x=>"<div class='cart-row'><span>"+escClient(x.name)+" × "+x.quantity+"</span><strong>"+money(x.price*x.quantity,x.currency)+"</strong></div>").join(""):"<div class='muted'>Корзина пуста</div>";document.getElementById("cartTotal").textContent=rows.reduce((s,x)=>s+x.price*x.quantity,0).toFixed(2);document.getElementById("cartCurrency").textContent=rows[0]?.currency||"EUR";cartEl.classList.toggle("open",rows.length>0)}
function add(item){if(!item)return;const x=cart.get(item.id)||{...item,quantity:0};x.quantity=Math.min(x.quantity+1,99);cart.set(item.id,x);renderCart();toast("Добавлено в корзину")}
async function loadCatalog(){try{const r=await fetch("/public/projects/"+projectId+"/catalog");const j=await r.json();if(!r.ok)throw new Error(j.error||"catalog");const items=(j.data||[]).filter(x=>x.status==="active");catalogEl.innerHTML=items.length?items.map(x=>"<article class='item'><h3>"+escClient(x.name)+"</h3><div class='muted'>"+escClient(x.description||"")+"</div><div class='price'>"+money(x.price,x.currency)+"</div><button class='primary' data-add='"+escClient(x.id)+"'>Добавить</button></article>").join(""):"<div class='muted'>Каталог пока пуст.</div>";catalogEl.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>add(items.find(x=>x.id===b.dataset.add)))}catch{catalogEl.innerHTML="<div class='muted'>Каталог временно недоступен.</div>"}}
document.querySelectorAll("[data-action='request']").forEach(b=>b.onclick=()=>{document.getElementById("request").scrollIntoView({behavior:"smooth"});document.getElementById("requestName").focus()});
document.getElementById("requestSubmit").onclick=async()=>{const status=document.getElementById("requestStatus");const name=document.getElementById("requestName").value.trim();const phone=document.getElementById("requestPhone").value.trim();const email=document.getElementById("requestEmail").value.trim();const message=document.getElementById("requestMessage").value.trim();const when=document.getElementById("requestWhen").value;if(!name){status.textContent="Укажите имя";return}status.textContent="Отправляем…";try{const endpoint=when?"/public/projects/"+projectId+"/bookings":"/public/projects/"+projectId+"/leads";const payload=when?{customerName:name,customerPhone:phone,customerEmail:email,startAt:new Date(when).toISOString(),service:message||"Заявка с сайта"}:{name,email,phone,source:"published_site",message};const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","idempotency-key":(crypto.randomUUID?.()||Date.now()+"-lead").replace(/[^A-Za-z0-9._:-]/g,"").slice(0,64)},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw new Error(j.message||j.error||"Не удалось отправить");status.textContent=when?"Запись принята.":"Заявка принята.";toast(when?"Запись подтверждена":"Заявка отправлена");document.getElementById("requestMessage").value=""}catch(e){status.textContent=e.message||"Не удалось отправить"}}
catch(e){status.textContent=e.message||"Не удалось отправить"}};
document.getElementById("order").onclick=async()=>{const rows=[...cart.values()];const status=document.getElementById("orderStatus");if(!rows.length){status.textContent="Добавьте товар или услугу";return}const customerName=document.getElementById("customerName").value.trim();if(!customerName){status.textContent="Укажите имя";return}status.textContent="Оформляем…";try{const key=(crypto.randomUUID?.()||Date.now()+"-"+Math.random()).replace(/[^A-Za-z0-9._:-]/g,"").slice(0,64);const r=await fetch("/public/projects/"+projectId+"/orders",{method:"POST",headers:{"content-type":"application/json","idempotency-key":key},body:JSON.stringify({customerName,customerEmail:document.getElementById("customerEmail").value.trim(),customerPhone:document.getElementById("customerPhone").value.trim(),items:rows.map(x=>({catalogItemId:x.id,quantity:x.quantity})),source:"published_site"})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Не удалось оформить заказ");status.textContent="Заказ принят: "+j.data.id;toast("Заказ оформлен");cart.clear();renderCart()}catch(e){status.textContent=e.message||"Не удалось оформить заказ"}};
renderCart();loadCatalog();
</script></body></html>`;
}
async function session(req){
  const identity=await authenticateRequest(req);
  if(!identity)return null;
  const user=await getSessionUser(identity.subject,identity.email,identity.name);if(!user)return null;
  const organizations=await listOrganizationsForUser(user.id);if(!organizations.length)return null;
  const requested=req.headers["x-torclix-organization"];
  const organization=organizations.find(o=>o.id===requested)||organizations[0];
  const role=await getMembershipRole(user.id,organization.id)||organization.role||"viewer";
  return {user:{...user,role},organization,organizations};
}
async function requireSession(req,res){const auth=await session(req);if(!auth){json(res,401,{error:"Authentication required"});return null;}return auth;}
async function requirePermission(req,res,permission){
  const auth=await requireSession(req,res);if(!auth)return null;
  if(!can(auth.user.role,permission)){json(res,403,{error:"Forbidden",permission});return null;}
  return auth;
}

function stripeSignatureValid(raw,header,secret){
  if(!secret||!header)return false;
  const parts=String(header).split(",").map(x=>x.split("="));
  const timestamp=parts.find(x=>x[0]==="t")?.[1];
  const signatures=parts.filter(x=>x[0]==="v1").map(x=>x[1]).filter(Boolean);
  if(!timestamp||!signatures.length)return false;
  const age=Math.abs(Math.floor(Date.now()/1000)-Number(timestamp));
  if(!Number.isFinite(age)||age>300)return false;
  const expected=crypto.createHmac("sha256",secret).update(String(timestamp)+"."+raw).digest("hex");
  return signatures.some(value=>{try{const a=Buffer.from(value,"hex"),b=Buffer.from(expected,"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b);}catch{return false;}});
}
async function rawBody(req){let raw="";for await(const chunk of req){raw+=chunk;if(raw.length>1024*1024){const error=new Error("Request body too large");error.status=413;throw error;}}return raw;}

const server=createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){json(res,204,{});return;}
  const {pathname:path}=new URL(req.url||"/","http://localhost");
  try{
    if(req.method==="POST" && (path.startsWith("/public/projects/")||path==="/tg/webhook")){
      const ip=String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"unknown").split(",")[0].trim();
      const limit=path==="/tg/webhook"?120:20;
      if(!rateLimit(path+":"+ip,limit,60000)){json(res,429,{error:"Слишком много запросов. Попробуйте позже."});return;}
    }
    const publicPortal=path.match(/^\/public\/client-portal\/([^/]+)$/);
    if(publicPortal&&req.method==="PATCH"){
      const token=decodeURIComponent(publicPortal[1]);
      if(!rateLimit("portal:"+token,12,60000)){json(res,429,{error:"Слишком много запросов. Попробуйте позже."});return;}
      const input=await body(req); const status=String(input.status||"review");
      if(!["review","approved","changes_requested"].includes(status)){json(res,400,{error:"Недопустимый статус портала"});return;}
      const updated=await updatePublicClientPortal(token,status,input.note||"");
      if(!updated){json(res,404,{error:"Портал клиента не найден"});return;}
      json(res,200,{data:updated});return;
    }
    if(publicPortal&&req.method==="GET"){
      const portal=await getPublicClientPortal(decodeURIComponent(publicPortal[1]));
      if(!portal){json(res,404,{error:"Портал клиента не найден"});return;}
      json(res,200,{data:portal});return;
    }
    if(path==="/api/billing/webhook"&&req.method==="POST"){
      const secret=String(process.env.STRIPE_WEBHOOK_SECRET||"").trim();
      if(!secret){json(res,503,{error:"Stripe webhook is not configured"});return;}
      const raw=await rawBody(req);
      if(!stripeSignatureValid(raw,req.headers["stripe-signature"],secret)){json(res,400,{error:"Invalid Stripe signature"});return;}
      let event;try{event=JSON.parse(raw);}catch{json(res,400,{error:"Invalid webhook payload"});return;}
      const eventId=String(event?.id||"").trim();
      if(eventId){
        const seenKey="stripe:"+eventId;
        if(idempotencyCache.has(seenKey)){json(res,200,{received:true,duplicate:true});return;}
        idempotencyCache.set(seenKey,{received:true});
      }
      const object=event?.data?.object||{};
      if(event?.type==="checkout.session.completed"){
        const organizationId=object?.metadata?.organization_id||object?.client_reference_id;
        const plan=object?.metadata?.plan;
        if(organizationId){await updateStripeBilling(organizationId,{customerId:object.customer||null,subscriptionId:object.subscription||null,status:"active",plan});}
      }else if(event?.type==="customer.subscription.updated"||event?.type==="customer.subscription.deleted"){
        const organization=await findOrganizationByStripe({customerId:object.customer||null,subscriptionId:object.id||null});
        if(organization){
          const priceId=object?.items?.data?.[0]?.price?.id;
          const plan=priceId===process.env.STRIPE_PRICE_STARTER||priceId===process.env.STRIPE_PRICE_STARTER_USD||priceId===process.env.STRIPE_PRICE_STARTER_RUB?"starter":priceId===process.env.STRIPE_PRICE_PRO||priceId===process.env.STRIPE_PRICE_PRO_USD||priceId===process.env.STRIPE_PRICE_PRO_RUB?"pro":priceId===process.env.STRIPE_PRICE_SCALE||priceId===process.env.STRIPE_PRICE_SCALE_USD||priceId===process.env.STRIPE_PRICE_SCALE_RUB?"scale":null;
          const status=event.type.endsWith("deleted")?"canceled":String(object.status||"inactive");
          await updateStripeBilling(organization.id,{customerId:object.customer||null,subscriptionId:object.id||null,status,plan});
        }
      }
      json(res,200,{received:true});return;
    }
    if(path==="/health"){json(res,200,{ok:true,service:"torclix-api",version:"0.7.0",storage:process.env.DATABASE_URL?"postgres":"memory",auth:process.env.NODE_ENV==="production"?"external-provider-required":(process.env.TORCLIX_DEV_AUTH==="true"?"development-session":"development-auth-disabled")});return;}
    if(path==="/api/session"&&req.method==="GET"){const auth=await requireSession(req,res);if(!auth)return;json(res,200,{data:{user:auth.user,organization:auth.organization,organizations:auth.organizations}});return;}
    if(path==="/api/team"&&req.method==="GET"){const auth=await requirePermission(req,res,"team:read");if(!auth)return;json(res,200,{data:await listTeamMembers(auth.organization.id)});return;}
    if(path==="/api/billing"&&req.method==="GET"){const auth=await requirePermission(req,res,"billing:read");if(!auth)return;const p=await listProjects(projects,auth.organization.id);const leadRecords=await listRecords("leads",leads,auth.organization.id);const teamMembers=await listTeamMembers(auth.organization.id);const staffMembers=await listStaff(new Map(),auth.organization.id);json(res,200,{data:{...billingSnapshot(auth.organization,{projects:p.length,members:teamMembers.length,staff:staffMembers.filter(x=>x.status!=="inactive").length,leads:leadRecords.length})}});return;}
    if(path==="/api/billing/plans"&&req.method==="GET"){json(res,200,{data:Object.entries(plans).map(([id,x])=>({id,name:id==="starter"?"Starter":id==="pro"?"Pro":"Scale",price:x.price,limits:x}))});return;}
    if(path==="/api/billing/checkout"&&req.method==="POST"){
      const auth=await requirePermission(req,res,"billing:write");if(!auth)return;
      const input=await body(req);const plan=String(input.plan||"");const currency=String(input.currency||"EUR").toUpperCase();
      if(!plans[plan]){json(res,400,{error:"Invalid plan"});return;}
      if(!stripeConfigured()){json(res,503,{error:"Платёжный провайдер пока не настроен",configured:false});return;}
      if(!billingCurrencies().includes(currency)){json(res,400,{error:"Неподдерживаемая валюта",availableCurrencies:billingCurrencies()});return;}
      if(!checkoutCurrencyConfigured(plan,currency)){json(res,503,{error:"Для выбранного тарифа и валюты Stripe Price не настроен",currency,plan});return;}
      const origin=String(input.origin||process.env.WEB_PUBLIC_BASE||"").replace(/\/$/,"");
      if(!origin){json(res,400,{error:"origin is required"});return;}
      const result=await createCheckoutSession({organizationId:auth.organization.id,plan,currency,successUrl:origin+"?billing=success",cancelUrl:origin+"?billing=cancelled"});
      if(result.error){json(res,502,{error:result.error,configured:result.configured});return;}
      await recordAudit(auth,"billing.checkout.create","organization",auth.organization.id,{plan});
      json(res,200,{data:result});return;
    }
    if(path==="/api/billing/plan"&&req.method==="POST"){const auth=await requirePermission(req,res,"billing:write");if(!auth)return;const input=await body(req);let result;try{result=await changePlan(auth.organization.id,String(input.plan||""));}catch(error){json(res,400,{error:error?.message||"Invalid plan"});return;}if(!result){json(res,404,{error:"Organization not found"});return;}await recordAudit(auth,"billing.plan.change","organization",auth.organization.id,{plan:result.plan});json(res,200,{data:result});return;}
    if(path.startsWith("/public/projects/")&&path.endsWith("/telegram")&&req.method==="GET"){
      const match=path.match(/^\/public\/projects\/([^/]+)\/telegram$/);const requestedProjectId=match?.[1];const projectId=resolvePublicProjectId(requestedProjectId);const project=await getPublicProject(projectId);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const integration=await getTelegramIntegration(project.organizationId,project.id);
      const botUsername=integration?.enabled?String(integration.botUsername||"").trim():"";
      json(res,200,{data:{enabled:!!botUsername,botUsername:botUsername||null,botUrl:botUsername?"https://t.me/"+botUsername:null,projectBotUrl:botUsername?"https://t.me/"+botUsername+"?start="+encodeURIComponent(project.id):null,miniAppUrl:telegramMiniAppUrl(project.id)}});return;
    }
    if(path.startsWith("/public/projects/")&&path.endsWith("/catalog")&&req.method==="GET"){
      const match=path.match(/^\/public\/projects\/([^/]+)\/catalog$/);const requestedProjectId=match?.[1];const projectId=resolvePublicProjectId(requestedProjectId);
      const project=await getPublicProject(projectId);
      if(!project){json(res,404,{error:"Project not found"});return;}
      json(res,200,{data:await listCatalogItems(catalogItems,project.organizationId,projectId)});return;
    }
    if(path.startsWith("/public/projects/")&&path.endsWith("/orders")&&req.method==="POST"){
      const match=path.match(/^\/public\/projects\/([^/]+)\/orders$/);const requestedProjectId=match?.[1];const projectId=resolvePublicProjectId(requestedProjectId);
      const project=await getPublicProject(projectId);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const idem=requestKey(req);const cacheKey=idem?"public-order:"+projectId+":"+idem:null;const cached=cacheKey?idempotencyCache.get(cacheKey):null;if(cached){json(res,cached.status,cached.body);return;}
      const input=await body(req);const customerName=String(input.customerName||"").trim();
      if(!customerName){json(res,400,{error:"customerName is required"});return;}
      const source=String(input.source||"website");
      let telegramUser=null;
      if(source==="telegram_mini_app"){
        telegramUser=verifyTelegramInitData(String(input.initData||""),process.env.TELEGRAM_BOT_TOKEN||"");
        if(!telegramUser){json(res,401,{error:"Telegram авторизация недействительна"});return;}
      }
      const rawItems=Array.isArray(input.items)?input.items:[];if(!rawItems.length){json(res,400,{error:"items are required"});return;}
      const catalog=await listCatalogItems(catalogItems,project.organizationId,projectId);
      const byId=new Map(catalog.map(x=>[x.id,x]));const items=[];let total=0;let currency="EUR";
      for(const raw of rawItems){
        const item=byId.get(String(raw.catalogItemId||""));const quantity=Math.floor(Number(raw.quantity||1));
        if(!item||item.status!=="active"||!Number.isFinite(quantity)||quantity<1||quantity>99){json(res,400,{error:"Invalid order item"});return;}
        if(item.stock!==null&&Number(item.stock)<quantity){json(res,409,{error:"Insufficient stock",itemId:item.id});return;}
        const unitPrice=Number(item.price||0);const line=unitPrice*quantity;total+=line;currency=item.currency||currency;
        items.push({id:newId(),catalogItemId:item.id,name:item.name,quantity,unitPrice,total:line});
      }
      if(total>100000000){json(res,400,{error:"Order total is too large"});return;}
      const order={id:newId(),organizationId:project.organizationId,projectId,customerName,customerEmail:input.customerEmail?String(input.customerEmail).trim():null,customerPhone:input.customerPhone?String(input.customerPhone).trim():null,status:"pending",currency,total,source,telegramUserId:telegramUser?.id||null,telegramUsername:telegramUser?.username||null,items};
      let saved;
      try{saved=await saveOrder(order,items);}
      catch(error){
        if(error instanceof Error&&error.message==="INSUFFICIENT_STOCK"){json(res,409,{error:"Insufficient stock"});return;}
        throw error;
      }
      if(!process.env.DATABASE_URL){
        for(const item of items){const local=catalogItems.get(item.catalogItemId);if(local&&local.stock!==null){local.stock=Math.max(0,Number(local.stock)-item.quantity);catalogItems.set(local.id,local);}}
        orders.set(order.id,saved);
      }
      if(telegramUser?.id)await notifyTelegramUser(telegramUser.id,"Заказ принят: "+project.name+". Сумма "+order.total.toFixed(2)+" "+order.currency+".");
      await notifyTelegramAdmin("Новый заказ · "+project.name+"\n"+order.customerName+" · "+order.total.toFixed(2)+" "+order.currency);
      const response={data:{id:order.id,status:order.status,total:order.total,currency:order.currency}};
      if(cacheKey)idempotencyCache.set(cacheKey,{status:201,body:response});json(res,201,response);return;
    }

    if(path==="/api/catalog"&&req.method==="GET"){
      const auth=await requirePermission(req,res,"catalog:read");if(!auth)return;
      const url=new URL(req.url||"/","http://localhost");
      const projectId=url.searchParams.get("projectId");
      if(projectId){
        const project=projects.get(projectId);
        const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);
        if(!owned){json(res,404,{error:"Project not found"});return;}
      }
      json(res,200,{data:await listCatalogItems(catalogItems,auth.organization.id,projectId)});return;
    }
    if(path==="/api/catalog"&&req.method==="POST"){
      const auth=await requirePermission(req,res,"catalog:write");if(!auth)return;
      const input=await body(req);
      const projectId=String(input.projectId||"").trim();
      const project=projects.get(projectId);
      const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);
      if(!owned){json(res,400,{error:"A valid projectId is required"});return;}
      const name=String(input.name||"").trim();
      if(!name){json(res,400,{error:"name is required"});return;}
      const slug=(String(input.slug||name).toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"item");
      const item={id:newId(),organizationId:auth.organization.id,projectId,name,slug,
        itemType:["product","service"].includes(String(input.itemType))?String(input.itemType):"service",
        description:input.description?String(input.description):"",
        price:Number.isFinite(Number(input.price))?Math.max(0,Number(input.price)):0,
        currency:String(input.currency||"EUR").toUpperCase().slice(0,3),
        category:input.category?String(input.category):null,
        status:["active","draft","archived"].includes(String(input.status))?String(input.status):"active",
        stock:input.stock===null||input.stock===undefined||input.stock===""?null:Math.max(0,Math.floor(Number(input.stock))),
        imageUrl:input.imageUrl?String(input.imageUrl):null};
      if(!Number.isFinite(item.price)||item.price>100000000){json(res,400,{error:"Invalid price"});return;}
      if(item.stock!==null&&!Number.isFinite(item.stock)){json(res,400,{error:"Invalid stock"});return;}
      const saved=await saveCatalogItem(item);if(!process.env.DATABASE_URL)catalogItems.set(item.id,item);
      json(res,201,{data:saved});return;
    }
    const catalogId=path.match(/^\/api\/catalog\/([^/]+)$/);
    if(catalogId&&(req.method==="PATCH"||req.method==="PUT")){
      const auth=await requirePermission(req,res,"catalog:write");if(!auth)return;
      const current=await getCatalogItem(catalogId[1],auth.organization.id) || catalogItems.get(catalogId[1]);
      if(!current||current.organizationId!==auth.organization.id){json(res,404,{error:"Catalog item not found"});return;}
      const input=await body(req);
      const projectId=String(input.projectId||current.projectId);
      const project=projects.get(projectId);
      const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);
      if(!owned){json(res,400,{error:"A valid projectId is required"});return;}
      const price=input.price===undefined?Number(current.price):Number(input.price);
      const stock=input.stock===undefined?current.stock:(input.stock===null||input.stock===""?null:Number(input.stock));
      if(!Number.isFinite(price)||price<0||price>100000000){json(res,400,{error:"Invalid price"});return;}
      if(stock!==null&&(!Number.isFinite(stock)||stock<0)){json(res,400,{error:"Invalid stock"});return;}
      const next={...current,projectId,name:input.name===undefined?current.name:String(input.name).trim(),slug:input.slug===undefined?current.slug:(String(input.slug).toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||current.slug),itemType:input.itemType===undefined?current.itemType:(["product","service"].includes(String(input.itemType))?String(input.itemType):"service"),description:input.description===undefined?current.description:String(input.description),price,currency:input.currency===undefined?current.currency:String(input.currency).toUpperCase().slice(0,3),category:input.category===undefined?current.category:(input.category?String(input.category):null),status:input.status===undefined?current.status:(["active","draft","archived"].includes(String(input.status))?String(input.status):current.status),stock,imageUrl:input.imageUrl===undefined?current.imageUrl:(input.imageUrl?String(input.imageUrl):null)};
      if(!next.name){json(res,400,{error:"name is required"});return;}
      const saved=await saveCatalogItem(next);if(!process.env.DATABASE_URL)catalogItems.set(next.id,next);
      json(res,200,{data:saved});return;
    }
    if(catalogId&&req.method==="DELETE"){
      const auth=await requirePermission(req,res,"catalog:write");if(!auth)return;
      const current=await getCatalogItem(catalogId[1],auth.organization.id) || catalogItems.get(catalogId[1]);
      if(!current||current.organizationId!==auth.organization.id){json(res,404,{error:"Catalog item not found"});return;}
      const archived=await archiveCatalogItem(catalogId[1],auth.organization.id);
      if(!process.env.DATABASE_URL)catalogItems.delete(catalogId[1]);
      json(res,200,{data:archived||{...current,status:"archived"}});return;
    }

    if(path==="/api/orders"&&req.method==="GET"){
      const auth=await requirePermission(req,res,"billing:read");if(!auth)return;
      const url=new URL(req.url||"/","http://localhost");const projectId=url.searchParams.get("projectId");
      json(res,200,{data:await listOrders(orders,auth.organization.id,projectId)});return;
    }
    const orderId=path.match(/^\/api\/orders\/([^/]+)$/);
    if(orderId&&req.method==="PATCH"){
      const auth=await requirePermission(req,res,"orders:write");if(!auth)return;
      const input=await body(req);const status=String(input.status||"");
      if(!["pending","paid","processing","completed","cancelled","refunded"].includes(status)){json(res,400,{error:"Invalid order status"});return;}
      const updated=await updateOrderStatusWithStockRelease(orderId[1],auth.organization.id,status,async()=>{
        const saved=await updateOrderStatus(orderId[1],auth.organization.id,status);
        if(saved) return saved;
        const local=orders.get(orderId[1]);
        if(!local||local.organizationId!==auth.organization.id) return null;
        const wasReleased=local.stockReleasedAt;
        if((status==="cancelled"||status==="refunded")&&!wasReleased){
          const items=Array.isArray(local.items)?local.items:[];
          for(const item of items){
            const catalog=catalogItems.get(item.catalogItemId);
            if(catalog&&catalog.stock!==null) catalog.stock=Number(catalog.stock)+Number(item.quantity||0);
          }
          local.stockReleasedAt=new Date().toISOString();
        }
        local.status=status;
        orders.set(local.id,local);
        return local;
      });
      if(!updated){json(res,404,{error:"Order not found"});return;}
      json(res,200,{data:updated});return;
    }

    if(path==="/api/staff"&&req.method==="GET"){const auth=await requirePermission(req,res,"projects:read");if(!auth)return;json(res,200,{data:await listStaff(new Map(),auth.organization.id)});return;}
    if(path==="/api/staff"&&req.method==="POST"){const auth=await requirePermission(req,res,"projects:write");if(!auth)return;const input=await body(req);const plan=plans[auth.organization.plan]||plans.starter;const currentStaff=await listStaff(new Map(),auth.organization.id);if(currentStaff.filter(x=>x.status!=="inactive").length>=plan.members){json(res,409,{error:"STAFF_LIMIT_REACHED",message:`Лимит команды тарифа ${auth.organization.plan||"starter"} достигнут`,limit:plan.members,usage:currentStaff.filter(x=>x.status!=="inactive").length});return;}const member={id:newId(),organizationId:auth.organization.id,name:String(input.name||"Сотрудник"),role:String(input.role||"staff"),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,status:"active"};const saved=await saveStaff(member);await recordAudit(auth,"staff.create","staff",member.id,{name:member.name});json(res,201,{data:saved||member});return;}
    if(path==="/api/calendar/events"&&req.method==="GET"){const auth=await requirePermission(req,res,"bookings:read");if(!auth)return;const q=new URL(req.url||"/","http://localhost").searchParams;json(res,200,{data:await listCalendarEvents(new Map(),auth.organization.id,q.get("from"),q.get("to"))});return;}
    if(path==="/api/calendar/events"&&req.method==="POST"){const auth=await requirePermission(req,res,"bookings:write");if(!auth)return;const input=await body(req);if(!input.title||!input.startAt||!input.endAt){json(res,400,{error:"title, startAt and endAt are required"});return;}const start=new Date(String(input.startAt)),end=new Date(String(input.endAt));if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start){json(res,400,{error:"Некорректный интервал календаря"});return;}const status=String(input.status||"scheduled");if(!["scheduled","confirmed","completed","cancelled"].includes(status)){json(res,400,{error:"Invalid calendar status"});return;}const projectId=input.projectId?String(input.projectId):null;const staffId=input.staffId?String(input.staffId):null;if(projectId){const project=projects.get(projectId);const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);if(!owned){json(res,404,{error:"Project not found"});return;}}if(staffId){const staffList=await listStaff(new Map(),auth.organization.id);if(!staffList.some(x=>String(x.id)===staffId)){json(res,404,{error:"Staff member not found"});return;}}const event={id:newId(),organizationId:auth.organization.id,projectId,staffId,bookingId:input.bookingId?String(input.bookingId):null,title:String(input.title).trim().slice(0,200),startAt:start.toISOString(),endAt:end.toISOString(),status,notes:input.notes?String(input.notes).slice(0,2000):undefined};if(!event.title){json(res,400,{error:"Название события обязательно"});return;}const saved=await saveCalendarEvent(event);await recordAudit(auth,"calendar.create","calendar_event",event.id,{title:event.title});json(res,201,{data:saved||event});return;}
    if(path==="/api/projects"&&req.method==="GET"){const auth=await requirePermission(req,res,"projects:read");if(!auth)return;json(res,200,{data:await listProjects(projects,auth.organization.id)});return;}
    if(path==="/api/audit"&&req.method==="GET"){const auth=await requirePermission(req,res,"audit:read");if(!auth)return;const q=new URL(req.url||"/","http://localhost").searchParams;json(res,200,{data:await listAudit(auth.organization.id,q.get("limit"))});return;}
    if(path==="/api/analytics"&&req.method==="GET"){
      const auth=await requirePermission(req,res,"analytics:read");if(!auth)return;
      const projectRows=await listProjects(projects,auth.organization.id);
      const leadRows=await listRecords("leads",leads,auth.organization.id);
      const bookingRows=await listRecords("bookings",bookings,auth.organization.id);
      const clientRows=await listRecords("clients",clients,auth.organization.id);
      const liveProjects=projectRows.filter(p=>p.status==="active").length;
      const draftProjects=projectRows.filter(p=>p.status!=="active").length;
      const leadStatus=leadRows.reduce((acc,item)=>{const key=String(item.status||"new");acc[key]=(acc[key]||0)+1;return acc;},{});
      const bookingStatus=bookingRows.reduce((acc,item)=>{const key=String(item.status||"pending");acc[key]=(acc[key]||0)+1;return acc;},{});
      const byProject=projectRows.map(project=>({
        projectId:project.id,name:project.name,leads:leadRows.filter(x=>x.projectId===project.id).length,
        bookings:bookingRows.filter(x=>x.projectId===project.id).length
      }));
      const traffic=await analyticsSummary(auth.organization.id,{days:30});
      json(res,200,{data:{projects:{total:projectRows.length,live:liveProjects,draft:draftProjects},leads:{total:leadRows.length,status:leadStatus},bookings:{total:bookingRows.length,status:bookingStatus},clients:{total:clientRows.length},byProject,traffic,generatedAt:new Date().toISOString()}});
      return;
    }

    if(path==="/api/projects"&&req.method==="POST"){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      const input=await body(req);const name=String(input.name||"Untitled project");
      const currentProjects=await listProjects(projects,auth.organization.id);
      const plan=plans[auth.organization.plan]||plans.starter;
      if(currentProjects.length>=plan.projects){json(res,409,{error:"PROJECT_LIMIT_REACHED",message:`Лимит проектов тарифа ${auth.organization.plan||"starter"} достигнут`,limit:plan.projects,usage:currentProjects.length});return;}
      const type=String(input.type||"website");
      if(!["website","mini_app","website_mini_app"].includes(type)){json(res,400,{error:"Unsupported project type"});return;}
      const industry=String(input.industry||"services").toLowerCase().trim().replace(/\s+/g,"_");
      const slug=String(input.slug||name).toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"untitled";
      const project={id:newId(),name,type,industry,status:"draft",organizationId:auth.organization.id,slug};
      await saveProject(project);if(!process.env.DATABASE_URL)projects.set(project.id,project);await saveDocument(project.id,project.organizationId,defaultDocument(project.id));json(res,201,{data:project});return;
    }
    const portal=path.match(/^\/api\/projects\/([^/]+)\/client-portal$/);
    if(portal&&req.method==="GET"){
      const auth=await requirePermission(req,res,"projects:read");if(!auth)return;
      const projectId=portal[1]; const project=projects.get(projectId)?.organizationId===auth.organization.id?projects.get(projectId):await getProject(projectId,auth.organization.id);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const data=await getClientPortal(projectId,auth.organization.id);if(data&&!data.token&&process.env.DATABASE_URL){data.token=await ensureClientPortalToken(projectId,auth.organization.id);}if(data&&data.token){data.portalUrl=(process.env.API_PUBLIC_BASE||"")+"/portal/"+data.token;}json(res,200,{data});return;
    }
    if(portal&&(req.method==="PATCH"||req.method==="PUT")){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      const projectId=portal[1]; const project=projects.get(projectId)?.organizationId===auth.organization.id?projects.get(projectId):await getProject(projectId,auth.organization.id);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const input=await body(req); const data=await updateClientPortal(projectId,auth.organization.id,String(input.status||"draft"),String(input.note||""));
      if(!process.env.DATABASE_URL&&projects.has(projectId)){projects.set(projectId,{...project,clientPortalStatus:data.status,clientPortalNote:data.note,clientPortalUpdatedAt:data.updatedAt});}
      await recordAudit(auth,"client_portal.update","project",projectId,{status:data.status});
      json(res,200,{data});return;
    }
    const pm=path.match(/^\/api\/projects\/([^/]+)$/);
    if(pm&&(req.method==="PATCH"||req.method==="PUT")){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      const input=await body(req);const current=projects.get(pm[1])?.organizationId===auth.organization.id?projects.get(pm[1]):await getProject(pm[1],auth.organization.id);
      if(!current){json(res,404,{error:"Project not found"});return;}
      const next={...current,...input,id:current.id,organizationId:auth.organization.id};
      await saveProject(next);if(!process.env.DATABASE_URL)projects.set(next.id,next);json(res,200,{data:next});return;
    }
    if(pm&&req.method==="GET"){const auth=await requirePermission(req,res,"projects:read");if(!auth)return;const current=projects.get(pm[1]);if(current?.organizationId===auth.organization.id){json(res,200,{data:current});return;}const found=await getProject(pm[1],auth.organization.id);found?json(res,200,{data:found}):json(res,404,{error:"Project not found"});return;}
    const dm=path.match(/^\/api\/projects\/([^/]+)\/document$/);
    if(dm){
      const permission=req.method==="GET"?"projects:read":"projects:write";const auth=await requirePermission(req,res,permission);if(!auth)return;
      const projectId=dm[1];const current=projects.get(projectId);
      const owned=current?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);
      if(!owned){json(res,404,{error:"Project not found"});return;}
      if(req.method==="GET"){json(res,200,{data:await getDocument(projectId,auth.organization.id,()=>defaultDocument(projectId))});return;}
      if(req.method==="PUT"||req.method==="PATCH"){const input=await body(req);const currentDoc=await getDocument(projectId,auth.organization.id,()=>defaultDocument(projectId));const next={...currentDoc,...input,projectId};await saveDocument(projectId,auth.organization.id,next);json(res,200,{data:next});return;}
    }
    const publish=path.match(/^\/api\/projects\/([^/]+)\/publish$/);
    if(publish&&req.method==="POST"){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      const projectId=publish[1];
      const idem=requestKey(req);
      const cached=idem? idempotencyCache.get(auth.user.id+":"+projectId+":"+idem):null;
      if(cached){json(res,cached.status,cached.body);return;}
      const memory=projects.get(projectId);
      const project=memory?.organizationId===auth.organization.id?memory:await getProject(projectId,auth.organization.id);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const document=await getDocument(projectId,auth.organization.id,()=>defaultDocument(projectId));
      await publishDocument(projectId,auth.organization.id,document);
      if(!process.env.DATABASE_URL) publishedProjects.add(projectId);
      if(!process.env.DATABASE_URL) project.status="active";
      if(!process.env.DATABASE_URL) projects.set(project.id,project);
      if(process.env.DATABASE_URL) await saveProject({...project,status:"active"});
      const response={data:{project:{...project,status:"active"},published:true}};
      await recordAudit(auth,"project.publish","project",projectId,{name:project.name});
      if(idem) idempotencyCache.set(auth.user.id+":"+projectId+":"+idem,{status:200,body:response});
      json(res,200,response);
      return;
    }
    if(publish&&req.method==="DELETE"){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      const projectId=publish[1];
      const memory=projects.get(projectId);
      const project=memory?.organizationId===auth.organization.id?memory:await getProject(projectId,auth.organization.id);
      if(!project){json(res,404,{error:"Project not found"});return;}
      await unpublishDocument(projectId,auth.organization.id);
      if(!process.env.DATABASE_URL) publishedProjects.delete(projectId);
      json(res,200,{data:{published:false}});
      return;
    }
    const published=path.match(/^\/published\/([^/]+)$/);
    if(published&&req.method==="GET"){
      const requestedProjectId=published[1];
      const project=await getPublicProject(resolvePublicProjectId(requestedProjectId));
      if(!project){html(res,404,"<h1>Опубликованный проект не найден</h1>");return;}
      const document=await getPublishedDocument(project.id)||(isDemoProject(project.id)?defaultDocument(project.id):null);
      if(!document){html(res,404,"<h1>Опубликованный проект ещё не опубликован</h1>");return;}
      html(res,200,renderPreview(project,document));return;
    }
    const miniApp=path.match(/^\/miniapp\/([^/]+)$/);
    if(miniApp&&req.method==="GET"){
      const requestedProjectId=miniApp[1];
      const projectId=resolvePublicProjectId(requestedProjectId);
      const project=await getPublicProject(projectId);
      if(!project){html(res,404,"<h1>Мини‑приложение не найдено</h1>");return;}
      const document=await getPublishedDocument(project.id) || (isDemoProject(project.id)?defaultDocument(project.id):null);
      if(!document){html(res,404,"<h1>Мини‑приложение ещё не опубликовано</h1>");return;}
      if(!document){html(res,404,"<h1>Мини‑приложение ещё не опубликовано</h1>");return;}
      const page=document.pages?.find(p=>p.id===document.activePage)||document.pages?.[0];
      const modules=Array.isArray(document.miniApp?.modules)&&document.miniApp.modules.length?document.miniApp.modules:["home","profile","notifications"];
      const moduleLabels={home:"Главная",catalog:"Каталог",booking:"Бронирование",calendar:"Календарь",cart:"Корзина и заказ",membership:"Абонементы",loyalty:"Лояльность",profile:"Профиль",notifications:"Уведомления",telegram:"Telegram"};
      const moduleNav=modules.map(id=>"<a href=\"#module-"+esc(id)+"\">"+esc(moduleLabels[id]||id)+"</a>").join("");
      const moduleCards=modules.filter(id=>id!=="home"&&id!=="catalog"&&id!=="cart").map(id=>{
        if(id==="booking") return "<section id=\"module-booking\" class=\"tg-module\"><div class=\"eyebrow\">Бронирование</div><h3>Запись онлайн</h3><p>Выберите удобную дату и время.</p><input id=\"tgBookingName\" placeholder=\"Ваше имя\"><input id=\"tgBookingPhone\" placeholder=\"Телефон\"><input id=\"tgBookingWhen\" type=\"datetime-local\"><button class=\"tg-action\" id=\"tgBookingSubmit\">Забронировать</button><div class=\"status\" id=\"tgBookingStatus\"></div></section>";
        if(id==="profile") return "<section id=\"module-profile\" class=\"tg-module\"><div class=\"eyebrow\">Профиль</div><h3>Ваш профиль</h3><p id=\"tgProfileText\">Профиль Telegram загрузится автоматически при открытии приложения.</p></section>";
        return "<section id=\"module-"+esc(id)+"\" class=\"tg-module\"><div class=\"eyebrow\">"+esc(moduleLabels[id]||id)+"</div><h3>"+esc(moduleLabels[id]||id)+"</h3><p>Модуль подключён в TorclixGroup. Здесь клиент сможет пользоваться этой функцией вашего сервиса.</p></section>";
      }).join("");
      const hasShop=modules.includes("catalog")||modules.includes("cart");
      const blocks=(page?.blocks||[]).map((b,i)=>{const target=b.type==="CTA"?"request":b.type==="Hero"?"module-home":b.type==="Booking"&&modules.includes("booking")?"module-booking":(modules.includes("catalog")||modules.includes("cart")?"module-catalog":"request");const label=b.type==="CTA"?"Оставить заявку":target==="module-catalog"?"Открыть каталог":"Открыть";return '<article class="tg-block"><small>0'+(i+1)+' · '+esc(b.type==="Hero"?"Главный экран":b.type==="Features"?"Возможности":b.type==="CTA"?"Действие":b.type)+'</small><h2>'+esc(b.title)+'</h2><p>'+esc(b.body)+'</p><button class="tg-action" data-target="'+esc(target)+'">'+label+'</button></article>'}).join("");
      const accent=esc(document.accent||"#d8ff3e");
      const projectName=esc(project.name);
      html(res,200,`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="color-scheme" content="dark light"><script src="https://telegram.org/js/telegram-web-app.js"></script><title>${projectName}</title><style>
:root{--accent:${accent};--bg:#0b0d0e;--card:#151819;--text:#f5f7f2;--muted:#9da39e;--line:#262a2b}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100vh}main{max-width:620px;margin:auto;padding:calc(18px + env(safe-area-inset-top)) 18px calc(48px + env(safe-area-inset-bottom))}.brand{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 0 24px}.brand-mark{font-weight:900;letter-spacing:.08em}.tg-user{font-size:13px;color:var(--muted);text-align:right}.hero{padding:20px 0 28px}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:800}.hero h1{font-size:clamp(38px,11vw,64px);line-height:.94;margin:12px 0}.tg-nav{display:flex;gap:8px;overflow:auto;padding:4px 0 18px}.tg-nav a{white-space:nowrap;color:var(--text);text-decoration:none;border:1px solid var(--line);padding:9px 12px;border-radius:999px;font-size:13px}.tg-module{padding:22px 0;border-top:1px solid var(--line)}.tg-module h3{font-size:28px;margin:8px 0}.tg-module p{color:var(--muted);line-height:1.5}.hero p{font-size:17px;line-height:1.55;color:var(--muted);margin:0}.tg-block{padding:22px 0;border-top:1px solid var(--line)}.tg-block small{color:var(--muted)}.tg-block h2{font-size:27px;line-height:1.05;margin:9px 0}.tg-block p{line-height:1.55;color:var(--muted)}button{font:inherit}.tg-action{width:100%;border:0;border-radius:14px;padding:14px 16px;background:var(--accent);color:#0a0b0b;font-weight:800;margin-top:8px}.request{display:none;border:1px solid var(--line);background:var(--card);border-radius:18px;padding:16px;margin-top:16px}.request.open{display:block}.request input{width:100%;padding:13px 12px;margin:6px 0;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--text);outline:none}.request .submit{margin-top:8px}.status{min-height:20px;color:var(--muted);font-size:13px;margin-top:10px}.foot{color:var(--muted);font-size:12px;text-align:center;padding-top:28px}</style></head><body><main>
<header class="brand"><div class="brand-mark">TORCLIXGROUP</div><div class="tg-user" id="tgUser">Telegram</div></header>
<section class="hero"><div class="eyebrow">Мини‑приложение</div><h1>${projectName}</h1><p>${esc(page?.blocks?.[0]?.body||"Ваш сервис всегда под рукой.")}</p></section>
<nav class="tg-nav">${moduleNav}</nav><section>${blocks}</section>${moduleCards}${hasShop?`<section id="module-catalog" class="tg-module"><div class="eyebrow">Каталог</div><h3>Каталог услуг и товаров</h3><div id="tgCatalog"><p>Загружаем каталог…</p></div><div id="tgCart" style="display:none;margin-top:16px"><strong>Корзина</strong><div id="tgCartItems"></div><p>Итого: <b id="tgCartTotal">0.00 EUR</b></p><input id="tgOrderName" placeholder="Ваше имя" style="width:100%;padding:12px;box-sizing:border-box"><button class="tg-action" id="tgOrder">Оформить заказ</button><div class="status" id="tgOrderStatus"></div></div></section>`:""}<section class="request" id="request"><strong>Оставить заявку</strong><input id="name" placeholder="Ваше имя"><input id="phone" placeholder="Телефон"><input id="when" type="datetime-local"><button class="tg-action submit" id="submit">Отправить заявку</button><div class="status" id="status"></div></section>
<div class="foot">Работает внутри Telegram · TorclixGroup</div>
</main><script>
const tg=window.Telegram?.WebApp;const initData=tg?.initData||"";const tgCart=new Map();const tgProjectId=location.pathname.split("/").pop();const tgMoney=(n,c)=>Number(n||0).toFixed(2)+" "+(c||"EUR");function tgRenderCart(){const rows=[...tgCart.values()];const box=document.getElementById("tgCart");if(!box)return;box.style.display=rows.length?"block":"none";document.getElementById("tgCartItems").innerHTML=rows.map(x=>"<div>"+String(x.name).replace(/[&<>"]/g,"")+" × "+x.quantity+" — "+tgMoney(x.price*x.quantity,x.currency)+"</div>").join("");document.getElementById("tgCartTotal").textContent=tgMoney(rows.reduce((s,x)=>s+x.price*x.quantity,0),rows[0]?.currency);};async function tgLoadCatalog(){if(!document.getElementById("tgCatalog"))return;try{const r=await fetch("/public/projects/"+tgProjectId+"/catalog");const j=await r.json();const items=(j.data||[]).filter(x=>x.status==="active");document.getElementById("tgCatalog").innerHTML=items.length?items.map(x=>"<div class='tg-module'><h4>"+String(x.name).replace(/[&<>"]/g,"")+"</h4><p>"+String(x.description||"").replace(/[&<>"]/g,"")+"</p><b>"+tgMoney(x.price,x.currency)+"</b><button class='tg-action' data-tg-add='"+x.id+"'>Добавить</button></div>").join(""):"<p>Каталог пока пуст.</p>";document.querySelectorAll("[data-tg-add]").forEach(b=>b.onclick=()=>{const item=items.find(x=>x.id===b.dataset.tgAdd);if(item){const old=tgCart.get(item.id)||{...item,quantity:0};old.quantity++;tgCart.set(item.id,old);tgRenderCart();tg?.HapticFeedback?.impactOccurred("light");}});}catch{document.getElementById("tgCatalog").innerHTML="<p>Каталог временно недоступен.</p>";}};if(tg){tg.ready();tg.expand();tg.enableClosingConfirmation?.();document.documentElement.style.setProperty("--bg",tg.themeParams?.bg_color||"#0b0d0e");document.documentElement.style.setProperty("--text",tg.themeParams?.text_color||"#f5f7f2");document.documentElement.style.setProperty("--muted",tg.themeParams?.hint_color||"#9da39e");const u=tg.initDataUnsafe?.user;if(u)document.getElementById("tgUser").textContent=(u.first_name||"")+" "+(u.last_name||"");tg.BackButton?.onClick(()=>{document.getElementById("request").classList.remove("open");tg.BackButton.hide();});}
document.querySelectorAll("[data-target]").forEach(b=>b.addEventListener("click",()=>{const target=b.dataset.target;const el=document.getElementById(target);if(!el)return;if(target==="request"){el.classList.add("open");tg?.BackButton?.show();document.getElementById("name")?.focus();}else{el.scrollIntoView({behavior:"smooth",block:"start"});}tg?.HapticFeedback?.impactOccurred("light");}));document.querySelectorAll("[data-target]").forEach(b=>b.addEventListener("click",()=>{const target=b.dataset.target;const el=document.getElementById(target);if(!el)return;if(target==="request"){el.classList.add("open");tg?.BackButton?.show();document.getElementById("name")?.focus();}else{el.scrollIntoView({behavior:"smooth",block:"start"});}tg?.HapticFeedback?.impactOccurred("light");}));
const bookingButton=document.getElementById("tgBookingSubmit");bookingButton?.addEventListener("click",async()=>{const status=document.getElementById("tgBookingStatus");const name=document.getElementById("tgBookingName").value.trim();const phone=document.getElementById("tgBookingPhone").value.trim();const when=document.getElementById("tgBookingWhen").value;if(!name||!when){status.textContent="Укажите имя и дату.";return;}status.textContent="Отправляем…";try{const r=await fetch("/public/projects/"+tgProjectId+"/bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({customerName:name,customerPhone:phone,startAt:new Date(when).toISOString(),service:"Бронирование Mini App",tg_init:initData})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Не удалось отправить");status.textContent="Бронирование принято.";tg?.HapticFeedback?.notificationOccurred("success");}catch(e){status.textContent=e.message||"Не удалось отправить";tg?.HapticFeedback?.notificationOccurred("error");}});
const profileText=document.getElementById("tgProfileText");if(profileText&&tg?.initDataUnsafe?.user){const u=tg.initDataUnsafe.user;profileText.textContent="Вы вошли как "+(u.first_name||"пользователь")+(u.username?" · @"+u.username:"")+".";}
document.getElementById("tgOrder")?.addEventListener("click",async()=>{const rows=[...tgCart.values()];const status=document.getElementById("tgOrderStatus");const customerName=document.getElementById("tgOrderName").value.trim();if(!rows.length){status.textContent="Добавьте товары";return;}if(!customerName){status.textContent="Укажите имя";return;}status.textContent="Оформляем…";try{const key=(crypto.randomUUID?.()||Date.now()+"-"+Math.random()).replace(/[^A-Za-z0-9._:-]/g,"").slice(0,64);const r=await fetch("/public/projects/"+tgProjectId+"/orders",{method:"POST",headers:{"content-type":"application/json","idempotency-key":key},body:JSON.stringify({customerName,items:rows.map(x=>({catalogItemId:x.id,quantity:x.quantity})),source:initData?"telegram_mini_app":"website",initData})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Не удалось оформить");status.textContent="Заказ принят: "+j.data.id;tgCart.clear();tgRenderCart();tg?.HapticFeedback?.notificationOccurred("success");}catch(e){status.textContent=e.message||"Не удалось оформить заказ";}});tgRenderCart();tgLoadCatalog();document.getElementById("submit").addEventListener("click",async()=>{const status=document.getElementById("status");const name=document.getElementById("name").value.trim();const phone=document.getElementById("phone").value.trim();const when=document.getElementById("when").value;if(!name){status.textContent="Укажите имя";return;}if(!when){status.textContent="Выберите дату и время";return;}status.textContent="Отправляем…";try{const r=await fetch("/public/projects/"+location.pathname.split("/").pop()+"/bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({customerName:name,customerPhone:phone,startAt:new Date(when).toISOString(),service:"Заявка из Telegram",tg_init:initData})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Не удалось отправить");status.textContent="Готово. Заявка отправлена.";tg?.HapticFeedback?.notificationOccurred("success");tg?.MainButton?.hide();}catch(e){status.textContent="Не удалось отправить заявку. Попробуйте ещё раз.";tg?.HapticFeedback?.notificationOccurred("error");}});
</script></body></html>`);
      return;
    }
    if(path==="/api/telegram/integrations"&&req.method==="GET"){
      const auth=await requirePermission(req,res,"projects:read");if(!auth)return;
      json(res,200,{data:await listTelegramIntegrations(auth.organization.id)});return;
    }
    const telegramIntegration=path.match(/^\/api\/telegram\/integrations\/([^/]+)$/);
    if(telegramIntegration&&req.method==="GET"){
      const auth=await requirePermission(req,res,"projects:read");if(!auth)return;
      const projectId=telegramIntegration[1];
      const project=projects.get(projectId);
      const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);
      if(!owned){json(res,404,{error:"Project not found"});return;}
      json(res,200,{data:await getTelegramIntegration(auth.organization.id,projectId)});return;
    }
    if(path==="/api/telegram/bot"&&req.method==="GET"){
      if(!process.env.TELEGRAM_BOT_TOKEN){json(res,200,{data:{enabled:false,botUrl:null,botUsername:null}});return;}
      try{
        const bot=await telegramApi("getMe",{},process.env.TELEGRAM_BOT_TOKEN);
        json(res,200,{data:{enabled:true,botUrl:bot?.username?"https://t.me/"+bot.username:null,botUsername:bot?.username||null}});
      }catch(error){json(res,502,{error:"Telegram bot is unavailable"});}
      return;
    }
    if(path==="/api/telegram/status"&&req.method==="GET"){
      const enabled=!!process.env.TELEGRAM_BOT_TOKEN;
      const projectId=new URL(req.url||"/","http://localhost").searchParams.get("projectId");
      let integration=null;
      if(projectId){
        const auth=await requirePermission(req,res,"projects:read");if(!auth)return;
        integration=await getTelegramIntegration(auth.organization.id,projectId);
      }
      json(res,200,{data:{enabled,configured:!!integration,miniAppUrl:integration?.projectId?telegramMiniAppUrl(integration.projectId):null,botUrl:integration?.botUsername?"https://t.me/"+integration.botUsername:null,projectBotUrl:integration?.botUsername&&integration?.projectId?"https://t.me/"+integration.botUsername+"?start="+encodeURIComponent(integration.projectId):null,botUsername:integration?.botUsername||null,requiresProject:true}});
      return;
    }
    if(path==="/api/telegram/configure"&&req.method==="POST"){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      try{
        const input=await body(req);
        const projectId=String(input.projectId||"").trim();
        if(!projectId){json(res,400,{error:"projectId is required"});return;}
        const project=projects.get(projectId);
        const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);
        if(!owned){json(res,404,{error:"Project not found"});return;}
        const result=await configureTelegramBot(projectId);
        if(!result.enabled){json(res,409,{error:"TELEGRAM_BOT_TOKEN is not configured"});return;}
        const integration={id:newId(),organizationId:auth.organization.id,projectId,botId:result.id,botUsername:result.username,enabled:true,webhookUrl:(process.env.PUBLIC_URL||"").replace(/\/$/,"")+"/tg/webhook"};
        await saveTelegramIntegration(integration);
        json(res,200,{data:{...result,projectId,miniAppUrl:telegramMiniAppUrl(projectId),integration}});

      }catch(error){json(res,502,{error:error instanceof Error?error.message:"Telegram setup failed"});}
      return;
    }
    if(path==="/api/telegram/validate"&&req.method==="POST"){
      const input=await body(req);
      const user=verifyTelegramInitData(String(input.initData||""),process.env.TELEGRAM_BOT_TOKEN||"");
      if(!user){json(res,401,{error:"Telegram авторизация недействительна"});return;}
      json(res,200,{data:{authenticated:true,user}});
      return;
    }
    if(path==="/tg/webhook"&&req.method==="POST"){
      const expected=process.env.TELEGRAM_WEBHOOK_SECRET||"";
      const provided=String(req.headers["x-telegram-bot-api-secret-token"]||"");
      if(!expected||!provided){res.writeHead(403);res.end();return;}
       const a=Buffer.from(expected),b=Buffer.from(provided);
       if(a.length!==b.length||!crypto.timingSafeEqual(a,b)){res.writeHead(403);res.end();return;}
      const update=await body(req);
      const chatId=update?.message?.chat?.id;
      const textValue=String(update?.message?.text||"");
      if(chatId&&textValue.startsWith("/start")){
        const arg=textValue.replace(/^\/start\s*/,"").trim();
        const requestedProjectId=arg||"";
        const resolvedProjectId=requestedProjectId?resolvePublicProjectId(requestedProjectId):"";
        const project=requestedProjectId?await getPublicProject(resolvedProjectId):null;
        if(project){
          const url=telegramMiniAppUrl(project.id);
          await telegramApi("sendMessage",{chat_id:chatId,text:"Откройте мини‑приложение "+project.name+" прямо в Telegram.",reply_markup:{inline_keyboard:[[{text:"Открыть Mini App",web_app:{url}}]]}});
        }else{
          await telegramApi("sendMessage",{chat_id:chatId,text:"Добро пожаловать в TorclixGroup! Для запуска клиентского сервиса откройте ссылку проекта из Studio."});
        }
      }else if(chatId&&textValue==="/help"){
        await telegramApi("sendMessage",{chat_id:chatId,text:"Используйте ссылку проекта или кнопку «Открыть Mini App», чтобы открыть сервис прямо в Telegram."});
      }
      json(res,200,{ok:true});return;
    }
    const host=(req.headers.host||"").split(":")[0].toLowerCase();
    if(host&&host!=="localhost"&&host!=="127.0.0.1"&&!host.endsWith(".localhost")&&!host.endsWith(".local")){
      const domain=await findDomain(host);
      if(domain?.projectId){
        const project=await getPublishedProject(domain.projectId);
        const document=project?await getPublishedDocument(project.id):null;
        if(project&&document){html(res,200,renderPreview(project,document));return;}
      }
    }
    if(path==="/api/domains"&&req.method==="GET"){
      const auth=await requirePermission(req,res,"domains:read");if(!auth)return;
      json(res,200,{data:await listDomains(auth.organization.id)});return;
    }
    if(path==="/api/domains"&&req.method==="POST"){
      const auth=await requirePermission(req,res,"domains:write");if(!auth)return;
      const input=await body(req);
      const projectId=input.projectId?String(input.projectId):null;
      if(projectId){
        const project=projects.get(projectId);
        const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);
        if(!owned){json(res,404,{error:"Project not found"});return;}
      }
      const hostname=String(input.hostname||"").trim().toLowerCase();
      if(!hostname||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(hostname)){
        json(res,400,{error:"Valid hostname is required"});return;
      }
      const domain={id:newId(),organizationId:auth.organization.id,projectId,hostname,status:"pending",sslStatus:"pending",verificationToken:"torclix-"+newId().replace(/-/g,"")};
      await saveDomain(domain);
      json(res,201,{data:{...domain,verification:{type:"dns_txt",name:"_torclix."+hostname,value:domain.verificationToken}}});return;
    }
    const domainVerify=path.match(/^\/api\/domains\/([^/]+)\/verify$/);
    if(domainVerify&&req.method==="POST"){
      const auth=await requirePermission(req,res,"domains:write");if(!auth)return;
      const existing=(await listDomains(auth.organization.id)).find(d=>d.id===domainVerify[1]);
      if(!existing){json(res,404,{error:"Domain not found"});return;}
      if(existing.status==="verified"||existing.status==="active"){json(res,200,{data:{...existing,verified:true}});return;}
      const expected=existing.verificationToken;
      if(!expected){json(res,409,{error:"Domain verification is not configured for this record"});return;}
      let records=[];
      try{records=await lookup("_torclix."+existing.hostname,"TXT");}catch{records=[];}
      const values=records.flatMap(r=>Array.isArray(r)?r:[String(r)]);
      if(!values.includes(expected)){json(res,409,{error:"DNS verification record not found",verification:{type:"dns_txt",name:"_torclix."+existing.hostname,value:expected}});return;}
      const verified=await verifyDomain(existing.id,auth.organization.id);
      json(res,200,{data:{...verified,verified:true,ssl:{status:"pending",next:"SSL automation"}}});return;
    }
    const preview=path.match(/^\/preview\/([^/]+)$/);
    if(preview&&req.method==="GET"){const auth=await requirePermission(req,res,"projects:read");if(!auth)return;const memory=projects.get(preview[1]);const project=memory?.organizationId===auth.organization.id?memory:await getProject(preview[1],auth.organization.id);if(!project){html(res,404,"<h1>Project not found</h1>");return;}const doc=await getDocument(project.id,auth.organization.id,()=>defaultDocument(project.id));html(res,200,renderPreview(project,doc));return;}
    const publicHealth=path.match(/^\/public\/projects\/([^/]+)\/health$/);
    if(publicHealth&&req.method==="GET"){
      const project=await getPublicProject(resolvePublicProjectId(publicHealth[1]));
      if(!project){json(res,404,{error:"Опубликованный проект не найден"});return;}
      const document=await getPublishedDocument(project.id);
      json(res,200,{data:{projectId:project.id,name:project.name,status:project.status,version:document?.version||null,published:!!document}});
      return;
    }
    const publicEvent=path.match(/^\/public\/projects\/([^/]+)\/events$/);
    if(publicEvent&&req.method==="POST"){
      const resolvedProjectId=resolvePublicProjectId(publicEvent[1]);
      const project=await getPublicProject(resolvedProjectId);
      if(!project){json(res,404,{error:"Опубликованный проект не найден"});return;}
      const saved=await recordEvent(project.organizationId,resolvedProjectId,await body(req));
      if(!saved){json(res,400,{error:"Invalid event"});return;}
      json(res,202,{ok:true});return;
    }
    const publicCatalog=path.match(/^\/public\/projects\/([^/]+)\/catalog$/);
    if(publicCatalog&&req.method==="GET"){
      const requestedProjectId=publicCatalog[1];
      const resolvedProjectId=resolvePublicProjectId(requestedProjectId);
      const project=await getPublicProject(resolvedProjectId);
      if(!project){json(res,404,{error:"Опубликованный проект не найден"});return;}
      json(res,200,{data:await listCatalogItems(catalogItems,project.organizationId,resolvedProjectId)});return;
    }
    const publicLead=path.match(/^\/public\/projects\/([^/]+)\/leads$/);
    if(publicLead&&req.method==="POST"){
      const projectId=publicLead[1];
      const resolvedProjectId=resolvePublicProjectId(projectId);
      const project=await getPublicProject(resolvedProjectId);
      const document=project?(await getPublishedDocument(project.id)||(!process.env.DATABASE_URL&&isDemoProject(project.id)?defaultDocument(project.id):null)):null;
      if(!project||!document){json(res,404,{error:"Опубликованный проект не найден"});return;}
      const input=await body(req);
      if(!input.name){json(res,400,{error:"name is required"});return;}
      const organization=await getOrganizationById(project.organizationId);
      const plan=plans[organization?.plan]||plans.starter;
      const currentLeads=await listRecords("leads",leads,project.organizationId);
      if(currentLeads.length>=plan.leads){
        json(res,429,{error:"LEAD_LIMIT_REACHED",message:`Лимит заявок тарифа ${organization?.plan||"starter"} достигнут`,limit:plan.leads,usage:currentLeads.length});
        return;
      }
      const source=String(input.source||"published_site");
      let telegramUser=null;
      if(source==="telegram_mini_app"){
        telegramUser=verifyTelegramInitData(String(input.initData||input.tg_init||""),process.env.TELEGRAM_BOT_TOKEN||"");
        if(!telegramUser){json(res,401,{error:"Telegram авторизация недействительна"});return;}
      }
      const idem=requestKey(req);
       const cacheKey=idem?project.id+":lead:"+idem:null;
       const cached=cacheKey?idempotencyCache.get(cacheKey):null;
       if(cached){json(res,cached.status,cached.body);return;}
       const lead={id:newId(),organizationId:project.organizationId,projectId:project.id,name:String(input.name),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source,status:"new",telegramUserId:telegramUser?.id,telegramUsername:telegramUser?.username,createdAt:new Date().toISOString()};
      await saveRecord("leads",lead);if(!process.env.DATABASE_URL)leads.set(lead.id,lead);
      if(telegramUser?.id)await notifyTelegramUser(telegramUser.id,"Заявка принята: "+project.name+". Мы получили ваше обращение.");
      await notifyTelegramAdmin("Новая заявка · "+project.name+"\n"+lead.name+(lead.phone?" · "+lead.phone:""));
      const response={data:{id:lead.id,received:true}};if(cacheKey)idempotencyCache.set(cacheKey,{status:201,body:response});json(res,201,response);return;
    }
    const publicBooking=path.match(/^\/public\/projects\/([^/]+)\/bookings$/);
    if(publicBooking&&req.method==="POST"){
      const requestedProjectId=publicBooking[1];
      const resolvedProjectId=resolvePublicProjectId(requestedProjectId);
      const project=await getPublicProject(resolvedProjectId);
      const document=project?(await getPublishedDocument(project.id)||(!process.env.DATABASE_URL&&isDemoProject(project.id)?defaultDocument(project.id):null)):null;
      if(!project||!document){json(res,404,{error:"Опубликованный проект не найден"});return;}
      const input=await body(req);
      if(!input.customerName||!input.startAt){json(res,400,{error:"customerName and startAt are required"});return;}
      const tgUser=input.tg_init?verifyTelegramInitData(String(input.tg_init),process.env.TELEGRAM_BOT_TOKEN||""):null;
      if(input.tg_init&&!tgUser){json(res,401,{error:"Telegram авторизация недействительна"});return;}
      const idem=requestKey(req);const cacheKey=idem?project.id+":booking:"+idem:null;const cached=cacheKey?idempotencyCache.get(cacheKey):null;if(cached){json(res,cached.status,cached.body);return;}
      const parsedStart=new Date(String(input.startAt));if(Number.isNaN(parsedStart.getTime())){json(res,400,{error:"Invalid startAt"});return;}
      const booking={id:newId(),organizationId:project.organizationId,projectId:project.id,customerName:String(input.customerName),customerEmail:input.customerEmail?String(input.customerEmail):undefined,customerPhone:input.customerPhone?String(input.customerPhone):undefined,startAt:parsedStart.toISOString(),service:input.service?String(input.service):undefined,telegramUserId:tgUser?.id,telegramUsername:tgUser?.username,status:"pending",createdAt:new Date().toISOString()};
      await saveRecord("bookings",booking);if(!process.env.DATABASE_URL)bookings.set(booking.id,booking);
      if(tgUser?.id)await notifyTelegramUser(tgUser.id,"Бронирование принято: "+project.name+". Дата: "+parsedStart.toLocaleString("ru-RU")+"." );
      await notifyTelegramAdmin("Новое бронирование · "+project.name+"\n"+booking.customerName+" · "+parsedStart.toLocaleString("ru-RU"));
      const response={data:{id:booking.id,received:true,status:booking.status}};if(cacheKey)idempotencyCache.set(cacheKey,{status:201,body:response});json(res,201,response);return;
    }
        if(path==="/api/telegram/me"&&req.method==="POST"){
      const input=await body(req);const user=verifyTelegramInitData(String(input.initData||""),process.env.TELEGRAM_BOT_TOKEN||"");
      if(!user){json(res,401,{error:"Telegram авторизация недействительна"});return;}
      json(res,200,{data:{user}});return;
    }
const leadId=path.match(/^\/api\/leads\/([^/]+)$/);
    if(leadId&&(req.method==="PATCH"||req.method==="PUT")){
      const auth=await requirePermission(req,res,"leads:write");if(!auth)return;
      const current=(await listRecords("leads",leads,auth.organization.id)).find(x=>x.id===leadId[1]);
      if(!current){json(res,404,{error:"Lead not found"});return;}
      const input=await body(req);
      const next={...current,status:input.status?String(input.status):current.status,name:input.name?String(input.name):current.name,email:input.email?String(input.email):current.email,phone:input.phone?String(input.phone):current.phone};
      await saveRecord("leads",next);if(!process.env.DATABASE_URL)leads.set(next.id,next);json(res,200,{data:next});return;
    }
    const bookingId=path.match(/^\/api\/bookings\/([^/]+)$/);
    if(bookingId&&(req.method==="PATCH"||req.method==="PUT")){
      const auth=await requirePermission(req,res,"bookings:write");if(!auth)return;
      const current=(await listRecords("bookings",bookings,auth.organization.id)).find(x=>x.id===bookingId[1]);
      if(!current){json(res,404,{error:"Booking not found"});return;}
      const input=await body(req);
      const next={...current,status:input.status?String(input.status):current.status,startAt:input.startAt?String(input.startAt):current.startAt,service:input.service?String(input.service):current.service};
      await saveRecord("bookings",next);if(!process.env.DATABASE_URL)bookings.set(next.id,next);json(res,200,{data:next});return;
    }
    const client360=path.match(/^\/api\/clients\/([^/]+)\/360$/);
    if(client360&&req.method==="GET"){
      const auth=await requirePermission(req,res,"clients:read");if(!auth)return;
      const clientRows=await listRecords("clients",clients,auth.organization.id);
      const client=clientRows.find(x=>x.id===client360[1]);
      if(!client){json(res,404,{error:"Client not found"});return;}
      const [projectRows,leadRows,bookingRows]=await Promise.all([
        listProjects(projects,auth.organization.id),
        listRecords("leads",leads,auth.organization.id),
        listRecords("bookings",bookings,auth.organization.id)
      ]);
      const linkedProjects=projectRows.filter(p=>p.clientId===client.id);
      const linkedLeads=client.telegramUserId?leadRows.filter(x=>String(x.telegramUserId||"")===String(client.telegramUserId)):[];
      const linkedBookings=client.telegramUserId?bookingRows.filter(x=>String(x.telegramUserId||"")===String(client.telegramUserId)):[];
      json(res,200,{data:{client,projects:linkedProjects,leads:linkedLeads,bookings:linkedBookings,summary:{projects:linkedProjects.length,leads:linkedLeads.length,bookings:linkedBookings.length}}});
      return;
    }
    if(path==="/api/clients"&&req.method==="GET"){const auth=await requirePermission(req,res,"clients:read");if(!auth)return;json(res,200,{data:await listRecords("clients",clients,auth.organization.id)});return;}
    if(path==="/api/clients"&&req.method==="POST"){const auth=await requirePermission(req,res,"clients:write");if(!auth)return;const input=await body(req);const client={id:newId(),organizationId:auth.organization.id,name:String(input.name||"New client"),email:input.email?String(input.email):undefined};await saveRecord("clients",client);if(!process.env.DATABASE_URL)clients.set(client.id,client);json(res,201,{data:client});return;}
    if(path==="/api/leads"&&req.method==="GET"){const auth=await requirePermission(req,res,"leads:read");if(!auth)return;json(res,200,{data:await listRecords("leads",leads,auth.organization.id)});return;}
    if(path==="/api/leads"&&req.method==="POST"){const auth=await requirePermission(req,res,"leads:write");if(!auth)return;const input=await body(req);const projectId=String(input.projectId||"").trim();const project=projects.get(projectId);const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);if(!owned){json(res,400,{error:"A valid projectId is required"});return;}const lead={id:newId(),organizationId:auth.organization.id,projectId,name:String(input.name||"Anonymous"),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source:String(input.source||"website"),status:"new",createdAt:new Date().toISOString()};await saveRecord("leads",lead);if(!process.env.DATABASE_URL)leads.set(lead.id,lead);json(res,201,{data:lead});return;}
    if(path==="/api/bookings"&&req.method==="GET"){const auth=await requirePermission(req,res,"bookings:read");if(!auth)return;json(res,200,{data:await listRecords("bookings",bookings,auth.organization.id)});return;}
    if(path==="/api/bookings"&&req.method==="POST"){const auth=await requirePermission(req,res,"bookings:write");if(!auth)return;const input=await body(req);if(!input.startAt){json(res,400,{error:"startAt is required"});return;}const projectId=String(input.projectId||"").trim();const project=projects.get(projectId);const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);if(!owned){json(res,400,{error:"A valid projectId is required"});return;}const booking={id:newId(),organizationId:auth.organization.id,projectId,customerName:String(input.customerName||"Guest"),customerEmail:input.customerEmail?String(input.customerEmail):undefined,startAt:String(input.startAt),service:input.service?String(input.service):undefined,status:"pending",createdAt:new Date().toISOString()};await saveRecord("bookings",booking);if(!process.env.DATABASE_URL)bookings.set(booking.id,booking);json(res,201,{data:booking});return;}
    if(path==="/api/invoices"&&req.method==="GET"){const auth=await requirePermission(req,res,"billing:read");if(!auth)return;json(res,200,{data:await listInvoices(auth.organization.id)});return;}
    if(path==="/api/invoices"&&req.method==="POST"){const auth=await requirePermission(req,res,"billing:write");if(!auth)return;const input=await body(req);if(input.projectId){const owned=projects.get(String(input.projectId))?.organizationId===auth.organization.id||await getProject(String(input.projectId),auth.organization.id);if(!owned){json(res,404,{error:"Project not found"});return;}}if(input.clientId){const clientRows=await listRecords("clients",clients,auth.organization.id);if(!clientRows.some(x=>String(x.id)===String(input.clientId))){json(res,404,{error:"Client not found"});return;}}const invoice=await createInvoice(input,auth.organization.id);await recordAudit(auth,"invoice.create","invoice",invoice.id,{number:invoice.number,total:invoice.total});json(res,201,{data:invoice});return;}
    const invoiceId=path.match(/^\/api\/invoices\/([^/]+)$/);
    if(invoiceId&&req.method==="PATCH"){const auth=await requirePermission(req,res,"billing:write");if(!auth)return;const input=await body(req);const allowed=new Set(["draft","sent","paid","void","overdue"]);const status=String(input.status||"");if(!allowed.has(status)){json(res,400,{error:"Invalid invoice status"});return;}const invoice=await updateInvoiceStatus(invoiceId[1],auth.organization.id,status);if(!invoice){json(res,404,{error:"Invoice not found"});return;}json(res,200,{data:invoice});return;}
    if(path==="/api/templates"&&req.method==="GET"){json(res,200,{data:["restaurant-noir","beauty-atelier","fitness-forma","medical-northline","real-estate-north","services-studio"]});return;}
    json(res,404,{error:"Not found"});
  }catch(error){console.error(error);json(res,Number(error?.status)||500,{error:Number(error?.status)===400?"Invalid JSON body":Number(error?.status)===413?"Request body too large":"Internal server error"});}
});

await initStorage();
if(process.env.TELEGRAM_BOT_TOKEN){
  try{
    const demoOrg="00000000-0000-4000-8000-000000000001";
    const existing=await listTelegramIntegrations(demoOrg);
    if(!existing?.length){
      const demoProject=await getPublishedProject(legacyProjectIds.p1);
      if(demoProject){
        const result=await configureTelegramBot(demoProject.id);
        if(result.enabled)await saveTelegramIntegration({id:newId(),organizationId:demoOrg,projectId:demoProject.id,botId:result.id,botUsername:result.username,enabled:true,webhookUrl:(process.env.PUBLIC_URL||"").replace(/\/$/,"")+"/tg/webhook"});
      }
    }
  }catch(error){console.warn("Telegram auto-configuration skipped:",error?.message||error);}
}
server.listen(port,"0.0.0.0",()=>{console.log("Torclix API listening on :"+port);if(process.env.TELEGRAM_BOT_TOKEN)console.log("Telegram bot runtime enabled.");});
