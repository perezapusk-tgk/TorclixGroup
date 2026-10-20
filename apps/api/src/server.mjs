import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT || 4000);

const projects = new Map([
  ["p1",{id:"p1",name:"Maison Noire",type:"website_mini_app",industry:"restaurant",status:"active",organizationId:"org_demo"}],
  ["p2",{id:"p2",name:"Forma Fitness",type:"mini_app",industry:"fitness",status:"active",organizationId:"org_demo"}]
]);

const documents = new Map();
const clients = new Map([
  ["c1",{id:"c1",organizationId:"org_demo",name:"Maison Noire",email:"hello@maisonnoire.studio",projectIds:["p1"]}],
  ["c2",{id:"c2",organizationId:"org_demo",name:"Forma Fitness",email:"team@forma.fit",projectIds:["p2"]}]
]);
const leads = new Map();
const bookings = new Map();

function json(res,status,data){
  res.writeHead(status,{
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":"*",
    "access-control-allow-methods":"GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers":"content-type"
  });
  res.end(JSON.stringify(data));
}

async function body(req){
  let raw="";
  for await(const chunk of req) raw+=chunk;
  return raw?JSON.parse(raw):{};
}

function id(prefix){ return prefix+"_"+randomUUID().slice(0,8); }

function defaultDocument(projectId){
  return {
    projectId,
    activePage:"home",
    accent:"#d8ff3e",
    pages:[
      {id:"home",name:"Home",blocks:[
        {id:"b1",type:"Hero",title:"Built for the next version of your business.",body:"A premium digital experience, managed from one studio."},
        {id:"b2",type:"Features",title:"Everything your clients need.",body:"Services, booking, catalog, leads and customer journeys in one system."},
        {id:"b3",type:"CTA",title:"Ready when you are.",body:"Book a consultation or start a project."}
      ]}
    ]
  };
}

const server=createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){ json(res,204,{}); return; }

  const url=new URL(req.url||"/","http://localhost");
  const path=url.pathname;

  if(path==="/health"){
    json(res,200,{ok:true,service:"torclix-api",version:"0.3.0",storage:"memory"});
    return;
  }

  if(path==="/api/projects" && req.method==="GET"){
    json(res,200,{data:[...projects.values()]});
    return;
  }

  if(path==="/api/projects" && req.method==="POST"){
    try{
      const input=await body(req);
      const project={
        id:id("p"),
        name:String(input.name||"Untitled project"),
        type:String(input.type||"website"),
        industry:String(input.industry||"services"),
        status:"draft",
        organizationId:String(input.organizationId||"org_demo")
      };
      projects.set(project.id,project);
      documents.set(project.id,defaultDocument(project.id));
      json(res,201,{data:project});
    }catch{ json(res,400,{error:"Invalid JSON"}); }
    return;
  }

  const projectMatch=path.match(/^\/api\/projects\/([^/]+)$/);
  if(projectMatch && req.method==="GET"){
    const project=projects.get(projectMatch[1]);
    project ? json(res,200,{data:project}) : json(res,404,{error:"Project not found"});
    return;
  }

  const docMatch=path.match(/^\/api\/projects\/([^/]+)\/document$/);
  if(docMatch){
    const projectId=docMatch[1];
    if(!projects.has(projectId)){ json(res,404,{error:"Project not found"}); return; }
    if(req.method==="GET"){
      if(!documents.has(projectId)) documents.set(projectId,defaultDocument(projectId));
      json(res,200,{data:documents.get(projectId)});
      return;
    }
    if(req.method==="PUT" || req.method==="PATCH"){
      try{
        const input=await body(req);
        const current=documents.get(projectId)||defaultDocument(projectId);
        const next={...current,...input,projectId};
        documents.set(projectId,next);
        json(res,200,{data:next});
      }catch{ json(res,400,{error:"Invalid JSON"}); }
      return;
    }
  }

  if(path==="/api/clients" && req.method==="GET"){
    json(res,200,{data:[...clients.values()]});
    return;
  }

  if(path==="/api/clients" && req.method==="POST"){
    try{
      const input=await body(req);
      const client={id:id("c"),organizationId:String(input.organizationId||"org_demo"),name:String(input.name||"New client"),email:input.email?String(input.email):undefined,projectIds:Array.isArray(input.projectIds)?input.projectIds:[]};
      clients.set(client.id,client);
      json(res,201,{data:client});
    }catch{ json(res,400,{error:"Invalid JSON"}); }
    return;
  }

  if(path==="/api/leads" && req.method==="GET"){
    json(res,200,{data:[...leads.values()]});
    return;
  }

  if(path==="/api/leads" && req.method==="POST"){
    try{
      const input=await body(req);
      const lead={id:id("lead"),organizationId:String(input.organizationId||"org_demo"),projectId:String(input.projectId||""),name:String(input.name||"Anonymous"),email:input.email?String(input.email):undefined,phone:input.phone?String(input.phone):undefined,source:String(input.source||"website"),status:"new",createdAt:new Date().toISOString()};
      leads.set(lead.id,lead);
      json(res,201,{data:lead});
    }catch{ json(res,400,{error:"Invalid JSON"}); }
    return;
  }

  if(path==="/api/bookings" && req.method==="GET"){
    json(res,200,{data:[...bookings.values()]});
    return;
  }

  if(path==="/api/bookings" && req.method==="POST"){
    try{
      const input=await body(req);
      const booking={id:id("book"),organizationId:String(input.organizationId||"org_demo"),projectId:String(input.projectId||""),customerName:String(input.customerName||"Guest"),customerEmail:input.customerEmail?String(input.customerEmail):undefined,startAt:String(input.startAt||""),service:input.service?String(input.service):undefined,status:"pending",createdAt:new Date().toISOString()};
      bookings.set(booking.id,booking);
      json(res,201,{data:booking});
    }catch{ json(res,400,{error:"Invalid JSON"}); }
    return;
  }

  if(path==="/api/templates" && req.method==="GET"){
    json(res,200,{data:[
      {id:"restaurant-noir",industry:"restaurant",name:"Restaurant / Noir",type:"website_mini_app"},
      {id:"beauty-atelier",industry:"beauty",name:"Beauty / Atelier",type:"website_mini_app"},
      {id:"fitness-forma",industry:"fitness",name:"Fitness / Forma",type:"mini_app"},
      {id:"medical-northline",industry:"medical",name:"Medical / Northline",type:"website"},
      {id:"real-estate-north",industry:"real_estate",name:"Real Estate / North",type:"website"},
      {id:"services-studio",industry:"services",name:"Services / Studio",type:"website"}
    ]});
    return;
  }

  json(res,404,{error:"Not found"});
});

server.listen(port,()=>console.log("Torclix API listening on :"+port));
