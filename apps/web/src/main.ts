import "./styles.css";

type Project = { id:string; name:string; url:string; type:string; status:"Live"|"Draft"; leads:number; industry:string };
type Block = { id:string; type:string; title:string; body:string };
type Page = { id:string; name:string; blocks:Block[] };
type SiteDoc = { projectId:string; pages:Page[]; activePage:string; accent:string };

const nav = [
  ["⌂","Overview"],["▦","Projects"],["♙","Clients"],["◉","Leads"],["◷","Bookings"],["◫","Websites"],["◈","Mini Apps"],["✦","Templates"],["◇","Components"],["↗","Analytics"],["⌁","Domains"],["⇄","Integrations"],["◌","Billing"],["♟","Team"],["⚙","Settings"]
] as const;

const seed:Project[]=[
 {id:"p1",name:"Maison Noire",url:"maisonnoire.studio",type:"Website + Mini App",status:"Live",leads:128,industry:"Restaurant"},
 {id:"p2",name:"Forma Fitness",url:"forma.fit",type:"Mini App",status:"Live",leads:74,industry:"Fitness"},
 {id:"p3",name:"Northline Clinic",url:"northline.health",type:"Website",status:"Draft",leads:31,industry:"Medical"},
 {id:"p4",name:"Atelier 24",url:"atelier24.com",type:"Website",status:"Live",leads:96,industry:"Services"}
];
const templates=[["Restaurant / Noir","Website + Mini App","Menu · booking · loyalty · orders"],["Beauty / Atelier","Website + Mini App","Services · staff · calendar · booking"],["Fitness / Forma","Mini App","Classes · trainers · memberships"],["Medical / Northline","Website","Services · doctors · booking · SEO"],["Real Estate / North","Website","Listings · agents · inquiries"],["Services / Studio","Website","Cases · services · leads"]];

let projects:Project[] = JSON.parse(localStorage.getItem("tg-projects")||"null")||seed;
let active="Overview", editorProject:string|null=null, modal=false, selectedType="Website + Mini App", toast="", editorTab="Design", selectedBlock:string|null=null;
let miniModules:string[]=["home","catalog","booking","profile","notifications"];
let crm: {clients:any[];leads:any[];bookings:any[]}={clients:[],leads:[],bookings:[]};
let session:any=null;
let billing:any=null;
let team:any[]=[];
let domains:any[]=[];
let doc:SiteDoc = loadDoc(editorProject||"p1");

const uiRu:Record<string,string>={
"Overview":"Обзор","Projects":"Проекты","Clients":"Клиенты","Leads":"Лиды","Bookings":"Бронирования","Websites":"Сайты","Mini Apps":"Мини-приложения","Templates":"Шаблоны","Components":"Компоненты","Analytics":"Аналитика","Domains":"Домены","Integrations":"Интеграции","Billing":"Тариф и оплата","Team":"Команда","Settings":"Настройки","Workspace":"Рабочее пространство",
"Studio":"Студия","Build. Operate.":"Создавайте. Управляйте.","Scale.":"Масштабируйте.","Browse templates":"Открыть шаблоны","+ New project":"+ Новый проект","Active / Draft":"Активные / Черновики","Monthly revenue":"Доход в месяц","Leads this month":"Лиды за месяц","Recent projects":"Последние проекты","Activity":"Активность","Today":"Сегодня","Fast actions":"Быстрые действия","Start something new":"Начните новое","Create project":"Создать проект","Use a template":"Использовать шаблон","Add client":"Добавить клиента","Connect domain":"Подключить домен",
"Business OS":"Бизнес-система","Refresh":"Обновить","Published":"Опубликовано","Draft":"Черновик","Live":"Опубликовано","Active":"Активен","Connected":"Подключен","Pending":"Ожидает","Ready":"Готово","Current":"Текущий","Usage":"Использование","No domains connected":"Домены пока не подключены","Add a custom hostname":"Добавьте собственный домен",
"Template system":"Система шаблонов","Production-ready starting points. Select one to open it in the builder.":"Готовые стартовые решения. Выберите шаблон, чтобы открыть его в конструкторе.","Project builder":"Конструктор проекта","Design":"Дизайн","Content":"Контент","Pages":"Страницы","Add section":"Добавить секцию","Preview":"Предпросмотр","Publish":"Опубликовать","Page":"+ Страница","Global style":"Общий стиль","Responsive":"Адаптивность","SEO ready":"SEO готов","Custom domain":"Свой домен","Learn more →":"Подробнее →","Block editor":"Редактор блока","Title":"Заголовок","Body":"Текст","Save block":"Сохранить блок","Done":"Готово","New project":"Новый проект","Choose your starting point":"Выберите тип проекта","Project name":"Название проекта","Industry":"Индустрия","Cancel":"Отмена","Create":"Создать","Save":"Сохранить","No email":"Нет email","No contact":"Нет контакта","No time":"Время не указано"
};
function localizeUI(){
for(const node of [...root.querySelectorAll("*")]){
if(node.children.length) continue;
const text=node.textContent?.trim(); if(!text) continue;
let next=text; for(const [en,ru] of Object.entries(uiRu)) next=next.split(en).join(ru);
if(next!==text) node.textContent=next;
}}


