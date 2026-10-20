import { createServer } from "node:http";

const port = Number(process.env.PORT || 4000);
const projects = new Map([
 ["p1",{id:"p1",name:"Maison Noire",type:"website_mini_app",industry:"restaurant",status:"active"}],
 ["p2",{id:"p2",name:"Forma Fitness",type:"mini_app",industry:"fitness",status:"active"}]
]);

function json(res,status,data){
 res.writeHead(status,{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type"});
 res.end(JSON.stringify(data));
}
async function body(req){
 let raw="";
 for await(const chunk of req) raw+=chunk;
 return raw?JSON.parse(raw):{};
}
const server=createServer(async(req,res)=>{
 if(req.method==="OPTIONS"){json(res,204,{});return;}
 const url=new URL(req.url||"/","http://localhost");
 if(url.pathname==="/health"){json(res,200,{ok:true,service:"torclix-api",version:"0.2.0"});return;}
 if(url.pathname==="/api/projects"&&req.method==="GET"){json(res,200,{data:[...projects.values()]});return;}
 if(url.pathname==="/api/projects"&&req.method==="POST"){
   try{
    const input=await body(req); const id="p"+Date.now();
    const project={id,name:String(input.name||"Untitled project"),type:String(input.type||"website"),industry:String(input.industry||"services"),status:"draft"};
    projects.set(id,project); json(res,201,{data:project});
   }catch{json(res,400,{error:"Invalid JSON"});}
   return;
 }
 const match=url.pathname.match(/^\/api\/projects\/([^/]+)$/);
 if(match&&req.method==="GET"){
   const project=projects.get(match[1]); project?json(res,200,{data:project}):json(res,404,{error:"Project not found"}); return;
 }
 json(res,404,{error:"Not found"});
});
server.listen(port,()=>console.log(`Torclix API listening on :${port}`));
