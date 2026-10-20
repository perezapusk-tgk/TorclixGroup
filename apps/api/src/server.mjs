import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import {
  initStorage,listProjects,getProject,getPublishedProject,saveProject,getDocument,getPublishedDocument,saveDocument,publishDocument,unpublishDocument,listDomains,saveDomain,listRecords,saveRecord,
  newId,getSessionUser,listOrganizationsForUser,getMembershipRole,listTeamMembers,findDomain,verifyDomain
} from "./storage.mjs";
import { can } from "../../../packages/access/src/index.mjs";
import { authenticateRequest } from "../../../packages/auth/src/index.mjs";
import { billingSnapshot } from "./billing.mjs";

const port=Number(process.env.PORT||4000);
const projects=new Map([
  ["p1",{id:"p1",name:"Maison Noire",type:"website_mini_app",industry:"restaurant",status:"active",organizationId:"org_demo",slug:"maison-noire"}],
  ["p2",{id:"p2",name:"Forma Fitness",type:"mini_app",industry:"fitness",status:"active",organizationId:"org_demo",slug:"forma-fitness"}]
]);
const clients=new Map(),leads=new Map(),bookings=new Map();
const publishedProjects=new Set();

function headers(extra={}){return {
  "content-type":"application/json; charset=utf-8",
  ...(process.env.CORS_ORIGIN?{"access-control-allow-origin":process.env.CORS_ORIGIN}:{}),
  "access-control-allow-methods":"GET,POST,PUT,PATCH,OPTIONS",
  "access-control-allow-headers":"content-type,x-torclix-user,x-torclix-organization",
  ...extra
};}
function json(res,status,data){res.writeHead(status,headers());res.end(JSON.stringify(data));}
function html(res,status,body){res.writeHead(status,{"content-type":"text/html; charset=utf-8"});res.end(body);}
async function body(req){let raw="";for await(const chunk of req) raw+=chunk;return raw?JSON.parse(raw):{};}
function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function defaultDocument(projectId){return {projectId,activePage:"home",accent:"#d8ff3e",pages:[{id:"home",name:"Home",blocks:[
  {id:"b1",type:"Hero",title:"Built for the next version of your business.",body:"A premium digital experience, managed from one studio."},
  {id:"b2",type:"Features",title:"Everything your clients need.",body:"Services, booking, catalog, leads and customer journeys in one system."},
  {id:"b3",type:"CTA",title:"Ready when you are.",body:"Book a consultation or start a project."}
]}]};}
function renderPreview(project,doc){
  const page=doc.pages.find(p=>p.id===doc.activePage)||doc.pages[0];
  const blocks=(page?.blocks||[]).map((b,i)=>`<section style="padding:72px 8vw;border-top:1px solid #222"><small style="opacity:.55">0${i+1} · ${esc(b.type)}</small><h2 style="font-size:clamp(40px,7vw,92px);line-height:.95;margin:16px 0">${esc(b.title)}</h2><p style="max-width:640px;font-size:20px;line-height:1.6;opacity:.7">${esc(b.body)}</p><button style="margin-top:20px;padding:13px 20px;border:0;border-radius:999px;background:${esc(doc.accent)}">Learn more →</button></section>`).join("");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} — TorclixGroup</title></head><body style="margin:0;background:#080808;color:#f5f5f0;font-family:Inter,Arial,sans-serif"><header style="padding:28px 8vw;display:flex;justify-content:space-between;border-bottom:1px solid #222"><strong>TORCLIXGROUP</strong><span>${esc(project.name)}</span></header><main>${blocks}</main><footer style="padding:48px 8vw;opacity:.45">Published with TorclixGroup</footer></body></html>`;
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
    if(path==="/health"){json(res,200,{ok:true,service:"torclix-api",version:"0.7.0",storage:process.env.DATABASE_URL?"postgres":"memory",auth:process.env.NODE_ENV==="production"?"external-provider-required":"development-session"});return;}
    if(path==="/api/session"&&req.method==="GET"){const auth=await requireSession(req,res);if(!auth)return;json(res,200,{data:{user:auth.user,organization:auth.organization,organizations:auth.organizations}});return;}
    if(path==="/api/team"&&req.method==="GET"){const auth=await requirePermission(req,res,"team:read");if(!auth)return;json(res,200,{data:await listTeamMembers(auth.organization.id)});return;}
    if(path==="/api/billing"&&req.method==="GET"){const auth=await requirePermission(req,res,"billing:read");if(!auth)return;const p=await listProjects(projects,auth.organization.id);const leads=await listRecords("leads",leadsMap,auth.organization.id);json(res,200,{data:billingSnapshot(auth.organization,{projects:p.length,members:(await listTeamMembers(auth.organization.id)).length,leads:leads.length})});return;}
    if(path==="/api/projects"&&req.method==="GET"){const auth=await requirePermission(req,res,"projects:read");if(!auth)return;json(res,200,{data:await listProjects(projects,auth.organization.id)});return;}
    if(path==="/api/projects"&&req.method==="POST"){
      const auth=await requirePermission(req,res,"projects:write");if(!auth)return;
      const input=await body(req);const name=String(input.name||"Untitled project");
      const project={id:newId(),name,type:String(input.type||"website"),industry:String(input.industry||"services"),status:"draft",organizationId:auth.organization.id,slug:String(input.slug||name).toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-").replace(/^-|-$/g,"")||"untitled"};
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
      const memory=projects.get(projectId);
      const project=memory?.organizationId===auth.organization.id?memory:await getProject(projectId,auth.organization.id);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const document=await getDocument(projectId,auth.organization.id,()=>defaultDocument(projectId));
      await publishDocument(projectId,auth.organization.id,document);
      if(!process.env.DATABASE_URL) publishedProjects.add(projectId);
      if(!process.env.DATABASE_URL) project.status="active";
      if(!process.env.DATABASE_URL) projects.set(project.id,project);
      if(process.env.DATABASE_URL) await saveProject({...project,status:"active"});
      json(res,200,{data:{project:{...project,status:"active"},published:true}});
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
      const project=(!process.env.DATABASE_URL&&publishedProjects.has(miniApp[1]))?projects.get(miniApp[1]):await getPublishedProject(miniApp[1]);
      if(!project){html(res,404,"<h1>Mini App not found</h1>");return;}
      const document=await getPublishedDocument(project.id);
      if(!document){html(res,404,"<h1>Mini App is not published</h1>");return;}
      const page=document.pages?.find(p=>p.id===document.activePage)||document.pages?.[0];
      const blocks=(page?.blocks||[]).map((b,i)=>`<article style="padding:24px 0;border-bottom:1px solid #252525"><small style="opacity:.5">0${i+1} · ${esc(b.type)}</small><h2 style="font-size:32px;line-height:1;margin:10px 0">${esc(b.title)}</h2><p style="line-height:1.55;opacity:.72">${esc(b.body)}</p><button onclick="Telegram.WebApp.showAlert('Torclix action')" style="border:0;border-radius:999px;padding:12px 16px;background:${esc(document.accent||"#d8ff3e")}">Open</button></article>`).join("");
      html(res,200,`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="https://telegram.org/js/telegram-web-app.js"></script><title>${esc(project.name)}</title></head><body style="margin:0;background:#0b0b0b;color:#f5f5f0;font-family:Inter,Arial,sans-serif"><main style="max-width:560px;margin:auto;padding:20px 20px 48px"><header style="padding:12px 0 28px"><small style="opacity:.5">TORCLIXGROUP MINI APP</small><h1 style="font-size:42px;line-height:.95;margin:10px 0">${esc(project.name)}</h1></header>${blocks}</main><script>if(window.Telegram?.WebApp){Telegram.WebApp.ready();Telegram.WebApp.expand();}</script></body></html>`);
      return;
    }
    const published=path.match(/^\/published\/([^/]+)$/);
    if(published&&req.method==="GET"){
      const project=(!process.env.DATABASE_URL&&publishedProjects.has(published[1]))?projects.get(published[1]):await getPublishedProject(published[1]);
      if(!project){html(res,404,"<h1>Published project not found</h1>");return;}
      const document=await getPublishedDocument(project.id);
      if(!document){html(res,404,"<h1>Project is not published</h1>");return;}
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
      const project=projects.get(projectId)||await getPublishedProject(projectId);
      const document=project?await getPublishedDocument(projectId):null;
      if(!project||!document){json(res,404,{error:"Published project not found"});return;}
      const input=await body(req);
      if(!input.name){json(res,400,{error:"name is required"});return;}
      const lead={id:newId(),organizationId:project.organizationId,projectId,name:String(input.name),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source:String(input.source||"published_site"),status:"new",createdAt:new Date().toISOString()};
      await saveRecord("leads",lead);if(!process.env.DATABASE_URL)leads.set(lead.id,lead);
      json(res,201,{data:{id:lead.id,received:true}});return;
    }
    const publicBooking=path.match(/^\/public\/projects\/([^/]+)\/bookings$/);
    if(publicBooking&&req.method==="POST"){
      const projectId=publicBooking[1];
      const project=projects.get(projectId)||await getPublishedProject(projectId);
      const document=project?await getPublishedDocument(projectId):null;
      if(!project||!document){json(res,404,{error:"Published project not found"});return;}
      const input=await body(req);
      if(!input.customerName||!input.startAt){json(res,400,{error:"customerName and startAt are required"});return;}
      const booking={id:newId(),organizationId:project.organizationId,projectId,customerName:String(input.customerName),customerEmail:input.customerEmail?String(input.customerEmail):undefined,startAt:String(input.startAt),service:input.service?String(input.service):undefined,status:"pending",createdAt:new Date().toISOString()};
      await saveRecord("bookings",booking);if(!process.env.DATABASE_URL)bookings.set(booking.id,booking);
      json(res,201,{data:{id:booking.id,received:true,status:booking.status}});return;
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
    if(path==="/api/clients"&&req.method==="GET"){const auth=await requirePermission(req,res,"clients:read");if(!auth)return;json(res,200,{data:await listRecords("clients",clients,auth.organization.id)});return;}
    if(path==="/api/clients"&&req.method==="POST"){const auth=await requirePermission(req,res,"clients:write");if(!auth)return;const input=await body(req);const client={id:newId(),organizationId:auth.organization.id,name:String(input.name||"New client"),email:input.email?String(input.email):undefined};await saveRecord("clients",client);if(!process.env.DATABASE_URL)clients.set(client.id,client);json(res,201,{data:client});return;}
    if(path==="/api/leads"&&req.method==="GET"){const auth=await requirePermission(req,res,"leads:read");if(!auth)return;json(res,200,{data:await listRecords("leads",leads,auth.organization.id)});return;}
    if(path==="/api/leads"&&req.method==="POST"){const auth=await requirePermission(req,res,"leads:write");if(!auth)return;const input=await body(req);const lead={id:newId(),organizationId:auth.organization.id,projectId:String(input.projectId||""),name:String(input.name||"Anonymous"),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source:String(input.source||"website"),status:"new",createdAt:new Date().toISOString()};await saveRecord("leads",lead);if(!process.env.DATABASE_URL)leads.set(lead.id,lead);json(res,201,{data:lead});return;}
    if(path==="/api/bookings"&&req.method==="GET"){const auth=await requirePermission(req,res,"bookings:read");if(!auth)return;json(res,200,{data:await listRecords("bookings",bookings,auth.organization.id)});return;}
    if(path==="/api/bookings"&&req.method==="POST"){const auth=await requirePermission(req,res,"bookings:write");if(!auth)return;const input=await body(req);if(!input.startAt){json(res,400,{error:"startAt is required"});return;}const booking={id:newId(),organizationId:auth.organization.id,projectId:String(input.projectId||""),customerName:String(input.customerName||"Guest"),customerEmail:input.customerEmail?String(input.customerEmail):undefined,startAt:String(input.startAt),service:input.service?String(input.service):undefined,status:"pending",createdAt:new Date().toISOString()};await saveRecord("bookings",booking);if(!process.env.DATABASE_URL)bookings.set(booking.id,booking);json(res,201,{data:booking});return;}
    if(path==="/api/templates"&&req.method==="GET"){json(res,200,{data:["restaurant-noir","beauty-atelier","fitness-forma","medical-northline","real-estate-north","services-studio"]});return;}
    json(res,404,{error:"Not found"});
  }catch(error){console.error(error);json(res,500,{error:"Internal server error"});}
});

const leadsMap=leads;
await initStorage();
server.listen(port,()=>console.log("Torclix API listening on :"+port));
