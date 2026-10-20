import crypto from "node:crypto";
import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import {
  initStorage,listProjects,getProject,getPublishedProject,saveProject,getDocument,getPublishedDocument,saveDocument,publishDocument,unpublishDocument,listDomains,saveDomain,listRecords,saveRecord,
  newId,getSessionUser,listOrganizationsForUser,getMembershipRole,listTeamMembers,findDomain,verifyDomain,getTelegramIntegration,listTelegramIntegrations,saveTelegramIntegration,listCatalogItems,getCatalogItem,saveCatalogItem,archiveCatalogItem,listOrders,saveOrder,updateOrderStatus
} from "./storage.mjs";
import { can } from "../../../packages/access/src/index.mjs";
import { authenticateRequest } from "../../../packages/auth/src/index.mjs";
import { billingSnapshot } from "./billing.mjs";
import { configureTelegramBot, telegramApi, telegramMiniAppUrl, verifyTelegramInitData } from "./telegram.mjs";

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


function headers(extra={}){return {
  "content-type":"application/json; charset=utf-8",
  ...(process.env.CORS_ORIGIN?{"access-control-allow-origin":process.env.CORS_ORIGIN}:{}),
  "vary":"Origin",
  "access-control-allow-methods":"GET,POST,PUT,PATCH,OPTIONS",
  "access-control-allow-headers":"content-type,authorization,x-torclix-user,x-torclix-organization,x-torclix-trial,idempotency-key,x-telegram-bot-api-secret-token",
  ...extra
};}
function json(res,status,data){res.writeHead(status,headers());res.end(JSON.stringify(data));}
function html(res,status,body){res.writeHead(status,{"content-type":"text/html; charset=utf-8"});res.end(body);}
async function body(req){let raw="";for await(const chunk of req){raw+=chunk;if(raw.length>1024*1024) throw new Error("Request body too large");}return raw?JSON.parse(raw):{};}
function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function defaultDocument(projectId){return {projectId,activePage:"home",accent:"#d8ff3e",miniApp:{modules:["home","catalog","booking","profile","notifications"],navigation:["home","catalog","booking","profile","notifications"],theme:{accent:"#d8ff3e",mode:"dark"}},pages:[{id:"home",name:"Главная",blocks:[
  {id:"b1",type:"Hero",title:"Ваш бизнес — в одном цифровом пространстве",body:"Сайт, заявки, записи и мини‑приложение Telegram управляются из одной студии TorclixGroup."},
  {id:"b2",type:"Features",title:"Всё необходимое вашим клиентам",body:"Услуги, каталог, бронирование, заявки и клиентский путь — в одном удобном интерфейсе."},
  {id:"b3",type:"CTA",title:"Готовы начать?",body:"Оставьте заявку или откройте мини‑приложение прямо в Telegram."}
]}]};}
function renderPreview(project,doc){
  const page=doc.pages.find(p=>p.id===doc.activePage)||doc.pages[0];
  const blocks=(page?.blocks||[]).map((b,i)=>`<section style="padding:72px 8vw;border-top:1px solid #222"><small style="opacity:.55">0${i+1} · ${esc(b.type==="Hero"?"Главный экран":b.type==="Features"?"Возможности":b.type==="CTA"?"Действие":b.type)}</small><h2 style="font-size:clamp(40px,7vw,92px);line-height:.95;margin:16px 0">${esc(b.title)}</h2><p style="max-width:640px;font-size:20px;line-height:1.6;opacity:.7">${esc(b.body)}</p><button style="margin-top:20px;padding:13px 20px;border:0;border-radius:999px;background:${esc(doc.accent)}">Подробнее →</button></section>`).join("");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} — TorclixGroup</title></head><body style="margin:0;background:#080808;color:#f5f5f0;font-family:Inter,Arial,sans-serif"><header style="padding:28px 8vw;display:flex;justify-content:space-between;border-bottom:1px solid #222"><strong>TORCLIXGROUP</strong><span>Студия цифровых сервисов</span></header><main>${blocks}</main><footer style="padding:48px 8vw;opacity:.45">Создано и опубликовано в TorclixGroup · Все права защищены</footer></body></html>`;
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

const server=createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){json(res,204,{});return;}
  const {pathname:path}=new URL(req.url||"/","http://localhost");
  try{
    if(req.method==="POST" && (path.startsWith("/public/projects/")||path==="/tg/webhook")){
      const ip=String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"unknown").split(",")[0].trim();
      const limit=path==="/tg/webhook"?120:20;
      if(!rateLimit(path+":"+ip,limit,60000)){json(res,429,{error:"Слишком много запросов. Попробуйте позже."});return;}
    }
    if(path==="/health"){json(res,200,{ok:true,service:"torclix-api",version:"0.7.0",storage:process.env.DATABASE_URL?"postgres":"memory",auth:process.env.NODE_ENV==="production"?"external-provider-required":(process.env.TORCLIX_DEV_AUTH==="true"?"development-session":"development-auth-disabled")});return;}
    if(path==="/api/session"&&req.method==="GET"){const auth=await requireSession(req,res);if(!auth)return;json(res,200,{data:{user:auth.user,organization:auth.organization,organizations:auth.organizations}});return;}
    if(path==="/api/team"&&req.method==="GET"){const auth=await requirePermission(req,res,"team:read");if(!auth)return;json(res,200,{data:await listTeamMembers(auth.organization.id)});return;}
    if(path==="/api/billing"&&req.method==="GET"){const auth=await requirePermission(req,res,"billing:read");if(!auth)return;const p=await listProjects(projects,auth.organization.id);const leadRecords=await listRecords("leads",leads,auth.organization.id);json(res,200,{data:billingSnapshot(auth.organization,{projects:p.length,members:(await listTeamMembers(auth.organization.id)).length,leads:leadRecords.length})});return;}
    if(path.startsWith("/public/projects/")&&path.endsWith("/catalog")&&req.method==="GET"){
      const match=path.match(/^\/public\/projects\/([^/]+)\/catalog$/);const projectId=match?.[1];
      const project=projects.get(projectId)||await getPublishedProject(projectId);
      if(!project){json(res,404,{error:"Project not found"});return;}
      json(res,200,{data:await listCatalogItems(catalogItems,project.organizationId,projectId)});return;
    }
    if(path.startsWith("/public/projects/")&&path.endsWith("/orders")&&req.method==="POST"){
      const match=path.match(/^\/public\/projects\/([^/]+)\/orders$/);const projectId=match?.[1];
      const project=projects.get(projectId)||await getPublishedProject(projectId);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const idem=requestKey(req);const cacheKey=idem?"public-order:"+projectId+":"+idem:null;const cached=cacheKey?idempotencyCache.get(cacheKey):null;if(cached){json(res,cached.status,cached.body);return;}
      const input=await body(req);const customerName=String(input.customerName||"").trim();
      if(!customerName){json(res,400,{error:"customerName is required"});return;}
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
      const order={id:newId(),organizationId:project.organizationId,projectId,customerName,customerEmail:input.customerEmail?String(input.customerEmail).trim():null,customerPhone:input.customerPhone?String(input.customerPhone).trim():null,status:"pending",currency,total,source:String(input.source||"website")};
      const saved=await saveOrder(order,items);if(!process.env.DATABASE_URL)orders.set(order.id,saved);
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
      const auth=await requirePermission(req,res,"billing:read");if(!auth)return;
      const input=await body(req);const status=String(input.status||"");
      if(!["pending","paid","processing","completed","cancelled","refunded"].includes(status)){json(res,400,{error:"Invalid order status"});return;}
      const updated=await updateOrderStatus(orderId[1],auth.organization.id,status);
      if(!updated){const local=orders.get(orderId[1]);if(!local||local.organizationId!==auth.organization.id){json(res,404,{error:"Order not found"});return;}local.status=status;json(res,200,{data:local});return;}
      json(res,200,{data:updated});return;
    }

    if(path==="/api/projects"&&req.method==="GET"){const auth=await requirePermission(req,res,"projects:read");if(!auth)return;json(res,200,{data:await listProjects(projects,auth.organization.id)});return;}
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
      json(res,200,{data:{projects:{total:projectRows.length,live:liveProjects,draft:draftProjects},leads:{total:leadRows.length,status:leadStatus},bookings:{total:bookingRows.length,status:bookingStatus},clients:{total:clientRows.length},byProject,generatedAt:new Date().toISOString()}});
      return;
    }

    if(path==="/api/projects"&&req.method==="POST"){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      const input=await body(req);const name=String(input.name||"Untitled project");
      const type=String(input.type||"website");
      if(!["website","mini_app","website_mini_app"].includes(type)){json(res,400,{error:"Unsupported project type"});return;}
      const industry=String(input.industry||"services").toLowerCase().trim().replace(/\s+/g,"_");
      const slug=String(input.slug||name).toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"untitled";
      const project={id:newId(),name,type,industry,status:"draft",organizationId:auth.organization.id,slug};
      await saveProject(project);if(!process.env.DATABASE_URL)projects.set(project.id,project);await saveDocument(project.id,project.organizationId,defaultDocument(project.id));json(res,201,{data:project});return;
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
    const miniApp=path.match(/^\/miniapp\/([^/]+)$/);
    if(miniApp&&req.method==="GET"){
      const requestedProjectId=miniApp[1];
      const projectId=resolvePublicProjectId(requestedProjectId);
      const demoProject=projects.get(requestedProjectId)||null;
      const project=(!process.env.DATABASE_URL)
        ? demoProject
        : await getPublishedProject(projectId) || (demoProject ? {...demoProject,status:"active"} : null);
      if(!project){html(res,404,"<h1>Мини‑приложение не найдено</h1>");return;}
      const document=await getPublishedDocument(project.id) || defaultDocument(project.id);
      if(!document){html(res,404,"<h1>Мини‑приложение ещё не опубликовано</h1>");return;}
      const page=document.pages?.find(p=>p.id===document.activePage)||document.pages?.[0];
      const modules=Array.isArray(document.miniApp?.modules)&&document.miniApp.modules.length?document.miniApp.modules:["home","profile","notifications"];
      const moduleLabels={home:"Главная",catalog:"Каталог",booking:"Бронирование",calendar:"Календарь",cart:"Корзина и заказ",membership:"Абонементы",loyalty:"Лояльность",profile:"Профиль",notifications:"Уведомления",telegram:"Telegram"};
      const moduleNav=modules.map(id=>"<a href=\"#module-"+esc(id)+"\">"+esc(moduleLabels[id]||id)+"</a>").join("");
      const moduleCards=modules.filter(id=>id!=="home").map(id=>"<section id=\"module-"+esc(id)+"\" class=\"tg-module\"><div class=\"eyebrow\">"+esc(moduleLabels[id]||id)+"</div><h3>"+esc(moduleLabels[id]||id)+"</h3><p>Модуль подключён в TorclixGroup. Здесь клиент сможет пользоваться этой функцией вашего сервиса.</p></section>").join("");
      const blocks=(page?.blocks||[]).map((b,i)=>'<article class="tg-block"><small>0'+(i+1)+' · '+esc(b.type==="Hero"?"Главный экран":b.type==="Features"?"Возможности":b.type==="CTA"?"Действие":b.type)+'</small><h2>'+esc(b.title)+'</h2><p>'+esc(b.body)+'</p><button class="tg-action" data-action="open">Открыть</button></article>').join("");
      const accent=esc(document.accent||"#d8ff3e");
      const projectName=esc(project.name);
      html(res,200,`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="color-scheme" content="dark light"><script src="https://telegram.org/js/telegram-web-app.js"></script><title>${projectName}</title><style>
