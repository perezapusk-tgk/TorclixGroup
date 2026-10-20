  {id:"contact",name:"Contact",blocks:[{id:"b5",type:"Contact",title:"Let's talk.",body:"hello@example.com"}]}
 ]};
}
function saveDoc(){localStorage.setItem("tg-doc-"+doc.projectId,JSON.stringify(doc));}
function saveProjects(){localStorage.setItem("tg-projects",JSON.stringify(projects));}
const API_BASE=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");
const DEMO_AUTH=true; // Hosted Torclix demo always uses the deterministic demo identity; production API ignores this header.
let hydrated=false;
let telegramStatus:{enabled:boolean;miniAppUrl:string}={enabled:false,miniAppUrl:""};
async function hydrateTelegram(){try{const result=await api("/api/telegram/status");telegramStatus=result?.data||telegramStatus;}catch{}}

async function hydrateSession(){
 if(!API_BASE) return;
 const remote=await api("/api/session");
 if(remote?.data){session=remote.data; render();}
}
async function hydrateWorkspace(){
 if(!API_BASE) return;
 const [b,t,d]=await Promise.all([api("/api/billing"),api("/api/team"),api("/api/domains")]);
 billing=b?.data||null; team=Array.isArray(t?.data)?t.data:[]; domains=Array.isArray(d?.data)?d.data:[];
 if(!editorProject) render();
}
async function hydrateCRM(){
 if(!API_BASE) return;
 const [clients,leads,bookings]=await Promise.all([api("/api/clients"),api("/api/leads"),api("/api/bookings")]);
 crm={clients:Array.isArray(clients?.data)?clients.data:[],leads:Array.isArray(leads?.data)?leads.data:[],bookings:Array.isArray(bookings?.data)?bookings.data:[]};
 if(!editorProject) render();
}
async function hydrateProjects(){
  if(hydrated||!API_BASE) return;
  const remote=await api("/api/projects");
  if(!Array.isArray(remote?.data)) return;
  const mapped:Project[]=remote.data.map((p:any)=>({
    id:p.id,
    name:p.name,
    url:(p.slug||p.id)+".preview",
    type:p.type==="website_mini_app"?"Website + Mini App":p.type==="mini_app"?"Mini App":"Website",
    status:p.status==="active"?"Live":"Draft",
    leads:0,
    industry:String(p.industry||"Services").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase())
  }));
  const localById=new Map(projects.map(p=>[p.id,p]));
  projects=mapped.map(p=>({...localById.get(p.id),...p}));
  for(const p of projects) if(localById.has(p.id)===false) localStorage.removeItem("tg-doc-"+p.id);
  saveProjects();
  hydrated=true;
  if(!editorProject) render();
}
async function hydrateDocument(id:string){
  const remote=await api("/api/projects/"+id+"/document");
  if(remote?.data){
    doc=remote.data as SiteDoc;
    miniModules=Array.isArray(doc.miniApp?.modules)&&doc.miniApp.modules.length?doc.miniApp.modules:["home","catalog","booking","profile","notifications"];
    saveDoc();
  }
}

async function api(path:string,options:RequestInit={}){
  if(!API_BASE) return {error:"API URL не настроен"};
  try{
    const response=await fetch(API_BASE+path,{headers:{"content-type":"application/json",...(DEMO_AUTH?{"x-torclix-user":"demo"}:{}),...(options.headers||{})},...options});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) return {error:String(payload?.error||("API "+response.status)),status:response.status};
    return payload;
  }catch(error){ return {error:error instanceof Error?error.message:"Ошибка соединения с API"}; }
}

async function syncDocument(){