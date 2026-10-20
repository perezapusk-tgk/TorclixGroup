import "./styles.css";

type Project = { id:string; name:string; url:string; type:string; status:"Live"|"Draft"; leads:number; industry:string };
type Block = { id:string; type:string; title:string; body:string };
type Page = { id:string; name:string; blocks:Block[] };
type SiteDoc = { projectId:string; pages:Page[]; activePage:string; accent:string; miniApp?:{modules:string[];navigation?:string[];theme?:{accent:string;mode:"light"|"dark"}}; };

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
let active="Overview", editorProject:string|null=null, modal=false, selectedType="Website + Mini App", selectedIndustry="wash", wizardStep=1, toast="", editorTab="Design", selectedBlock:string|null=null, projectViewTab="builder";
type StudioSettings={language:string;font:string;accent:string;theme:string;density:string;radius:string;animations:boolean;compactNav:boolean;emailNotifications:boolean;leadNotifications:boolean;bookingNotifications:boolean};
let studioSettings:StudioSettings=JSON.parse(localStorage.getItem("tg-settings")||"null")||{language:"ru",font:"Inter",accent:"#d8ff3e",theme:"dark",density:"comfortable",radius:"medium",animations:true,compactNav:false,emailNotifications:true,leadNotifications:true,bookingNotifications:true};
function saveSettings(){localStorage.setItem("tg-settings",JSON.stringify(studioSettings));applyStudioSettings();}
function applyStudioSettings(){
 document.documentElement.style.setProperty("--brand-accent",studioSettings.accent);
 document.documentElement.style.setProperty("--ui-font",studioSettings.font);
 document.documentElement.dataset.theme=studioSettings.theme;
 document.documentElement.dataset.density=studioSettings.density;
 document.documentElement.dataset.radius=studioSettings.radius;
 document.documentElement.dataset.motion=studioSettings.animations?"on":"off";
}
const uiRu:Record<string,string>={
 "Overview":"Обзор","Projects":"Проекты","Clients":"Клиенты","Leads":"Лиды","Bookings":"Бронирования","Websites":"Сайты","Mini Apps":"Мини-приложения","Templates":"Шаблоны","Components":"Компоненты","Analytics":"Аналитика","Domains":"Домены","Integrations":"Интеграции","Billing":"Тариф и оплата","Team":"Команда","Settings":"Настройки","Workspace":"Рабочее пространство","Studio":"Студия",
 "Build. Operate.":"Создавайте. Управляйте.","Browse templates":"Открыть шаблоны","+ New project":"+ Новый проект","Active / Draft":"Активные / Черновики","Monthly revenue":"Доход в месяц","Leads this month":"Лиды за месяц","Recent projects":"Последние проекты","Activity":"Активность","Today":"Сегодня","Fast actions":"Быстрые действия","Start something new":"Начните новое","Create project":"Создать проект","Use a template":"Использовать шаблон","Add client":"Добавить клиента","Connect domain":"Подключить домен","Business OS":"Бизнес-система","Refresh":"Обновить","Published":"Опубликовано","Draft":"Черновик","Live":"Опубликовано","Active":"Активен","Connected":"Подключен","Pending":"Ожидает","Ready":"Готово","Current":"Текущий","Usage":"Использование","No domains connected":"Домены пока не подключены","Add a custom hostname":"Добавьте собственный домен","Template system":"Система шаблонов","Production-ready starting points. Select one to open it in the builder.":"Готовые стартовые решения. Выберите шаблон, чтобы открыть его в конструкторе.","Project builder":"Конструктор проекта","Design":"Дизайн","Content":"Контент","Pages":"Страницы","Add section":"Добавить секцию","Preview":"Предпросмотр","Publish":"Опубликовать","Page":"+ Страница","Global style":"Общий стиль","Responsive":"Адаптивность","SEO ready":"SEO готов","Custom domain":"Свой домен","Learn more →":"Подробнее →","Block editor":"Редактор блока","Title":"Заголовок","Body":"Текст","Save block":"Сохранить блок","Done":"Готово","New project":"Новый проект","Choose your starting point":"Выберите тип проекта","Project name":"Название проекта","Industry":"Индустрия","Cancel":"Отмена","Create":"Создать","Save":"Сохранить","No email":"Нет email","No contact":"Нет контакта","No time":"Время не указано","Studio overview":"Обзор студии","One operating system for every client project. Websites, Mini Apps, leads, booking, domains and analytics — managed from one studio.":"Единая система управления клиентскими проектами: сайты, мини-приложения, лиды, бронирования, домены и аналитика.","local workspace":"локальное рабочее пространство","Projects workspace":"Рабочее пространство проектов","items":"элементов","records":"записей","Live operational records connected to the TorclixGroup API.":"Операционные данные, подключённые к API TorclixGroup.","No records yet. Connect a website, Mini App or API form to start collecting data.":"Записей пока нет. Подключите сайт, мини-приложение или API-форму, чтобы начать сбор данных.","The projects layer of TorclixGroup.":"Раздел проектов TorclixGroup.","The websites layer of TorclixGroup.":"Раздел сайтов TorclixGroup.","The mini apps layer of TorclixGroup.":"Раздел мини-приложений TorclixGroup.","The components layer of TorclixGroup.":"Раздел компонентов TorclixGroup.","The analytics layer of TorclixGroup.":"Раздел аналитики TorclixGroup.","The domains layer of TorclixGroup.":"Раздел доменов TorclixGroup.","The integrations layer of TorclixGroup.":"Раздел интеграций TorclixGroup.","The billing layer of TorclixGroup.":"Раздел тарифов и оплаты TorclixGroup.","The team layer of TorclixGroup.":"Раздел команды TorclixGroup.","The settings layer of TorclixGroup.":"Раздел настроек TorclixGroup.","Settings center":"Центр настроек","Workspace settings":"Настройки рабочего пространства","Brand settings":"Бренд и внешний вид","Interface":"Интерфейс","Notifications":"Уведомления","Security":"Безопасность","Language":"Язык","Russian":"Русский","Font":"Шрифт","Theme":"Тема","Dark":"Тёмная","Light":"Светлая","Accent color":"Акцентный цвет","Density":"Плотность интерфейса","Comfortable":"Комфортная","Compact":"Компактная","Corner radius":"Скругление","Small":"Малое","Medium":"Среднее","Large":"Большое","Animations":"Анимации","Compact navigation":"Компактная навигация","Email notifications":"Уведомления по email","New lead notifications":"Уведомления о новых лидах","Booking notifications":"Уведомления о бронированиях","Save settings":"Сохранить настройки","Reset":"Сбросить","Saved":"Сохранено","Account":"Аккаунт","Owner":"Владелец","Plan":"Тариф","Pro":"Pro","Workspace name":"Название рабочего пространства","Brand name":"Название бренда","Primary color":"Основной цвет","Interface preview":"Предпросмотр интерфейса","Security & access":"Безопасность и доступ","Session":"Сессия","Authentication":"Аутентификация","API access":"Доступ к API","Enabled":"Включено","Configured":"Настроено","Not configured":"Не настроено","Coming soon":"Скоро","General":"Основные","Appearance":"Внешний вид","Preferences":"Предпочтения"
};
function localizeUI(){
 const walk=(node:Node)=>{
   node.childNodes.forEach(child=>{
     if(child.nodeType===Node.TEXT_NODE){
       const raw=child.textContent?.trim()||"";
       if(uiRu[raw]) child.textContent=child.textContent!.replace(raw,uiRu[raw]);
     } else if(child.nodeType===Node.ELEMENT_NODE) walk(child);
   });
 };
 walk(root);
 root.querySelectorAll<HTMLElement>("[placeholder]").forEach(el=>{const v=el.getAttribute("placeholder")||"";if(uiRu[v])el.setAttribute("placeholder",uiRu[v]);});
 root.querySelectorAll<HTMLElement>("[title]").forEach(el=>{const v=el.getAttribute("title")||"";if(uiRu[v])el.setAttribute("title",uiRu[v]);});
}
let miniModules:string[]=["home","catalog","booking","profile","notifications"];
let crm: {clients:any[];leads:any[];bookings:any[]}={clients:[],leads:[],bookings:[]};
let session:any=null;
let billing:any=null;
let team:any[]=[];
let domains:any[]=[];
let doc:SiteDoc = loadDoc(editorProject||"p1");

