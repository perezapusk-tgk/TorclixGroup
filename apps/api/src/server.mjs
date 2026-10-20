import { createServer } from "node:http";
import { initStorage, listProjects, saveProject, getDocument, saveDocument, newId } from "./storage.mjs";

const port = Number(process.env.PORT || 4000);
const projects = new Map([
  ["p1",{id:"p1",name:"Maison Noire",type:"website_mini_app",industry:"restaurant",status:"active",organizationId:"org_demo",slug:"maison-noire"}],
  ["p2",{id:"p2",name:"Forma Fitness",type:"mini_app",industry:"fitness",status:"active",organizationId:"org_demo",slug:"forma-fitness"}]
]);
const clients = new Map();
const leads = new Map();
const bookings = new Map();

function json(res,status,data){
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,PUT,PATCH,OPTIONS","access-control-allow-headers":"content-type"});
  res.end(JSON.stringify(data));
}
function html(res,status,body){
  res.writeHead(status,{"content-type":"text/html; charset=utf-8"});
  res.end(body);
}
async function body(req){let raw="";for await(const chunk of req) raw+=chunk;return raw?JSON.parse(raw):{};}
function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function defaultDocument(projectId){
  return {projectId,activePage:"home",accent:"#d8ff3e",pages:[{id:"home",name:"Home",blocks:[
    {id:"b1",type:"Hero",title:"Built for the next version of your business.",body:"A premium digital experience, managed from one studio."},
    {id:"b2",type:"Features",title:"Everything your clients need.",body:"Services, booking, catalog, leads and customer journeys in one system."},
    {id:"b3",type:"CTA",title:"Ready when you are.",body:"Book a consultation or start a project."}
  ]}]};
}
function renderPreview(project,doc){
  const page=doc.pages.find(p=>p.id===doc.activePage)||doc.pages[0];
  const blocks=(page?.blocks||[]).map((b,i)=>`<section style="padding:72px 8vw;border-top:1px solid #222"><small style="opacity:.55">0${i+1} · ${esc(b.type)}</small><h2 style="font-size:clamp(40px,7vw,92px);line-height:.95;margin:16px 0">${esc(b.title)}</h2><p style="max-width:640px;font-size:20px;line-height:1.6;opacity:.7">${esc(b.body)}</p><button style="margin-top:20px;padding:13px 20px;border:0;border-radius:999px;background:${esc(doc.accent)}">Learn more →</button></section>`).join("");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} — TorclixGroup</title></head><body style="margin:0;background:#080808;color:#f5f5f0;font-family:Inter,Arial,sans-serif"><header style="padding:28px 8vw;display:flex;justify-content:space-between;border-bottom:1px solid #222"><strong>TORCLIXGROUP</strong><span>${esc(project.name)}</span></header><main>${blocks}</main><footer style="padding:48px 8vw;opacity:.45">Published with TorclixGroup</footer></body></html>`;
}

const server=createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){json(res,204,{});return;}
  const url=new URL(req.url||"/","http://localhost");
  const path=url.pathname;
  try{
    if(path==="/health"){json(res,200,{ok:true,service:"torclix-api",version:"0.4.0",storage:process.env.DATABASE_URL?"postgres":"memory"});return;}
    if(path==="/api/projects"&&req.method==="GET"){json(res,200,{data:await listProjects(projects)});return;}
    if(path==="/api/projects"&&req.method==="POST"){
      const input=await body(req);const project={id:newId("p"),name:String(input.name||"Untitled project"),type:String(input.type||"website"),industry:String(input.industry||"services"),status:"draft",organizationId:String(input.organizationId||"org_demo"),slug:String(input.slug||input.name||"untitled").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")};
      projects.set(project.id,project);await saveProject(project);await saveDocument(project.id,defaultDocument(project.id));json(res,201,{data:project});return;
    }
    const pm=path.match(/^\/api\/projects\/([^/]+)$/);
    if(pm&&(req.method==="PATCH"||req.method==="PUT")){
      const input=await body(req);
      const current=projects.get(pm[1]);
      const all=await listProjects(projects);
      const project=current||all.find(p=>p.id===pm[1]);
      if(!project){json(res,404,{error:"Project not found"});return;}
      const next={...project,...input,id:project.id};
      projects.set(project.id,next);
      await saveProject(next);
      json(res,200,{data:next});
      return;
    }
    if(pm&&req.method==="GET"){const project=projects.get(pm[1]);if(project){json(res,200,{data:project});return;}const all=await listProjects(projects);const found=all.find(p=>p.id===pm[1]);found?json(res,200,{data:found}):json(res,404,{error:"Project not found"});return;}
    const dm=path.match(/^\/api\/projects\/([^/]+)\/document$/);
    if(dm){const projectId=dm[1];const all=await listProjects(projects);if(!projects.has(projectId)&&!all.some(p=>p.id===projectId)){json(res,404,{error:"Project not found"});return;}if(req.method==="GET"){json(res,200,{data:await getDocument(projectId,()=>defaultDocument(projectId))});return;}if(req.method==="PUT"||req.method==="PATCH"){const input=await body(req);const current=await getDocument(projectId,()=>defaultDocument(projectId));const next={...current,...input,projectId};await saveDocument(projectId,next);json(res,200,{data:next});return;}}
    const preview=path.match(/^\/preview\/([^/]+)$/);
    if(preview&&req.method==="GET"){const all=await listProjects(projects);const project=projects.get(preview[1])||all.find(p=>p.id===preview[1]||p.slug===preview[1]);if(!project){html(res,404,"<h1>Project not found</h1>");return;}const doc=await getDocument(project.id,()=>defaultDocument(project.id));html(res,200,renderPreview(project,doc));return;}
    if(path==="/api/clients"&&req.method==="GET"){json(res,200,{data:[...clients.values()]});return;}
    if(path==="/api/clients"&&req.method==="POST"){const input=await body(req);const client={id:newId("c"),organizationId:String(input.organizationId||"org_demo"),name:String(input.name||"New client"),email:input.email?String(input.email):undefined,projectIds:Array.isArray(input.projectIds)?input.projectIds:[]};clients.set(client.id,client);json(res,201,{data:client});return;}
    if(path==="/api/leads"&&req.method==="GET"){json(res,200,{data:[...leads.values()]});return;}
    if(path==="/api/leads"&&req.method==="POST"){const input=await body(req);const lead={id:newId("lead"),organizationId:String(input.organizationId||"org_demo"),projectId:String(input.projectId||""),name:String(input.name||"Anonymous"),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source:String(input.source||"website"),status:"new",createdAt:new Date().toISOString()};leads.set(lead.id,lead);json(res,201,{data:lead});return;}
    if(path==="/api/bookings"&&req.method==="GET"){json(res,200,{data:[...bookings.values()]});return;}
    if(path==="/api/bookings"&&req.method==="POST"){const input=await body(req);const booking={id:newId("book"),organizationId:String(input.organizationId||"org_demo"),projectId:String(input.projectId||""),customerName:String(input.customerName||"Guest"),customerEmail:input.customerEmail?String(input.customerEmail):undefined,startAt:String(input.startAt||""),service:input.service?String(input.service):undefined,status:"pending",createdAt:new Date().toISOString()};bookings.set(booking.id,booking);json(res,201,{data:booking});return;}
    if(path==="/api/templates"&&req.method==="GET"){json(res,200,{data:["restaurant-noir","beauty-atelier","fitness-forma","medical-northline","real-estate-north","services-studio"]});return;}
    json(res,404,{error:"Not found"});
  }catch(error){console.error(error);json(res,500,{error:"Internal server error"});}
});

await initStorage();
server.listen(port,()=>console.log("Torclix API listening on :"+port));