function loadDoc(id:string):SiteDoc{
 const saved=localStorage.getItem("tg-doc-"+id);
 if(saved) return JSON.parse(saved);
 return {projectId:id,activePage:"home",accent:"#d8ff3e",pages:[
  {id:"home",name:"Главная",blocks:[
   {id:"b1",type:"Hero",title:"Создано для следующего этапа вашего бизнеса.",body:"Премиальный цифровой опыт, которым можно управлять из одной студии."},
   {id:"b2",type:"Features",title:"Всё необходимое вашим клиентам.",body:"Услуги, бронирование, каталог, лиды и клиентские сценарии в одной системе."},
   {id:"b3",type:"CTA",title:"Готовы начать?",body:"Запишитесь на консультацию или создайте проект."}
  ]},
  {id:"about",name:"О компании",blocks:[{id:"b4",type:"Story",title:"Удобный способ работать.",body:"Расскажите о себе уверенно."}]},
  {id:"contact",name:"Контакты",blocks:[{id:"b5",type:"Contact",title:"Давайте обсудим.",body:"hello@example.com"}]}
 ]};
}
function saveDoc(){localStorage.setItem("tg-doc-"+doc.projectId,JSON.stringify(doc));}
function saveProjects(){localStorage.setItem("tg-projects",JSON.stringify(projects));}
const API_BASE=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");
const DEMO_AUTH=import.meta.env.VITE_TORCLIX_DEMO==="true";
let hydrated=false;
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
    saveDoc();
  }
}

async function api(path:string,options:RequestInit={}){
  if(!API_BASE) return null;
  try{
    const response=await fetch(API_BASE+path,{headers:{"content-type":"application/json",...(DEMO_AUTH?{"x-torclix-user":"demo"}:{}),...(options.headers||{})},...options});
    if(!response.ok) throw new Error("API "+response.status);
    return await response.json();
  }catch{ return null; }
}

async function syncDocument(){
  if(!editorProject) return;
  await api("/api/projects/"+editorProject+"/document",{method:"PUT",body:JSON.stringify(doc)});
}



const root=document.querySelector<HTMLDivElement>("#root")!;