function loadDoc(id:string):SiteDoc{
 const saved=localStorage.getItem("tg-doc-"+id);
 if(saved) return JSON.parse(saved);
 return {projectId:id,activePage:"home",accent:"#d8ff3e",miniApp:{modules:["home","catalog","booking","profile","notifications"]},pages:[
  {id:"home",name:"Home",blocks:[
   {id:"b1",type:"Hero",title:"Built for the next version of your business.",body:"A premium digital experience, managed from one studio."},
   {id:"b2",type:"Features",title:"Everything your clients need.",body:"Services, booking, catalog, leads and customer journeys in one system."},
   {id:"b3",type:"CTA",title:"Ready when you are.",body:"Book a consultation or start a project."}
  ]},
  {id:"about",name:"About",blocks:[{id:"b4",type:"Story",title:"A better way to operate.",body:"Tell your story with confidence."}]},
  {id:"contact",name:"Contact",blocks:[{id:"b5",type:"Contact",title:"Let's talk.",body:"hello@example.com"}]}
 ]};
}
function saveDoc(){localStorage.setItem("tg-doc-"+doc.projectId,JSON.stringify(doc));}
function saveProjects(){localStorage.setItem("tg-projects",JSON.stringify(projects));}
const API_BASE=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");
const DEMO_AUTH=true;
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
  if(!editorProject) return {error:"Проект не выбран"};
  return await api("/api/projects/"+editorProject+"/document",{method:"PUT",body:JSON.stringify(doc)});
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
 ${modal?projectModal():""}${toast?`<div class="toast">${toast}</div>`:""}`;
 bind();
localizeUI();
applyStudioSettings();
}

function landing(){return `
<section class="landing">
<div class="landing-kicker">TORCLIXGROUP / STUDIO OS</div>
<h1>Digital infrastructure<br><span>for ambitious studios.</span></h1>
<p class="landing-lead">Создавайте сайты и Telegram Mini Apps для клиентов быстрее. Управляйте проектами, контентом, лидами и публикацией из одной студии.</p>
<div class="landing-actions"><button class="primary" data-action="new-project">Создать проект</button><button class="secondary" data-nav-direct="Templates">Смотреть шаблоны</button></div>
<div class="landing-grid">
<div class="landing-index">01</div><div><div class="landing-label">CREATE</div><h2>Website builder</h2><p>Страницы, секции, дизайн-система, SEO и публикация в одном потоке.</p></div>
<div class="landing-index">02</div><div><div class="landing-label">EXTEND</div><h2>Telegram Mini Apps</h2><p>Бронирования, каталог, заказы, формы, профиль, лояльность и уведомления.</p></div>
<div class="landing-index">03</div><div><div class="landing-label">OPERATE</div><h2>Client operations</h2><p>CRM, лиды, бронирования, домены, аналитика и команда в едином пространстве.</p></div>
</div></section>`;}

function overview(){
 return `<div class="hero"><div><div class="eyebrow">01 / Studio overview</div><h1>Build. Operate.<br/>Scale.</h1><p class="hero-copy">One operating system for every client project. Websites, Mini Apps, leads, booking, domains and analytics — managed from one studio.</p></div><div class="actions"><button class="secondary" data-nav-direct="Templates">Browse templates</button><button class="primary" data-action="new-project">+ New project</button></div></div>
 <div class="stats"><div class="stat"><div class="stat-label">Projects</div><div class="stat-value">${projects.length}</div></div><div class="stat"><div class="stat-label">Active / Draft</div><div class="stat-value">${projects.filter(p=>p.status==="Live").length} / ${projects.filter(p=>p.status==="Draft").length}</div></div><div class="stat"><div class="stat-label">Monthly revenue</div><div class="stat-value">€12.8k <span class="stat-delta">+18.4%</span></div></div><div class="stat"><div class="stat-label">Leads this month</div><div class="stat-value">${projects.reduce((n,p)=>n+p.leads,0)}</div></div></div>
 <div class="grid"><section class="card"><div class="card-head"><div class="card-title">Recent projects</div><div class="card-meta">local workspace</div></div><div class="project-list">${projects.slice(0,6).map((p,i)=>`<div class="project-row" data-open-project="${p.id}"><div><div class="project-name">${p.name}</div><div class="project-url">${p.url}</div></div><div class="project-type">${p.type}</div><span class="badge ${p.status==="Live"?"live":""}">${p.status}</span><div class="project-number">${p.leads} leads</div><button type="button" class="row-action" data-project="${p.id}" aria-label="Открыть проект">→</button></div>`).join("")}</div></section><section class="card"><div class="card-head"><div class="card-title">Activity</div><div class="card-meta">Today</div></div><div class="activity">${["Project workspace opened.","Template library indexed.","Domain manager prepared.","Studio foundation synced."].map((x,i)=>`<div class="activity-item"><div class="activity-dot"></div><div class="activity-text">${x}<span class="activity-time">${(i+1)*17} min ago</span></div></div>`).join("")}</div></section></div>
 <section class="section"><div class="section-head"><div><div class="eyebrow">02 / Fast actions</div><div class="section-title">Start something new</div></div></div><div class="quick-grid"><button class="quick" data-action="new-project"><div class="quick-icon">＋</div><div class="quick-name">Create project</div><div class="quick-copy">Website, Mini App or both.</div></button><button class="quick" data-nav-direct="Templates"><div class="quick-icon">✦</div><div class="quick-name">Use a template</div><div class="quick-copy">Start from an industry kit.</div></button><button class="quick" data-nav-direct="Clients"><div class="quick-icon">♙</div><div class="quick-name">Add client</div><div class="quick-copy">Client workspace.</div></button><button class="quick" data-nav-direct="Domains"><div class="quick-icon">⌁</div><div class="quick-name">Connect domain</div><div class="quick-copy">Domain and SSL manager.</div></button></div></section>`;
}

function workspace(section:string){
 const rows:Record<string,string[][]>={
 Projects:projects.map(p=>[p.name,p.type,p.status]),
 Clients:[["Клиенты","Данные загружаются из CRM","Active"]],
 Websites:projects.filter(p=>p.type==="Website"||p.type==="Website + Mini App").map(p=>[p.name,p.url,p.status==="Live"?"Published":"Draft"]),
 "Mini Apps":projects.filter(p=>p.type==="Mini App"||p.type==="Website + Mini App").map(p=>[p.name,p.type==="Website + Mini App"?"Website + Mini App":"Mini App",p.status==="Live"?"Published":"Draft"]),
 Components:[["Hero","Marketing section","Core"],["Booking","Business module","Core"],["Pricing","Commerce section","Core"]],
 Analytics:[["Visitors","24.8k","↑ 18%"],["Leads",String(crm.leads.length),"Live"],["Conversion","4.8%","↑ 0.7%"]],
 Domains:domains.length?domains.map(d=>[d.hostname,d.sslStatus==="active"?"SSL active":"SSL pending",d.status==="active"?"Connected":"Pending"]):[["No domains connected","Add a custom hostname","Pending"]],
 Integrations:[["Telegram","Mini Apps + notifications","Ready"],["Stripe","Payments","Connect"],["Email","Transactional email","Connect"]],
 Billing:[[billing?.plan||"Pro","€"+String(billing?.price||299)+" / month","Current"],["Projects",String(billing?.usage?.projects||projects.length)+" / "+String(billing?.limits?.projects||50),"Usage"],["Leads",String(billing?.usage?.leads||crm.leads.length)+" / "+String(billing?.limits?.leads||10000),"Usage"]],
 Team:team.map(m=>[m.name,m.email,m.role]),
 Settings:[["Workspace","Perezapusk Studio","Owner"],["Team","4 members","Manage"],["Brand","TorclixGroup","Configure"]]
 };
function settingsView(){
 const s=studioSettings;
 return `<div class="eyebrow">03 / Настройки</div>
 <div class="settings-hero"><div><h2>Центр настроек</h2><p class="hero-copy">Настройте TorclixGroup под свой стиль работы: язык, шрифт, цвета, плотность, уведомления и параметры рабочего пространства.</p></div><div class="settings-status"><span class="status-dot"></span> Всё синхронизировано</div></div>
 <div class="settings-layout">
  <aside class="settings-menu">
   <div class="settings-menu-title">Разделы</div>
   <button class="settings-link active" data-settings-scroll="general">Основные</button>
   <button class="settings-link" data-settings-scroll="appearance">Внешний вид</button>
   <button class="settings-link" data-settings-scroll="notifications">Уведомления</button>
   <button class="settings-link" data-settings-scroll="security">Безопасность</button>
  </aside>
  <div class="settings-content">
   <section class="settings-card" id="settings-general"><div class="settings-card-head"><div><h3>Рабочее пространство</h3><p>Основные параметры студии и бренда.</p></div><span class="settings-badge">PRO</span></div>
    <div class="settings-grid">
      <label class="settings-field"><span>Название рабочего пространства</span><input value="${session?.organization?.name||"Perezapusk Studio"}" data-setting="workspace-name"/></label>
      <label class="settings-field"><span>Название бренда</span><input value="TorclixGroup" data-setting="brand-name"/></label>
      <label class="settings-field"><span>Язык</span><select data-setting="language"><option value="ru" selected>Русский</option></select></label>
      <label class="settings-field"><span>Шрифт</span><select data-setting="font"><option>Inter</option><option>Manrope</option><option>system-ui</option><option>Arial</option></select></label>
    </div>
   </section>
   <section class="settings-card" id="settings-appearance"><div class="settings-card-head"><div><h3>Внешний вид</h3><p>Соберите визуальный стиль студии за несколько секунд.</p></div></div>
    <div class="appearance-preview"><div class="preview-brand"><span class="preview-mark">T</span><div><strong>TORCLIXGROUP</strong><small>Studio OS</small></div></div><button class="preview-primary">Основная кнопка</button></div>
    <div class="settings-grid">
      <label class="settings-field"><span>Акцентный цвет</span><div class="color-row"><input type="color" value="${s.accent}" data-setting="accent"/><code>${s.accent}</code></div></label>
      <label class="settings-field"><span>Тема</span><select data-setting="theme"><option value="dark" ${s.theme==="dark"?"selected":""}>Тёмная</option><option value="light" ${s.theme==="light"?"selected":""}>Светлая</option></select></label>
      <label class="settings-field"><span>Плотность интерфейса</span><select data-setting="density"><option value="comfortable" ${s.density==="comfortable"?"selected":""}>Комфортная</option><option value="compact" ${s.density==="compact"?"selected":""}>Компактная</option></select></label>
      <label class="settings-field"><span>Скругление</span><select data-setting="radius"><option value="small" ${s.radius==="small"?"selected":""}>Малое</option><option value="medium" ${s.radius==="medium"?"selected":""}>Среднее</option><option value="large" ${s.radius==="large"?"selected":""}>Большое</option></select></label>
    </div>
    <div class="settings-toggles"><label><input type="checkbox" data-setting="animations" ${s.animations?"checked":""}/> Анимации интерфейса</label><label><input type="checkbox" data-setting="compactNav" ${s.compactNav?"checked":""}/> Компактная навигация</label></div>
   </section>
   <section class="settings-card" id="settings-notifications"><div class="settings-card-head"><div><h3>Уведомления</h3><p>Выберите, о каких событиях студия должна сообщать.</p></div></div>
    <div class="notification-list">
      <label class="notification-row"><span><strong>Email-уведомления</strong><small>Системные сообщения и изменения рабочего пространства</small></span><input type="checkbox" data-setting="emailNotifications" ${s.emailNotifications?"checked":""}/></label>
      <label class="notification-row"><span><strong>Новые лиды</strong><small>Сообщать о новых заявках клиентов</small></span><input type="checkbox" data-setting="leadNotifications" ${s.leadNotifications?"checked":""}/></label>
      <label class="notification-row"><span><strong>Бронирования</strong><small>Сообщать о новых и изменённых бронированиях</small></span><input type="checkbox" data-setting="bookingNotifications" ${s.bookingNotifications?"checked":""}/></label>
    </div>
   </section>
   <section class="settings-card" id="settings-telegram"><div class="settings-card-head"><div><h3>Telegram и Mini App</h3><p>Публикация клиентского мини‑приложения и подключение бота.</p></div><span class="badge ${telegramStatus.enabled?"live":""}">${telegramStatus.enabled?"Подключено":"Не подключено"}</span></div><div class="security-grid"><div><span>Статус бота</span><strong>${telegramStatus.enabled?"Активен":"Ожидает токен"}</strong></div><div><span>Mini App</span><strong>${telegramStatus.enabled&&telegramStatus.miniAppUrl?"Готов":"Не настроен"}</strong></div></div><div class="settings-inline-actions">${telegramStatus.miniAppUrl?'<button class="secondary" data-action="open-telegram-mini">Открыть Mini App</button>':""}<button class="primary" data-action="configure-telegram">Подключить Telegram</button><button class="secondary" data-action="refresh-telegram">Проверить подключение</button></div></section><section class="settings-card" id="settings-security"><div class="settings-card-head"><div><h3>Безопасность и доступ</h3><p>Контроль текущей сессии и подключения API.</p></div></div>
    <div class="security-grid"><div><span>Сессия</span><strong>${session?"Активна":"Демо-сессия"}</strong></div><div><span>Аутентификация</span><strong>${session?.user?"Настроена":"Демо-режим"}</strong></div><div><span>API доступ</span><strong>${API_BASE?"Подключён":"Не настроен"}</strong></div><div><span>Тариф</span><strong>${billing?.plan||"Pro"}</strong></div></div>
   </section>
   <div class="settings-actions"><button class="secondary" data-action="reset-settings">Сбросить стиль</button><button class="primary" data-action="save-settings">Сохранить настройки</button></div>
  </div>
 </div>`;
}
 if(section==="Templates") return templateView();
 if(section==="Settings") return settingsView();
 if(section==="Clients") return crmView("Clients",crm.clients.map(x=>[x.name,x.email||"No email",x.projectIds?.length?x.projectIds.length+" projects":"No projects"]));
 if(section==="Leads") return crmView("Leads",crm.leads.map(x=>[x.name,x.email||x.phone||"No contact",x.status||"new"]));
 if(section==="Bookings") return crmView("Bookings",crm.bookings.map(x=>[x.customerName,x.startAt?new Date(x.startAt).toLocaleString():"No time",x.status||"pending"]));
 const list=rows[section]||[];
 const sectionCopy:Record<string,string>={
  Projects:"Управление всеми клиентскими проектами и их состоянием.",
  Clients:"Клиенты студии и связанные с ними проекты.",
  Leads:"Все входящие заявки из сайтов и Mini Apps.",
  Bookings:"Записи клиентов, статусы и предстоящие визиты.",
  Websites:"Опубликованные и черновые сайты клиентских проектов.",
  "Mini Apps":"Telegram Mini Apps, модули и публикации.",
  Components:"Переиспользуемые секции и бизнес-компоненты.",
  Analytics:"Ключевые показатели клиентских проектов.",
  Domains:"Домены, SSL и статусы подключения.",
  Integrations:"Telegram, платежи и внешние сервисы.",
  Billing:"Тариф, лимиты и использование студии.",
  Team:"Участники студии и роли доступа.",
  Settings:"Бренд, интерфейс, уведомления и безопасность."
 };
 const projectRows=section==="Websites"||section==="Mini Apps"||section==="Projects";
 return `<div class="eyebrow">03 / Workspace</div><div class="workspace-head"><div><h2>${section}</h2><p class="hero-copy">${sectionCopy[section]||"Рабочий раздел TorclixGroup."}</p></div><button class="primary" data-action="new-project">+ Новый проект</button></div><section class="card table-card"><div class="card-head"><div class="card-title">${section}</div><div class="card-meta">${list.length} ${list.length===1?"проект":"проектов"}</div></div>${list.length?list.map((r,idx)=>{const p=projectRows?projects.find(x=>x.name===r[0]):null;return `<div class="workspace-row ${p?"clickable-row":""}" ${p?`data-project="${p.id}"`:""}><div class="project-name">${r[0]}</div><div class="project-type">${r[1]}</div><span class="badge ${/Live|Published|Active|Connected|Current|Ready/.test(r[2])?"live":""}">${r[2]}</span>${p?`<button type="button" class="row-action" data-project="${p.id}" aria-label="Открыть">→</button>`:""}</div>`}).join(""):`<div class="inspector-note">${section==="Websites"?"Здесь появятся созданные сайты. Создайте первый проект типа «Сайт» или «Сайт + Mini App».":section==="Mini Apps"?"Здесь появятся созданные Mini Apps. Создайте первый проект типа «Mini App» или «Сайт + Mini App».":"Пока нет данных."}</div>`}</section>`;

}

function crmView(title:string,items:string[][]){ return `<div class="eyebrow">03 / Business OS</div><div class="workspace-head"><div><h2>${title}</h2><p class="hero-copy">Live operational records connected to the TorclixGroup API.</p></div><button class="primary" data-action="crm-refresh">Refresh</button></div><section class="card table-card"><div class="card-head"><div class="card-title">${title} workspace</div><div class="card-meta">${items.length} records</div></div>${items.length?items.map(r=>`<div class="workspace-row"><div class="project-name">${r[0]}</div><div class="project-type">${r[1]}</div><span class="badge live">${r[2]}</span></div>`).join(""):`<div class="inspector-note">No records yet. Connect a website, Mini App or API form to start collecting data.</div>`}</section>`; }

function templateView(){
 return `<div class="eyebrow">03 / Template system</div><div class="workspace-head"><div><h2>Templates</h2><p class="hero-copy">Production-ready starting points. Select one to open it in the builder.</p></div><button class="primary" data-action="new-project">+ New project</button></div><div class="template-grid">${templates.map((t,i)=>`<button class="template-card" data-template="${i}"><div class="template-index">0${i+1}</div><strong>${t[0]}</strong><span>${t[1]}</span><small>${t[2]}</small></button>`).join("")}</div>`;
}

function editor(project:Project){
 const page=doc.pages.find(p=>p.id===doc.activePage)||doc.pages[0];
 const miniEnabled=project.type.includes("Mini App");
 const moduleCatalog=[["home","Главная","Стартовый экран и быстрые действия."],["catalog","Каталог","Товары, услуги и категории."],["booking","Бронирование","Доступность, слоты и подтверждения."],["calendar","Календарь","Расписание и предстоящие визиты."],["cart","Корзина и заказ","Корзина, оформление и статус заказа."],["membership","Абонементы","Планы, пакеты и подписки."],["loyalty","Лояльность","Баллы, награды и уровни клиентов."],["profile","Профиль","Аккаунт, настройки и история."],["notifications","Уведомления","Системные и транзакционные уведомления."],["telegram","Telegram","Связка Telegram Mini App и бота."]];
 const tab=(id:string,label:string)=>'<button class="project-tab '+(projectViewTab===id?"selected":"")+'" data-project-tab="'+id+'">'+label+'</button>';
 const overviewTab=projectViewTab==="overview"?projectOverview(project):"";
 const builderTab=projectViewTab==="builder"?`
 <div class="builder"><aside class="builder-side"><div class="builder-tabs"><button class="${editorTab==="Design"?"selected":""}" data-tab="Design">Дизайн</button><button class="${editorTab==="Content"?"selected":""}" data-tab="Content">Контент</button></div>
 <div class="panel-title">Страницы</div>${doc.pages.map(p=>`<button class="page-item ${p.id===doc.activePage?"selected":""}" data-page="${p.id}"><span>${p.name}</span><small>${p.blocks.length} блоков</small></button>`).join("")}
 <div class="panel-title">Добавить секцию</div><div class="block-palette">${["Hero","Features","Gallery","Pricing","Testimonials","FAQ","Booking","Contact","CTA"].map(type=>`<button class="palette-item" data-add-block="${type}">+ ${type}</button>`).join("")}</div></aside>
 <div class="canvas"><div class="site-preview" style="--editor-accent:${doc.accent}">${page.blocks.map((b,i)=>`<article class="canvas-block" data-block="${b.id}"><div class="block-number">0${i+1}</div><div><div class="block-type">${b.type}</div><h3>${b.title}</h3><p>${b.body}</p><button class="preview-button">Подробнее →</button></div><button class="block-remove" data-remove-block="${b.id}">×</button></article>`).join("")}</div></div>
 <aside class="inspector"><div class="panel-title">${selectedBlock?"Редактор блока":"Общий стиль"}</div>${selectedBlock?blockInspector(page):`<label class="field"><span>Акцент</span><input id="accent" type="color" value="${doc.accent}"/></label><div class="style-chip">Адаптивность</div><div class="style-chip">SEO готов</div><div class="style-chip">Свой домен</div><div class="style-chip">Аналитика</div><div class="inspector-note">Выберите блок в макете, чтобы изменить его содержимое.</div>`}</aside></div>`:"";
 const miniTab=projectViewTab==="mini"?`<div class="project-module-view">${miniAppPanel(moduleCatalog)}</div>`:"";
 const crmTab=projectViewTab==="crm"?projectCRM(project):"";
 const settingsTab=projectViewTab==="settings"?projectSettings(project):"";
 return `<div class="editor-shell"><div class="editor-top"><div><div class="eyebrow">04 / Проект</div><h2>${project.name}</h2><div class="editor-url">${project.url} · ${project.type} · ${project.industry}</div></div><div class="editor-actions"><button class="secondary" data-action="preview">Предпросмотр</button><button class="primary" data-action="publish">Опубликовать</button></div></div>
 <div class="project-tabs">${tab("overview","Обзор")}${tab("builder","Сайт")}${miniEnabled?tab("mini","Mini App"):""}${tab("crm","Заявки и записи")}${tab("settings","Настройки")}</div>
 ${overviewTab}${builderTab}${miniTab}${crmTab}${settingsTab}</div>`;
}

function projectOverview(project:Project){
 const leads=crm.leads.filter((x:any)=>!x.projectId||x.projectId===project.id);
 const bookings=crm.bookings.filter((x:any)=>!x.projectId||x.projectId===project.id);
 return `<section class="project-dashboard"><div class="project-kpis"><div class="stat"><div class="stat-label">Статус</div><div class="stat-value">${project.status==="Live"?"Опубликован":"Черновик"}</div></div><div class="stat"><div class="stat-label">Заявки</div><div class="stat-value">${leads.length||project.leads}</div></div><div class="stat"><div class="stat-label">Бронирования</div><div class="stat-value">${bookings.length}</div></div><div class="stat"><div class="stat-label">Страницы</div><div class="stat-value">${doc.pages.length}</div></div></div>
 <div class="project-overview-grid"><section class="card"><div class="card-head"><div class="card-title">Быстрый запуск</div></div><div class="quick-actions"><button class="secondary" data-project-tab="builder">Редактировать сайт</button>${project.type.includes("Mini App")?'<button class="secondary" data-project-tab="mini">Настроить Mini App</button>':""}<button class="secondary" data-project-tab="crm">Открыть заявки</button><button class="secondary" data-action="preview">Открыть опубликованную версию</button></div></section><section class="card"><div class="card-head"><div class="card-title">Публикация</div></div><p class="inspector-note">${project.status==="Live"?"Проект опубликован и доступен клиентам.":"Проект ещё не опубликован."}</p><button class="primary" data-action="publish"> ${project.status==="Live"?"Опубликовать изменения":"Опубликовать проект"} </button></section></div></section>`;
}
function projectCRM(project:Project){
 const leads=crm.leads.filter((x:any)=>!x.projectId||x.projectId===project.id);
 const bookings=crm.bookings.filter((x:any)=>!x.projectId||x.projectId===project.id);
 return `<div class="project-module-view"><div class="workspace-head"><div><h3>Заявки и записи</h3><p class="hero-copy">Данные этого проекта из CRM TorclixGroup.</p></div><button class="secondary" data-action="crm-refresh">Обновить</button></div><div class="project-overview-grid"><section class="card table-card"><div class="card-head"><div class="card-title">Лиды</div><div class="card-meta">${leads.length}</div></div>${leads.length?leads.slice(0,12).map((x:any)=>`<div class="workspace-row"><div class="project-name">${x.name||"Без имени"}</div><div class="project-type">${x.email||x.phone||"Контакт не указан"}</div><span class="badge live">${x.status||"new"}</span></div>`).join(""):'<div class="inspector-note">Пока нет заявок.</div>'}</section><section class="card table-card"><div class="card-head"><div class="card-title">Бронирования</div><div class="card-meta">${bookings.length}</div></div>${bookings.length?bookings.slice(0,12).map((x:any)=>`<div class="workspace-row"><div class="project-name">${x.customerName||"Без имени"}</div><div class="project-type">${x.startAt?new Date(x.startAt).toLocaleString("ru-RU"):"Время не указано"}</div><span class="badge live">${x.status||"pending"}</span></div>`).join(""):'<div class="inspector-note">Пока нет бронирований.</div>'}</section></div></div>`;
}
function projectSettings(project:Project){
 return `<div class="project-module-view"><div class="settings-card"><div class="settings-card-head"><div><h3>Настройки проекта</h3><p>Основные параметры проекта клиента.</p></div><span class="badge ${project.status==="Live"?"live":""}">${project.status==="Live"?"Опубликован":"Черновик"}</span></div><div class="security-grid"><div><span>Название</span><strong>${project.name}</strong></div><div><span>Тип</span><strong>${project.type}</strong></div><div><span>Отрасль</span><strong>${project.industry}</strong></div><div><span>Проект ID</span><strong>${project.id}</strong></div></div></div><div class="settings-card"><div class="settings-card-head"><div><h3>Публикация и домен</h3><p>Следующий шаг — подключить собственный домен клиента.</p></div></div><div class="quick-actions"><button class="secondary" data-nav-direct="Domains">Домены</button><button class="secondary" data-nav-direct="Analytics">Аналитика</button></div></div></div>`;
}
;