:root{--accent:${accent};--bg:#0b0d0e;--card:#151819;--text:#f5f7f2;--muted:#9da39e;--line:#262a2b}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100vh}main{max-width:620px;margin:auto;padding:calc(18px + env(safe-area-inset-top)) 18px calc(48px + env(safe-area-inset-bottom))}.brand{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 0 24px}.brand-mark{font-weight:900;letter-spacing:.08em}.tg-user{font-size:13px;color:var(--muted);text-align:right}.hero{padding:20px 0 28px}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:800}.hero h1{font-size:clamp(38px,11vw,64px);line-height:.94;margin:12px 0}.tg-nav{display:flex;gap:8px;overflow:auto;padding:4px 0 18px}.tg-nav a{white-space:nowrap;color:var(--text);text-decoration:none;border:1px solid var(--line);padding:9px 12px;border-radius:999px;font-size:13px}.tg-module{padding:22px 0;border-top:1px solid var(--line)}.tg-module h3{font-size:28px;margin:8px 0}.tg-module p{color:var(--muted);line-height:1.5}.hero p{font-size:17px;line-height:1.55;color:var(--muted);margin:0}.tg-block{padding:22px 0;border-top:1px solid var(--line)}.tg-block small{color:var(--muted)}.tg-block h2{font-size:27px;line-height:1.05;margin:9px 0}.tg-block p{line-height:1.55;color:var(--muted)}button{font:inherit}.tg-action{width:100%;border:0;border-radius:14px;padding:14px 16px;background:var(--accent);color:#0a0b0b;font-weight:800;margin-top:8px}.request{display:none;border:1px solid var(--line);background:var(--card);border-radius:18px;padding:16px;margin-top:16px}.request.open{display:block}.request input{width:100%;padding:13px 12px;margin:6px 0;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--text);outline:none}.request .submit{margin-top:8px}.status{min-height:20px;color:var(--muted);font-size:13px;margin-top:10px}.foot{color:var(--muted);font-size:12px;text-align:center;padding-top:28px}</style></head><body><main>
<header class="brand"><div class="brand-mark">TORCLIXGROUP</div><div class="tg-user" id="tgUser">Telegram</div></header>
<section class="hero"><div class="eyebrow">Мини‑приложение</div><h1>${projectName}</h1><p>${esc(page?.blocks?.[0]?.body||"Ваш сервис всегда под рукой.")}</p></section>
<nav class="tg-nav">${moduleNav}</nav><section>${blocks}</section>${moduleCards}<section class="request" id="request"><strong>Оставить заявку</strong><input id="name" placeholder="Ваше имя"><input id="phone" placeholder="Телефон"><input id="when" type="datetime-local"><button class="tg-action submit" id="submit">Отправить заявку</button><div class="status" id="status"></div></section>
<div class="foot">Работает внутри Telegram · TorclixGroup</div>
</main><script>
const tg=window.Telegram?.WebApp;const initData=tg?.initData||"";if(tg){tg.ready();tg.expand();tg.enableClosingConfirmation?.();document.documentElement.style.setProperty("--bg",tg.themeParams?.bg_color||"#0b0d0e");document.documentElement.style.setProperty("--text",tg.themeParams?.text_color||"#f5f7f2");document.documentElement.style.setProperty("--muted",tg.themeParams?.hint_color||"#9da39e");const u=tg.initDataUnsafe?.user;if(u)document.getElementById("tgUser").textContent=(u.first_name||"")+" "+(u.last_name||"");tg.BackButton?.onClick(()=>{document.getElementById("request").classList.remove("open");tg.BackButton.hide();});}
document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{document.getElementById("request").classList.add("open");tg?.BackButton?.show();tg?.HapticFeedback?.impactOccurred("light");document.getElementById("name").focus();}));
document.getElementById("submit").addEventListener("click",async()=>{const status=document.getElementById("status");const name=document.getElementById("name").value.trim();const phone=document.getElementById("phone").value.trim();const when=document.getElementById("when").value;if(!name){status.textContent="Укажите имя";return;}if(!when){status.textContent="Выберите дату и время";return;}status.textContent="Отправляем…";try{const r=await fetch("/public/projects/"+location.pathname.split("/").pop()+"/bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({customerName:name,customerPhone:phone,startAt:new Date(when).toISOString(),service:"Заявка из Telegram",tg_init:initData})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Не удалось отправить");status.textContent="Готово. Заявка отправлена.";tg?.HapticFeedback?.notificationOccurred("success");tg?.MainButton?.hide();}catch(e){status.textContent="Не удалось отправить заявку. Попробуйте ещё раз.";tg?.HapticFeedback?.notificationOccurred("error");}});
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
    if(path==="/api/telegram/status"&&req.method==="GET"){
      const enabled=!!process.env.TELEGRAM_BOT_TOKEN;
      json(res,200,{data:{enabled,configured:enabled,miniAppUrl:null,requiresProject:true}});
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
      if(chatId&&update.message?.text?.startsWith("/start")){
        await telegramApi("sendMessage",{chat_id:chatId,text:"Добро пожаловать в TorclixGroup! Откройте мини‑приложение через кнопку меню бота, чтобы посмотреть сервис и оставить заявку."});
      }else if(chatId&&update.message?.text==="/help"){
        await telegramApi("sendMessage",{chat_id:chatId,text:"Используйте кнопку «Открыть мини‑приложение», чтобы открыть сервис прямо в Telegram."});
      }
      json(res,200,{ok:true});return;
    }
    const published=path.match(/^\/published\/([^/]+)$/);
    if(published&&req.method==="GET"){
      const requestedProjectId=published[1];
      const projectId=resolvePublicProjectId(requestedProjectId);
      const project=(!process.env.DATABASE_URL)
        ? (projects.get(requestedProjectId)||null)
        : await getPublishedProject(projectId);
      if(!project){html(res,404,"<h1>Опубликованный проект не найден</h1>");return;}
      const document=await getPublishedDocument(project.id) || (!process.env.DATABASE_URL ? defaultDocument(project.id) : null);
      if(!document){html(res,404,"<h1>Проект не опубликован</h1>");return;}
      html(res,200,renderPreview(project,document));
      return;
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
    const publicLead=path.match(/^\/public\/projects\/([^/]+)\/leads$/);
    if(publicLead&&req.method==="POST"){
      const projectId=publicLead[1];
      const resolvedProjectId=resolvePublicProjectId(projectId);
      const project=projects.get(projectId)||await getPublishedProject(resolvedProjectId);
      const document=project?await getPublishedDocument(project.id):null;
      if(!project||!document){json(res,404,{error:"Опубликованный проект не найден"});return;}
      const input=await body(req);
      if(!input.name){json(res,400,{error:"name is required"});return;}
      const idem=requestKey(req);
       const cacheKey=idem?project.id+":lead:"+idem:null;
       const cached=cacheKey?idempotencyCache.get(cacheKey):null;
       if(cached){json(res,cached.status,cached.body);return;}
       const lead={id:newId(),organizationId:project.organizationId,projectId:project.id,name:String(input.name),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source:String(input.source||"published_site"),status:"new",createdAt:new Date().toISOString()};
      await saveRecord("leads",lead);if(!process.env.DATABASE_URL)leads.set(lead.id,lead);
      const response={data:{id:lead.id,received:true}};if(cacheKey)idempotencyCache.set(cacheKey,{status:201,body:response});json(res,201,response);return;
    }
    const publicBooking=path.match(/^\/public\/projects\/([^/]+)\/bookings$/);
    if(publicBooking&&req.method==="POST"){
      const requestedProjectId=publicBooking[1];
      const resolvedProjectId=resolvePublicProjectId(requestedProjectId);
      const project=projects.get(requestedProjectId)||await getPublishedProject(resolvedProjectId);
      const document=project?await getPublishedDocument(project.id):null;
      if(!project||!document){json(res,404,{error:"Опубликованный проект не найден"});return;}
      const input=await body(req);
      if(!input.customerName||!input.startAt){json(res,400,{error:"customerName and startAt are required"});return;}
      const tgUser=input.tg_init?verifyTelegramInitData(String(input.tg_init),process.env.TELEGRAM_BOT_TOKEN||""):null;
      if(input.tg_init&&!tgUser){json(res,401,{error:"Telegram авторизация недействительна"});return;}
      const idem=requestKey(req);const cacheKey=idem?project.id+":booking:"+idem:null;const cached=cacheKey?idempotencyCache.get(cacheKey):null;if(cached){json(res,cached.status,cached.body);return;}
      const parsedStart=new Date(String(input.startAt));if(Number.isNaN(parsedStart.getTime())){json(res,400,{error:"Invalid startAt"});return;}
      const booking={id:newId(),organizationId:project.organizationId,projectId:project.id,customerName:String(input.customerName),customerEmail:input.customerEmail?String(input.customerEmail):undefined,customerPhone:input.customerPhone?String(input.customerPhone):undefined,startAt:parsedStart.toISOString(),service:input.service?String(input.service):undefined,telegramUserId:tgUser?.id,telegramUsername:tgUser?.username,status:"pending",createdAt:new Date().toISOString()};
      await saveRecord("bookings",booking);if(!process.env.DATABASE_URL)bookings.set(booking.id,booking);
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
      const linkedLeads=leadRows.filter(x=>x.email&&client.email&&x.email.toLowerCase()===client.email.toLowerCase());
      const linkedBookings=bookingRows.filter(x=>x.customerEmail&&client.email&&x.customerEmail.toLowerCase()===client.email.toLowerCase());
      json(res,200,{data:{client,projects:linkedProjects,leads:linkedLeads,bookings:linkedBookings,summary:{projects:linkedProjects.length,leads:linkedLeads.length,bookings:linkedBookings.length}}});
      return;
    }
    if(path==="/api/clients"&&req.method==="GET"){const auth=await requirePermission(req,res,"clients:read");if(!auth)return;json(res,200,{data:await listRecords("clients",clients,auth.organization.id)});return;}
    if(path==="/api/clients"&&req.method==="POST"){const auth=await requirePermission(req,res,"clients:write");if(!auth)return;const input=await body(req);const client={id:newId(),organizationId:auth.organization.id,name:String(input.name||"New client"),email:input.email?String(input.email):undefined};await saveRecord("clients",client);if(!process.env.DATABASE_URL)clients.set(client.id,client);json(res,201,{data:client});return;}
    if(path==="/api/leads"&&req.method==="GET"){const auth=await requirePermission(req,res,"leads:read");if(!auth)return;json(res,200,{data:await listRecords("leads",leads,auth.organization.id)});return;}
    if(path==="/api/leads"&&req.method==="POST"){const auth=await requirePermission(req,res,"leads:write");if(!auth)return;const input=await body(req);const projectId=String(input.projectId||"").trim();const project=projects.get(projectId);const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);if(!owned){json(res,400,{error:"A valid projectId is required"});return;}const lead={id:newId(),organizationId:auth.organization.id,projectId,name:String(input.name||"Anonymous"),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source:String(input.source||"website"),status:"new",createdAt:new Date().toISOString()};await saveRecord("leads",lead);if(!process.env.DATABASE_URL)leads.set(lead.id,lead);json(res,201,{data:lead});return;}
    if(path==="/api/bookings"&&req.method==="GET"){const auth=await requirePermission(req,res,"bookings:read");if(!auth)return;json(res,200,{data:await listRecords("bookings",bookings,auth.organization.id)});return;}
    if(path==="/api/bookings"&&req.method==="POST"){const auth=await requirePermission(req,res,"bookings:write");if(!auth)return;const input=await body(req);if(!input.startAt){json(res,400,{error:"startAt is required"});return;}const projectId=String(input.projectId||"").trim();const project=projects.get(projectId);const owned=project?.organizationId===auth.organization.id||await getProject(projectId,auth.organization.id);if(!owned){json(res,400,{error:"A valid projectId is required"});return;}const booking={id:newId(),organizationId:auth.organization.id,projectId,customerName:String(input.customerName||"Guest"),customerEmail:input.customerEmail?String(input.customerEmail):undefined,startAt:String(input.startAt),service:input.service?String(input.service):undefined,status:"pending",createdAt:new Date().toISOString()};await saveRecord("bookings",booking);if(!process.env.DATABASE_URL)bookings.set(booking.id,booking);json(res,201,{data:booking});return;}
    if(path==="/api/templates"&&req.method==="GET"){json(res,200,{data:["restaurant-noir","beauty-atelier","fitness-forma","medical-northline","real-estate-north","services-studio"]});return;}
    json(res,404,{error:"Not found"});
  }catch(error){console.error(error);json(res,500,{error:"Internal server error"});}
});

await initStorage();
server.listen(port,"0.0.0.0",()=>{console.log("Torclix API listening on :"+port);if(process.env.TELEGRAM_BOT_TOKEN)console.log("Telegram bot token detected; configuration is project-scoped and must be initiated from the studio.");});