function render(){
 const project=projects.find(p=>p.id===editorProject);
 root.innerHTML=`
 <div class="app"><aside class="sidebar">
  <div class="brand"><div class="brand-mark">T</div><div><div class="brand-name">TORCLIXGROUP</div><span class="brand-sub">Studio OS / 02</span></div></div>
  <nav><div class="nav-label">Workspace</div>${nav.map(([icon,label],i)=>(i===8?'<div class="nav-label">Workspace</div>':"")+`<button class="nav-item ${active===label&&!editorProject?"active":""}" data-nav="${label}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("")}</nav>
  <div class="sidebar-bottom"><div class="workspace"><div class="avatar">PG</div><div><div class="workspace-name">${session?.organization?.name||"Perezapusk Studio"}</div><div class="workspace-role">${session?.user?.name||"Studio Owner"} · ${session?.organization?.plan||"Pro"}</div></div></div></div>
 </aside>
 <main class="main"><header class="topbar"><div class="crumb">Studio / <strong>${project?project.name:active}</strong></div><div class="top-actions"><button class="icon-btn" data-action="back">←</button><button class="icon-btn">⌕</button><div class="avatar">PG</div></div></header>
 <section class="content">${editorProject&&project?editor(project):active==="Overview"?overview():workspace(active)}</section></main></div>
 ${modal?projectModal():""}${toast?`<div class="toast">${toast}</div>`:""}<nav class="mobile-nav">${nav.slice(0,5).map(([icon,label])=>`<button class="${active===label&&!editorProject?"active":""}" data-nav="${label}"><span>${icon}</span><small>${label}</small></button>`).join("")}</nav>`;
 localizeUI();
 bind();
}

function overview(){
 return `<div class="hero"><div><div class="eyebrow">01 / Studio overview</div><h1>Build. Operate.<br/>Scale.</h1><p class="hero-copy">One operating system for every client project. Websites, Mini Apps, leads, booking, domains and analytics — managed from one studio.</p></div><div class="actions"><button class="secondary" data-nav-direct="Templates">Browse templates</button><button class="primary" data-action="new-project">+ New project</button></div></div>
 <div class="stats"><div class="stat"><div class="stat-label">Projects</div><div class="stat-value">${projects.length}</div></div><div class="stat"><div class="stat-label">Active / Draft</div><div class="stat-value">${projects.filter(p=>p.status==="Live").length} / ${projects.filter(p=>p.status==="Draft").length}</div></div><div class="stat"><div class="stat-label">Monthly revenue</div><div class="stat-value">€12.8k <span class="stat-delta">+18.4%</span></div></div><div class="stat"><div class="stat-label">Leads this month</div><div class="stat-value">${projects.reduce((n,p)=>n+p.leads,0)}</div></div></div>
 <div class="grid"><section class="card"><div class="card-head"><div class="card-title">Recent projects</div><div class="card-meta">local workspace</div></div><div class="project-list">${projects.slice(0,6).map((p,i)=>`<div class="project-row"><div><div class="project-name">${p.name}</div><div class="project-url">${p.url}</div></div><div class="project-type">${p.type}</div><span class="badge ${p.status==="Live"?"live":""}">${p.status}</span><div class="project-number">${p.leads} leads</div><button class="row-action" data-project="${p.id}">→</button></div>`).join("")}</div></section><section class="card"><div class="card-head"><div class="card-title">Activity</div><div class="card-meta">Today</div></div><div class="activity">${["Project workspace opened.","Template library indexed.","Domain manager prepared.","Studio foundation synced."].map((x,i)=>`<div class="activity-item"><div class="activity-dot"></div><div class="activity-text">${x}<span class="activity-time">${(i+1)*17} min ago</span></div></div>`).join("")}</div></section></div>
 <section class="section"><div class="section-head"><div><div class="eyebrow">02 / Fast actions</div><div class="section-title">Start something new</div></div></div><div class="quick-grid"><button class="quick" data-action="new-project"><div class="quick-icon">＋</div><div class="quick-name">Create project</div><div class="quick-copy">Website, Mini App or both.</div></button><button class="quick" data-nav-direct="Templates"><div class="quick-icon">✦</div><div class="quick-name">Use a template</div><div class="quick-copy">Start from an industry kit.</div></button><button class="quick" data-nav-direct="Clients"><div class="quick-icon">♙</div><div class="quick-name">Add client</div><div class="quick-copy">Client workspace.</div></button><button class="quick" data-nav-direct="Domains"><div class="quick-icon">⌁</div><div class="quick-name">Connect domain</div><div class="quick-copy">Domain and SSL manager.</div></button></div></section>`;
}

function workspace(section:string){
 const rows:Record<string,string[][]>={
 Projects:projects.map(p=>[p.name,p.type,p.status]), Clients:[["Maison Noire","Restaurant · 3 contacts","Active"],["Forma Fitness","Fitness · 2 contacts","Active"],["Northline Clinic","Medical · 4 contacts","Active"]],
 Websites:[["Maison Noire","maisonnoire.studio","Published"],["Northline Clinic","northline.health","Draft"],["Atelier 24","atelier24.com","Published"]],
 "Mini Apps":[["Maison Noire","Menu · Booking · Loyalty","Published"],["Forma Fitness","Classes · Membership","Published"]],
 Components:[["Hero","Marketing section","Core"],["Booking","Business module","Core"],["Pricing","Commerce section","Core"]],
 Analytics:[["Visitors","24.8k","↑ 18%"],["Leads","329","↑ 22%"],["Conversion","4.8%","↑ 0.7%"]],
 Domains:domains.length?domains.map(d=>[d.hostname,d.sslStatus==="active"?"SSL active":"SSL pending",d.status==="active"?"Connected":"Pending"]):[["No domains connected","Add a custom hostname","Pending"]],
 Integrations:[["Telegram","Mini Apps + notifications","Ready"],["Stripe","Payments","Connect"],["Email","Transactional email","Connect"]],
 Billing:[[billing?.plan||"Pro","€"+String(billing?.price||299)+" / month","Current"],["Projects",String(billing?.usage?.projects||projects.length)+" / "+String(billing?.limits?.projects||50),"Usage"],["Leads",String(billing?.usage?.leads||0)+" / "+String(billing?.limits?.leads||10000),"Usage"]],
 Team:team.map(m=>[m.name,m.email,m.role]),
 Settings:[["Workspace","Perezapusk Studio","Owner"],["Team","4 members","Manage"],["Brand","TorclixGroup","Configure"]]
 };
 if(section==="Templates") return templateView();
 if(section==="Clients") return crmView("Clients",crm.clients.map(x=>[x.name,x.email||"No email",x.projectIds?.length?x.projectIds.length+" projects":"No projects"]));
 if(section==="Leads") return crmView("Leads",crm.leads.map(x=>[x.name,x.email||x.phone||"No contact",x.status||"new"]));
 if(section==="Bookings") return crmView("Bookings",crm.bookings.map(x=>[x.customerName,x.startAt?new Date(x.startAt).toLocaleString():"No time",x.status||"pending"]));
 const list=rows[section]||[];
 return `<div class="eyebrow">03 / Workspace</div><div class="workspace-head"><div><h2>${section}</h2><p class="hero-copy">The ${section.toLowerCase()} layer of TorclixGroup.</p></div><button class="primary" data-action="new-project">+ New project</button></div><section class="card table-card"><div class="card-head"><div class="card-title">${section} workspace</div><div class="card-meta">${list.length} items</div></div>${list.map(r=>`<div class="workspace-row"><div class="project-name">${r[0]}</div><div class="project-type">${r[1]}</div><span class="badge ${/Live|Published|Active|Connected|Current|Ready/.test(r[2])?"live":""}">${r[2]}</span><button class="row-action">→</button></div>`).join("")}</section>`;
}

function crmView(title:string,items:string[][]){ return `<div class="eyebrow">03 / Business OS</div><div class="workspace-head"><div><h2>${title}</h2><p class="hero-copy">Live operational records connected to the TorclixGroup API.</p></div><button class="primary" data-action="crm-refresh">Refresh</button></div><section class="card table-card"><div class="card-head"><div class="card-title">${title} workspace</div><div class="card-meta">${items.length} records</div></div>${items.length?items.map(r=>`<div class="workspace-row"><div class="project-name">${r[0]}</div><div class="project-type">${r[1]}</div><span class="badge live">${r[2]}</span></div>`).join(""):`<div class="inspector-note">No records yet. Connect a website, Mini App or API form to start collecting data.</div>`}</section>`; }

function templateView(){
 return `<div class="eyebrow">03 / Template system</div><div class="workspace-head"><div><h2>Templates</h2><p class="hero-copy">Production-ready starting points. Select one to open it in the builder.</p></div><button class="primary" data-action="new-project">+ New project</button></div><div class="template-grid">${templates.map((t,i)=>`<button class="template-card" data-template="${i}"><div class="template-index">0${i+1}</div><strong>${t[0]}</strong><span>${t[1]}</span><small>${t[2]}</small></button>`).join("")}</div>`;
}

function editor(project:Project){
 const page=doc.pages.find(p=>p.id===doc.activePage)||doc.pages[0];
 const miniEnabled=project.type.includes("Mini App");
 const industryKey=project.industry.toLowerCase().replace(" ","_");
 const moduleCatalog=[["home","Home","Personalized start screen and shortcuts."],["catalog","Catalog","Products, services and categories."],["booking","Booking","Availability, slots and confirmations."],["calendar","Calendar","Schedules and upcoming visits."],["cart","Cart & Order","Cart, checkout and order status."],["membership","Membership","Plans, passes and subscriptions."],["loyalty","Loyalty","Points, rewards and customer tiers."],["profile","Profile","Account, preferences and history."],["notifications","Notifications","Transactional notifications."],["telegram","Telegram","Telegram Mini App bridge and bot actions."]].filter(m=>m[0]==="home"||m[0]==="profile"||m[0]==="notifications"||["restaurant","beauty","fitness","medical","services","real_estate"].includes(industryKey));
 return `<div class="editor-shell"><div class="editor-top"><div><div class="eyebrow">04 / Project builder</div><h2>${project.name}</h2><div class="editor-url">${project.url} · ${project.type}</div></div><div class="editor-actions"><button class="secondary" data-action="add-page">+ Page</button><button class="secondary" data-action="toggle-mini">Mini App</button><button class="secondary" data-action="preview">Preview</button><button class="primary" data-action="publish">Publish</button></div></div>
 <div class="builder"><aside class="builder-side"><div class="builder-tabs"><button class="${editorTab==="Design"?"selected":""}" data-tab="Design">Design</button><button class="${editorTab==="Content"?"selected":""}" data-tab="Content">Content</button></div>
 <div class="panel-title">Pages</div>${doc.pages.map(p=>`<button class="page-item ${p.id===doc.activePage?"selected":""}" data-page="${p.id}"><span>${p.name}</span><small>${p.blocks.length} blocks</small></button>`).join("")}
 <div class="panel-title">Add section</div><div class="block-palette">${["Hero","Features","Gallery","Pricing","Testimonials","FAQ","Booking","Contact","CTA"].map(type=>`<button class="palette-item" data-add-block="${type}">+ ${type}</button>`).join("")}</div></aside>
 <div class="canvas"><div class="site-preview" style="--editor-accent:${doc.accent}">${page.blocks.map((b,i)=>`<article class="canvas-block" data-block="${b.id}"><div class="block-number">0${i+1}</div><div><div class="block-type">${b.type}</div><h3>${b.title}</h3><p>${b.body}</p><button class="preview-button">Learn more →</button></div><button class="block-remove" data-remove-block="${b.id}">×</button></article>`).join("")}</div></div>
 <aside class="inspector"><div class="panel-title">${selectedBlock?"Block editor":"Global style"}</div>${selectedBlock?blockInspector(page):`<label class="field"><span>Accent</span><input id="accent" type="color" value="${doc.accent}"/></label><div class="style-chip">Responsive</div><div class="style-chip">SEO ready</div><div class="style-chip">Custom domain</div><div class="style-chip">Analytics</div><div class="inspector-note">Select any block in the canvas to edit its content. Changes are saved to the active project document.</div>`}</aside></div></div>`;
}

function miniAppPanel(moduleCatalog:string[][]){
 return '<section class="mini-app-panel"><div class="card-head"><div><div class="eyebrow">05 / Mini App runtime</div><div class="card-title">Compose the client app</div></div><div class="card-meta">'+miniModules.length+' modules enabled</div></div><div class="mini-module-grid">'+moduleCatalog.map(m=>'<button class="mini-module '+(miniModules.includes(m[0])?"selected":"")+'" data-mini-module="'+m[0]+'"><span class="mini-module-mark">'+(miniModules.includes(m[0])?"✓":"+")+'</span><strong>'+m[1]+'</strong><small>'+m[2]+'</small></button>').join("")+'</div></section>';
}

function blockInspector(page:Page){
 const block=page.blocks.find(b=>b.id===selectedBlock);
 if(!block) return `<div class="inspector-note">Select a block to edit it.</div>`;
 return `<div class="selected-block"><div class="style-chip">${block.type}</div><label class="field"><span>Title</span><textarea id="block-title">${block.title}</textarea></label><label class="field"><span>Body</span><textarea id="block-body">${block.body}</textarea></label><button class="primary full" data-action="save-block">Save block</button><button class="secondary full" data-action="clear-block">Done</button></div>`;
}

function projectModal(){
 const types=[["Website","Pages, sections, SEO and publishing."],["Mini App","Modules, booking, catalog and accounts."],["Website + Mini App","The complete client experience."]];
 return `<div class="modal-backdrop" data-close="modal"><div class="modal"><div class="modal-head"><div><div class="eyebrow">05 / New project</div><div class="modal-title">Choose your starting point</div></div><button class="close" data-close="modal">×</button></div><div class="modal-body"><div class="type-grid">${types.map(([n,c])=>`<button class="type-option ${selectedType===n?"selected":""}" data-type="${n}"><strong>${n}</strong><span>${c}</span></button>`).join("")}</div><div class="form-row"><div class="field"><label>Project name</label><input id="project-name" placeholder="e.g. Atelier 25"/></div><div class="field"><label>Industry</label><select id="industry"><option>Restaurant</option><option>Beauty</option><option>Fitness</option><option>Medical</option><option>Real Estate</option><option>Services</option></select></div></div></div><div class="modal-foot"><button class="secondary" data-close="modal">Cancel</button><button class="primary" data-action="create-project">Create project →</button></div></div></div>`;
}

function notify(m:string){toast=m;render();window.setTimeout(()=>{toast="";render()},2200)}
function bind(){
 root.querySelectorAll<HTMLElement>("[data-nav]").forEach(el=>el.addEventListener("click",async()=>{active=el.dataset.nav||"Overview";editorProject=null;if(["Clients","Leads","Bookings"].includes(active)) await hydrateCRM();render()}));
 root.querySelectorAll<HTMLElement>("[data-nav-direct]").forEach(el=>el.addEventListener("click",()=>{active=el.dataset.navDirect||"Overview";editorProject=null;render()}));
 root.querySelectorAll<HTMLElement>("[data-action='back']").forEach(el=>el.addEventListener("click",()=>{editorProject=null;active="Projects";render()}));
 root.querySelectorAll<HTMLElement>("[data-action='new-project']").forEach(el=>el.addEventListener("click",()=>{modal=true;render()}));
 root.querySelectorAll<HTMLElement>("[data-close='modal']").forEach(el=>el.addEventListener("click",e=>{if((e.target as HTMLElement).dataset.close==="modal"||el.classList.contains("close")||el.classList.contains("secondary")){modal=false;render()}}));
 root.querySelectorAll<HTMLElement>("[data-type]").forEach(el=>el.addEventListener("click",()=>{selectedType=el.dataset.type||selectedType;render()}));
 root.querySelectorAll<HTMLElement>("[data-action='create-project']").forEach(el=>el.addEventListener("click",async()=>{const name=root.querySelector<HTMLInputElement>("#project-name")?.value.trim()||"Untitled project";const industry=root.querySelector<HTMLSelectElement>("#industry")?.value||"Services";const typeMap:Record<string,string>={"Website":"website","Mini App":"mini_app","Website + Mini App":"website_mini_app"};const localId="p"+Date.now();const payload={name,type:typeMap[selectedType]||"website",industry:industry.toLowerCase().replace(" ","_"),organizationId:"org_demo"};const remote=await api("/api/projects",{method:"POST",body:JSON.stringify(payload)});const id=remote?.data?.id||localId;projects.unshift({id,name,url:(remote?.data?.slug||name.toLowerCase().replace(/[^a-z0-9]+/g,"-"))+".preview",type:selectedType,status:"Draft",leads:0,industry});saveProjects();modal=false;editorProject=id;doc=loadDoc(id);void syncDocument();notify(name+" created — opening builder.")}));
 root.querySelectorAll<HTMLElement>("[data-project]").forEach(el=>el.addEventListener("click",async()=>{editorProject=el.dataset.project||null;active="Projects";doc=loadDoc(editorProject||"p1");render();if(editorProject){await hydrateDocument(editorProject);render();}}));
 root.querySelectorAll<HTMLElement>("[data-template]").forEach(el=>el.addEventListener("click",()=>{const t=templates[Number(el.dataset.template)];selectedType=t[1];modal=true;render()}));
 root.querySelectorAll<HTMLElement>("[data-page]").forEach(el=>el.addEventListener("click",()=>{doc.activePage=el.dataset.page||doc.activePage;saveDoc();render()}));
 root.querySelectorAll<HTMLElement>("[data-tab]").forEach(el=>el.addEventListener("click",()=>{editorTab=el.dataset.tab||"Design";render()}));
 root.querySelectorAll<HTMLElement>("[data-mini-module]").forEach(el=>el.addEventListener("click",()=>{const id=el.dataset.miniModule||"";miniModules=miniModules.includes(id)?miniModules.filter(x=>x!==id):[...miniModules,id];render();}));
 root.querySelectorAll<HTMLElement>("[data-action='toggle-mini']").forEach(el=>el.addEventListener("click",()=>{notify("Mini App runtime is ready to configure.");}));
 root.querySelectorAll<HTMLElement>("[data-action='crm-refresh']").forEach(el=>el.addEventListener("click",async()=>{await hydrateCRM();notify("Business data refreshed.");}));
 root.querySelectorAll<HTMLElement>("[data-add-block]").forEach(el=>el.addEventListener("click",()=>{const type=el.dataset.addBlock||"Section";const page=doc.pages.find(p=>p.id===doc.activePage)!;page.blocks.push({id:"b"+Date.now(),type,title:type==="Hero"?"Your next chapter starts here.":type+" section",body:"Edit this section to match your client's business."});saveDoc();void syncDocument();notify(type+" section added.")}));
 root.querySelectorAll<HTMLElement>("[data-block]").forEach(el=>el.addEventListener("click",e=>{if((e.target as HTMLElement).closest("[data-remove-block]")) return;selectedBlock=el.dataset.block||null;render();}));
 root.querySelectorAll<HTMLElement>("[data-action='save-block']").forEach(el=>el.addEventListener("click",()=>{const page=doc.pages.find(p=>p.id===doc.activePage)!;const block=page.blocks.find(b=>b.id===selectedBlock);if(block){block.title=root.querySelector<HTMLTextAreaElement>("#block-title")?.value||block.title;block.body=root.querySelector<HTMLTextAreaElement>("#block-body")?.value||block.body;saveDoc();void syncDocument();notify("Block saved.");}}));
 root.querySelectorAll<HTMLElement>("[data-action='clear-block']").forEach(el=>el.addEventListener("click",()=>{selectedBlock=null;render();}));
 root.querySelectorAll<HTMLElement>("[data-remove-block]").forEach(el=>el.addEventListener("click",()=>{const page=doc.pages.find(p=>p.id===doc.activePage)!;page.blocks=page.blocks.filter(b=>b.id!==el.dataset.removeBlock);saveDoc();render()}));
 root.querySelector<HTMLInputElement>("#accent")?.addEventListener("input",e=>{doc.accent=(e.target as HTMLInputElement).value;saveDoc();document.documentElement.style.setProperty("--editor-accent",doc.accent)});
 root.querySelectorAll<HTMLElement>("[data-action='add-page']").forEach(el=>el.addEventListener("click",()=>{const id="page"+Date.now();doc.pages.push({id,name:"New page",blocks:[{id:"b"+Date.now(),type:"Hero",title:"New page.",body:"Start building this page."}]});doc.activePage=id;saveDoc();render()}));
 root.querySelectorAll<HTMLElement>("[data-action='preview']").forEach(el=>el.addEventListener("click",()=>{if(!editorProject){notify("Open a project first.");return;}if(!API_BASE){notify("Preview needs VITE_API_URL configured.");return;}window.open(API_BASE+"/preview/"+editorProject,"_blank","noopener,noreferrer");}));
 root.querySelectorAll<HTMLElement>("[data-action='publish']").forEach(el=>el.addEventListener("click",async()=>{
  const p=projects.find(x=>x.id===editorProject);if(!p)return;
  const remote=await api("/api/projects/"+p.id+"/publish",{method:"POST"});
  if(remote?.data?.published){p.status="Live";saveProjects();notify(p.name+" published successfully.");}
  else notify("Publish failed — check API/auth configuration.");
}));
}
render();
void hydrateSession();
void hydrateWorkspace();
void hydrateProjects();
void hydrateCRM();
