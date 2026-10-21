import "./styles.css";

type Project = { id:string; name:string; url:string; type:string; status:"Live"|"Draft"; leads:number; industry:string };
type Block = { id:string; type:string; title:string; body:string };
type Page = { id:string; name:string; blocks:Block[] };
type SiteDoc = { projectId:string; pages:Page[]; activePage:string; accent:string; miniApp?:{modules:string[];navigation?:string[];theme?:{accent:string;mode:"light"|"dark"}}; };

const nav = [
  ["⌂","Overview"],["▦","Projects"],["✦","Templates"],["♙","Clients & Leads"],["↗","Analytics"],["⌁","Audit"],["◌","Billing"],["▣","Client Portal"],["✦","Branding"],["▤","Invoices"],["◇","Economics"]
] as const;
const mobileNav = [["⌂","Overview"],["▦","Projects"],["♙","Clients & Leads"],["↗","Analytics"],["◌","Billing"],["▤","Invoices"]] as const;

const seed:Project[]=[
 {id:"p1",name:"Maison Noire",url:"maisonnoire.studio",type:"Website + Mini App",status:"Live",leads:128,industry:"Restaurant"},
 {id:"p2",name:"Forma Fitness",url:"forma.fit",type:"Mini App",status:"Live",leads:74,industry:"Fitness"},
 {id:"p3",name:"Northline Clinic",url:"northline.health",type:"Website",status:"Draft",leads:31,industry:"Medical"},
 {id:"p4",name:"Atelier 24",url:"atelier24.com",type:"Website",status:"Live",leads:96,industry:"Services"}
];
const templates=[["Restaurant / Noir","Website + Mini App","Меню · столики · заказы · лояльность","restaurant"],["Beauty / Atelier","Website + Mini App","Услуги · мастера · календарь · запись","beauty"],["Fitness / Forma","Mini App","Занятия · тренеры · абонементы","fitness"],["Medical / Northline","Website","Услуги · врачи · запись","medical"],["Real Estate / North","Website","Объекты · агенты · заявки","realty"],["Services / Studio","Website","Услуги · специалисты · заявки","services"],["Car Wash / Wash","Website + Mini App","Услуги · прайс · запись","wash"],["Education / Class","Website + Mini App","Курсы · занятия · запись","education"],["Retail / Store","Website + Mini App","Каталог · корзина · заказы","retail"]];

let projects:Project[] = JSON.parse(localStorage.getItem("tg-projects")||"null")||[];
let active="Overview", editorProject:string|null=null, modal=false, selectedType="Website + Mini App", selectedIndustry="wash", wizardStep=1, toast="", editorTab="Design", selectedBlock:string|null=null, projectViewTab="overview", mobileMenu=false;
type StudioSettings={language:string;font:string;accent:string;theme:string;density:string;radius:string;animations:boolean;compactNav:boolean;emailNotifications:boolean;leadNotifications:boolean;bookingNotifications:boolean};
let studioSettings:StudioSettings=JSON.parse(localStorage.getItem("tg-settings")||"null")||{language:"ru",font:"Inter",accent:"#d8ff3e",theme:"dark",density:"comfortable",radius:"medium",animations:true,compactNav:false,emailNotifications:true,leadNotifications:true,bookingNotifications:true};
function htmlEsc(value:any){return String(value??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"} as Record<string,string>)[c]||c)}
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
 "Overview":"Обзор","Projects":"Проекты","Templates":"Шаблоны","Clients":"Клиенты","Clients & Leads":"Клиенты и заявки","Analytics":"Аналитика","Audit":"Аудит","Billing":"Тариф и оплата","Client Portal":"Портал клиента","Branding":"Брендинг","Invoices":"Счета","Economics":"Экономика","Leads":"Лиды","Bookings":"Бронирования","Catalog":"Каталог","Websites":"Сайты","Mini Apps":"Мини-приложения","Components":"Компоненты","Domains":"Домены","Integrations":"Интеграции","Team":"Команда","Settings":"Настройки","Workspace":"Рабочее пространство","Studio":"Студия",
 "Build. Operate.":"Создавайте. Управляйте.","Открыть шаблоны":"Открыть шаблоны","+ New project":"+ Новый проект","Active / Draft":"Активные / Черновики","Monthly revenue":"Доход в месяц","Leads this month":"Лиды за месяц","Последние проекты":"Последние проекты","Activity":"Активность","Today":"Сегодня","Fast actions":"Быстрые действия","Начните новое":"Начните новое","Создать проект":"Создать проект","Использовать шаблон":"Использовать шаблон","Добавить клиента":"Добавить клиента","Подключить домен":"Подключить домен","Business OS":"Бизнес-система","Refresh":"Обновить","Published":"Опубликовано","Draft":"Черновик","Live":"Опубликовано","Active":"Активен","Connected":"Подключен","Pending":"Ожидает","Ready":"Готово","Current":"Текущий","Usage":"Использование","No domains connected":"Домены пока не подключены","Add a custom hostname":"Добавьте собственный домен","Template system":"Система шаблонов","Готовые стартовые решения по отраслям. Выберите шаблон, чтобы открыть его в конструкторе.":"Готовые стартовые решения. Выберите шаблон, чтобы открыть его в конструкторе.","Project builder":"Конструктор проекта","Design":"Дизайн","Content":"Контент","Pages":"Страницы","Add section":"Добавить секцию","Preview":"Предпросмотр","Publish":"Опубликовать","Page":"+ Страница","Global style":"Общий стиль","Responsive":"Адаптивность","SEO ready":"SEO готов","Custom domain":"Свой домен","Learn more →":"Подробнее →","Block editor":"Редактор блока","Title":"Заголовок","Body":"Текст","Сохранить блок":"Сохранить блок","Готово":"Готово","New project":"Новый проект","Choose your starting point":"Выберите тип проекта","Project name":"Название проекта","Industry":"Индустрия","Cancel":"Отмена","Create":"Создать","Save":"Сохранить","No email":"Нет email","No contact":"Нет контакта","No time":"Время не указано","Studio overview":"Обзор студии","Единая операционная система для клиентских проектов: сайты, Mini Apps, заявки, бронирования, домены и аналитика — всё из одной студии.":"Единая система управления клиентскими проектами: сайты, мини-приложения, лиды, бронирования, домены и аналитика.","рабочее пространство":"локальное рабочее пространство","Projects workspace":"Рабочее пространство проектов","items":"элементов","records":"записей","Операционные данные этого рабочего пространства, подключённые к API TorclixGroup.":"Операционные данные, подключённые к API TorclixGroup.","Записей пока нет. Подключите сайт, Mini App или API-форму, чтобы начать сбор данных.":"Записей пока нет. Подключите сайт, мини-приложение или API-форму, чтобы начать сбор данных.","The projects layer of TorclixGroup.":"Раздел проектов TorclixGroup.","The websites layer of TorclixGroup.":"Раздел сайтов TorclixGroup.","The mini apps layer of TorclixGroup.":"Раздел мини-приложений TorclixGroup.","The components layer of TorclixGroup.":"Раздел компонентов TorclixGroup.","The analytics layer of TorclixGroup.":"Раздел аналитики TorclixGroup.","The domains layer of TorclixGroup.":"Раздел доменов TorclixGroup.","The integrations layer of TorclixGroup.":"Раздел интеграций TorclixGroup.","The billing layer of TorclixGroup.":"Раздел тарифов и оплаты TorclixGroup.","The team layer of TorclixGroup.":"Раздел команды TorclixGroup.","The settings layer of TorclixGroup.":"Раздел настроек TorclixGroup.","Settings center":"Центр настроек","Workspace settings":"Настройки рабочего пространства","Brand settings":"Бренд и внешний вид","Interface":"Интерфейс","Notifications":"Уведомления","Security":"Безопасность","Language":"Язык","Russian":"Русский","Font":"Шрифт","Theme":"Тема","Dark":"Тёмная","Light":"Светлая","Accent color":"Акцентный цвет","Density":"Плотность интерфейса","Comfortable":"Комфортная","Compact":"Компактная","Corner radius":"Скругление","Small":"Малое","Medium":"Среднее","Large":"Большое","Animations":"Анимации","Compact navigation":"Компактная навигация","Email notifications":"Уведомления по email","New lead notifications":"Уведомления о новых лидах","Booking notifications":"Уведомления о бронированиях","Save settings":"Сохранить настройки","Reset":"Сбросить","Saved":"Сохранено","Account":"Аккаунт","Owner":"Владелец","Plan":"Тариф","Pro":"Pro","Workspace name":"Название рабочего пространства","Brand name":"Название бренда","Primary color":"Основной цвет","Interface preview":"Предпросмотр интерфейса","Security & access":"Безопасность и доступ","Session":"Сессия","Authentication":"Аутентификация","API access":"Доступ к API","Enabled":"Включено","Configured":"Настроено","Not configured":"Не настроено","Coming soon":"Скоро","General":"Основные","Appearance":"Внешний вид","Preferences":"Предпочтения"
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
let analytics:any=null;
let audit:any[]=[];
let catalogItems:any[]=[];
let orders:any[]=[];
let invoices:any[]=[];
let invoiceModal=false;
let catalogModal=false;
let editingCatalogId:string|null=null;
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
function buildTemplateDocument(id:string,industry:string):SiteDoc{
 const templates:Record<string,{pages:Page[];accent:string}>={
  restaurant:{accent:"#d8ff3e",pages:[
   {id:"home",name:"Главная",blocks:[
    {id:"hero",type:"Hero",title:"Вкус, который возвращает.",body:"Меню, столики и заказ — в одном цифровом опыте."},
    {id:"features",type:"Features",title:"Всё для гостя.",body:"Меню, бронирование, заказы и программа лояльности."},
    {id:"pricing",type:"Pricing",title:"Популярное меню",body:"Завтраки · Основное меню · Десерты"},
    {id:"booking",type:"Booking",title:"Забронировать столик",body:"Выберите дату и время — без звонков."},
    {id:"cta",type:"CTA",title:"До встречи за столом.",body:"Откройте Mini App и оформите заказ."}
   ]},
   {id:"menu",name:"Меню",blocks:[{id:"menu-1",type:"Catalog",title:"Основное меню",body:"Каталог блюд и актуальные цены."}]},
   {id:"contact",name:"Контакты",blocks:[{id:"contact-1",type:"Contact",title:"Мы рядом.",body:"Адрес, часы работы и контакты ресторана."}]}
  ]},
  beauty:{accent:"#ff5ca8",pages:[
   {id:"home",name:"Главная",blocks:[
    {id:"hero",type:"Hero",title:"Ваш лучший образ.",body:"Услуги, мастера и запись в несколько касаний."},
    {id:"features",type:"Features",title:"Красота без ожидания.",body:"Выберите услугу, мастера и удобное время."},
    {id:"pricing",type:"Pricing",title:"Услуги",body:"Стрижка · Окрашивание · Маникюр"},
    {id:"booking",type:"Booking",title:"Записаться к мастеру",body:"Свободные окна обновляются автоматически."}
   ]},
   {id:"services",name:"Услуги",blocks:[{id:"services-1",type:"Catalog",title:"Каталог услуг",body:"Цены, длительность и специалисты."}]},
   {id:"contact",name:"Контакты",blocks:[{id:"contact-1",type:"Contact",title:"Студия красоты",body:"Адрес и контакты."}]}
  ]},
  fitness:{accent:"#5aa9ff",pages:[
   {id:"home",name:"Главная",blocks:[
    {id:"hero",type:"Hero",title:"Тренировки, которые работают.",body:"Расписание, тренеры и абонементы в одном месте."},
    {id:"features",type:"Features",title:"Выберите свой ритм.",body:"Групповые занятия, персональные тренировки и абонементы."},
    {id:"booking",type:"Booking",title:"Записаться на тренировку",body:"Выберите занятие и время."}
   ]},
   {id:"schedule",name:"Расписание",blocks:[{id:"schedule-1",type:"Calendar",title:"Расписание занятий",body:"Занятия и свободные места."}]},
   {id:"contact",name:"Контакты",blocks:[{id:"contact-1",type:"Contact",title:"Фитнес-студия",body:"Адрес, тренеры и контакты."}]}
  ]},
  medical:{accent:"#5aa9ff",pages:[
   {id:"home",name:"Главная",blocks:[
    {id:"hero",type:"Hero",title:"Забота без очередей.",body:"Врачи, диагностика и запись онлайн."},
    {id:"features",type:"Features",title:"Всё под контролем.",body:"Выберите специалиста и удобное время приёма."},
    {id:"booking",type:"Booking",title:"Записаться к врачу",body:"Запись без звонка в регистратуру."}
   ]},
   {id:"services",name:"Услуги",blocks:[{id:"services-1",type:"Catalog",title:"Медицинские услуги",body:"Приём врача · Диагностика · Анализы"}]},
   {id:"contact",name:"Контакты",blocks:[{id:"contact-1",type:"Contact",title:"Клиника",body:"Адрес, часы работы и контакты."}]}
  ]},
  wash:{accent:"#c6ff3d",pages:[
   {id:"home",name:"Главная",blocks:[
    {id:"hero",type:"Hero",title:"Мойка без очередей.",body:"Выберите услугу, время и оформите запись онлайн."},
    {id:"features",type:"Features",title:"Удобно для водителя.",body:"Прайс, свободные окна и история записей в одном месте."},
    {id:"pricing",type:"Pricing",title:"Услуги",body:"Экспресс-мойка · Комплекс · Химчистка салона"},
    {id:"booking",type:"Booking",title:"Записаться на мойку",body:"Выберите удобное время без звонка."}
   ]},
   {id:"services",name:"Услуги",blocks:[{id:"services-1",type:"Catalog",title:"Услуги автомойки",body:"Цены, длительность и описание работ."}]},
   {id:"contact",name:"Контакты",blocks:[{id:"contact-1",type:"Contact",title:"Мы рядом.",body:"Адрес, часы работы и контакты."}]}
  ]},
  realty:{accent:"#5aa9ff",pages:[
   {id:"home",name:"Главная",blocks:[
    {id:"hero",type:"Hero",title:"Дом, который вы ищете.",body:"Объекты, агенты и заявки — в одном цифровом продукте."},
    {id:"features",type:"Features",title:"Найдите свой вариант.",body:"Фильтры, карточки объектов и связь с агентом."},
    {id:"pricing",type:"Pricing",title:"Избранные объекты",body:"Покупка · Аренда · Оценка"},
    {id:"booking",type:"Booking",title:"Запросить просмотр",body:"Выберите объект и удобное время."}
   ]},
   {id:"listings",name:"Объекты",blocks:[{id:"listings-1",type:"Catalog",title:"Каталог недвижимости",body:"Карточки объектов, цены и характеристики."}]},
   {id:"contact",name:"Контакты",blocks:[{id:"contact-1",type:"Contact",title:"Свяжитесь с агентом",body:"Телефон, email и офис."}]}
  ]},
  services:{accent:"#c6ff3d",pages:[
   {id:"home",name:"Главная",blocks:[
    {id:"hero",type:"Hero",title:"Сделаем быстро и аккуратно.",body:"Услуги, специалисты и заявки в одном цифровом продукте."},
    {id:"features",type:"Features",title:"Просто получить услугу.",body:"Выберите услугу, оставьте заявку и получите подтверждение."},
    {id:"pricing",type:"Pricing",title:"Услуги",body:"Консультация · Выезд · Обслуживание"},
    {id:"booking",type:"Booking",title:"Оставить заявку",body:"Выберите удобное время."}
   ]},
   {id:"services",name:"Услуги",blocks:[{id:"services-1",type:"Catalog",title:"Каталог услуг",body:"Описание, стоимость и сроки."}]},
   {id:"contact",name:"Контакты",blocks:[{id:"contact-1",type:"Contact",title:"Свяжитесь с нами",body:"Телефон, email и адрес."}]}
  ]}
 };
 const base=templates[industry]||templates.services;
 return {projectId:id,activePage:"home",accent:base.accent,miniApp:{modules:["home","catalog","booking","profile","notifications"],navigation:["home","catalog","booking","profile","notifications"],theme:{accent:base.accent,mode:"dark"}},pages:base.pages};
}

function saveDoc(){localStorage.setItem("tg-doc-"+doc.projectId,JSON.stringify(doc));}
function saveProjects(){localStorage.setItem("tg-projects",JSON.stringify(projects));}
const API_BASE=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");
const DEMO_AUTH=import.meta.env.VITE_TORCLIX_DEMO==="true";
const TRIAL_AUTH=import.meta.env.VITE_TORCLIX_TRIAL==="true";
const TRIAL_KEY="tg-trial-session";
const trialToken=TRIAL_AUTH?(localStorage.getItem(TRIAL_KEY)||(()=>{const value=crypto.randomUUID().replace(/-/g,"")+crypto.randomUUID().replace(/-/g,"");localStorage.setItem(TRIAL_KEY,value);return value;})()):"";
let hydrated=false;
let telegramStatus:{enabled:boolean;miniAppUrl:string;botUrl:string;projectBotUrl:string;botUsername:string}={enabled:false,miniAppUrl:"",botUrl:"",projectBotUrl:"",botUsername:""};
function publicSiteUrl(projectId:string){return API_BASE?API_BASE+"/published/"+encodeURIComponent(projectId):"";}
function publicMiniAppUrl(projectId:string){return API_BASE?API_BASE+"/miniapp/"+encodeURIComponent(projectId):"";}

async function hydrateInvoices(){
 if(!API_BASE)return;
 const result=await api("/api/invoices");invoices=Array.isArray(result?.data)?result.data:[];if(active==="Billing")render();
}
async function hydrateOrders(){
 if(!API_BASE)return;
 const result=await api("/api/orders");orders=Array.isArray(result?.data)?result.data:[];if(active==="Orders")render();
}
async function hydrateCatalog(){
 if(!API_BASE) return;
 const result=await api("/api/catalog");
 catalogItems=Array.isArray(result?.data)?result.data:[];
 if(!editorProject) render();
}

async function hydrateTelegram(){try{const query=editorProject?"?projectId="+encodeURIComponent(editorProject):"";const result=await api("/api/telegram/status"+query);telegramStatus={...telegramStatus,...(result?.data||{})};}catch{}}

async function hydrateSession(){
 if(!API_BASE) return;
 const remote=await api("/api/session");
 if(remote?.data){session=remote.data; render();}
}
async function hydrateAnalytics(){
 if(!API_BASE) return;
 const [result,auditResult]=await Promise.all([api("/api/analytics"),api("/api/audit?limit=25")]);
 analytics=result?.data||null;
 audit=Array.isArray(auditResult?.data)?auditResult.data:[];
 if(!editorProject) render();
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
    url:publicSiteUrl(p.id),
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
    const response=await fetch(API_BASE+path,{...options,headers:{"content-type":"application/json",...(DEMO_AUTH?{"x-torclix-user":"demo"}:{}),...(TRIAL_AUTH?{"x-torclix-trial":trialToken}:{}),...(options.headers||{})}});
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
 <div class="app"><div class="mobile-overlay ${mobileMenu?"open":""}" data-action="mobile-close"></div><aside class="sidebar ${mobileMenu?"mobile-open":""}">
  <div class="brand"><div class="brand-mark">T</div><div><div class="brand-name">TORCLIXGROUP</div><span class="brand-sub">Studio OS / 02</span></div></div>
  <nav><div class="nav-label">Workspace</div>${nav.map(([icon,label])=>`<button class="nav-item ${active===label&&!editorProject?"active":""}" data-nav="${label}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("")}</nav>
  <div class="sidebar-bottom"><div class="workspace"><div class="avatar">PG</div><div><div class="workspace-name">${session?.organization?.name||"Perezapusk Studio"}</div><div class="workspace-role">${session?.user?.name||"Studio Owner"} · ${session?.organization?.plan||"Pro"}</div></div></div></div>
 </aside>
 <main class="main"><header class="topbar"><div class="topbar-left"><button class="icon-btn mobile-menu-toggle" aria-label="Меню" data-action="mobile-menu">☰</button><div class="top-logo"><span class="top-logo-mark">T</span><span><b>TorclixGroup</b><small>Studio OS</small></span></div></div><div class="top-mode"><span class="mode-icon">▦</span><span>Studio</span><strong>Активен</strong><span class="mode-arrow">⌄</span></div><div class="top-actions"><button class="icon-btn" data-action="back" aria-label="Назад">←</button><button class="icon-btn top-search" aria-label="Поиск">⌕</button><button class="icon-btn" aria-label="Уведомления">♧</button><div class="avatar">PG</div></div></header>
 <section class="content">${editorProject&&project?editor(project):active==="Overview"?overview():active==="Projects"?workspace("Projects"):active==="Templates"?templateView():active==="Clients & Leads"?inboxView():active==="Analytics"?analyticsView():studioStructureView(active)||workspace(active)}</section></main></div>
 ${modal?projectModal():""}${invoiceModal?invoiceCreateModal():""}${toast?`<div class="toast">${toast}</div>`:""}`;
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
 const live=projects.filter(p=>p.status==="Live").length;
 const draft=projects.length-live;
 const leads=crm.leads.length||projects.reduce((n,p)=>n+p.leads,0);
 const bookings=crm.bookings.length;
 const ordersCount=orders.length;
 const revenue=(orders||[]).filter((x:any)=>!["cancelled","refunded"].includes(x.status)).reduce((n,x)=>n+Number(x.total||0),0);
 const avgLeads=projects.length?Math.round(leads/projects.length):0;
 return `<div class="dashboard-page">
 <div class="dashboard-heading"><div><div class="eyebrow">TORCLIXGROUP / STUDIO OS</div><h1>Панель студии</h1><p class="dashboard-subtitle">Управляйте всеми клиентскими проектами и командой в одном месте.</p></div><div class="dashboard-actions"><span class="updated-label">Обновлено только что</span><button class="primary" data-action="new-project">＋ Новый проект</button></div></div>
 <section class="metric-grid">
  <button class="metric-card" data-nav-direct="Projects"><div class="metric-top"><span>Всего проектов</span><span class="metric-icon">▦</span></div><strong>${projects.length}</strong><small>${live} опубликовано · ${draft} черновиков</small><div class="metric-delta positive">↗ ${projects.length?Math.round(live/projects.length*100):0}% активных</div></button>
  <button class="metric-card" data-nav-direct="Clients & Leads"><div class="metric-top"><span>Заявки</span><span class="metric-icon">♧</span></div><strong>${leads}</strong><small>Со всех клиентских каналов</small><div class="metric-delta positive">↗ ${avgLeads} в среднем на проект</div></button>
  <button class="metric-card" data-nav-direct="Clients & Leads"><div class="metric-top"><span>Бронирования</span><span class="metric-icon">□</span></div><strong>${bookings}</strong><small>Все проекты студии</small><div class="metric-delta">Заказы и записи</div></button>
  <button class="metric-card" data-nav-direct="Economics"><div class="metric-top"><span>Оборот заказов</span><span class="metric-icon">€</span></div><strong>${revenue.toFixed(2)} €</strong><small>${ordersCount} заказов без отмен</small><div class="metric-delta positive">↗ Реальные данные API</div></button>
 </section>
 <section class="dashboard-card performance-card"><div class="dashboard-card-head"><div><h2>Производительность проектов</h2><p>Сравните активность всех клиентских проектов.</p></div><button class="ghost-btn" data-nav-direct="Analytics">Открыть аналитику →</button></div>
  <div class="performance-list">${projects.slice(0,8).map((p,i)=>`<button class="performance-row" data-open-project="${p.id}"><span class="performance-logo project-tone-${i%5}">${htmlEsc((p.name||"P").slice(0,1).toUpperCase())}</span><span class="performance-name"><strong>${htmlEsc(p.name)}</strong><small>${htmlEsc(p.industry)} · ${htmlEsc(p.type)}</small></span><span class="performance-value"><b>${p.leads}</b><small>заявок</small></span><span class="performance-value"><b>${p.status==="Live"?"LIVE":"DRAFT"}</b><small>статус</small></span><span class="performance-arrow">→</span></button>`).join("")||'<div class="empty-state">Создайте первый проект.</div>'}</div>
 </section>
 <section class="dashboard-bottom">
  <section class="dashboard-card"><div class="dashboard-card-head centered"><div><h2>Быстрые действия</h2><p>Основные операции студии</p></div></div><div class="dashboard-actions-list"><button data-action="new-project">＋ Создать новый проект</button><button data-nav-direct="Templates">✦ Выбрать шаблон</button><button data-nav-direct="Clients & Leads">♧ Открыть Inbox</button><button data-nav-direct="Branding">⚙ Настроить бренд</button></div></section>
  <section class="dashboard-card"><div class="dashboard-card-head centered"><div><h2>Статус</h2><p>Текущее состояние рабочего пространства</p></div></div><div class="status-list"><div><span><i class="status-dot green"></i>Опубликованные проекты</span><b>${live}</b></div><div><span><i class="status-dot yellow"></i>Черновики</span><b>${draft}</b></div><div><span><i class="status-dot blue"></i>Новые заявки</span><b>${crm.leads.filter((x:any)=>x.status==="new").length}</b></div><div><span><i class="status-dot purple"></i>Заказы</span><b>${ordersCount}</b></div></div></section>
 </section>
 </div>`;
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
   <section class="settings-card" id="settings-telegram"><div class="settings-card-head"><div><h3>Telegram и Mini App</h3><p>Публикация клиентского мини‑приложения и подключение бота.</p></div><span class="badge ${telegramStatus.enabled?"live":""}">${telegramStatus.enabled?"Подключено":"Не подключено"}</span></div><div class="security-grid"><div><span>Статус бота</span><strong>${telegramStatus.enabled?"Активен":"Ожидает токен"}</strong></div><div><span>Mini App</span><strong>${telegramStatus.enabled&&telegramStatus.miniAppUrl?"Готов":"Не настроен"}</strong></div></div><div class="settings-inline-actions">${telegramStatus.miniAppUrl?'<button class="secondary" data-action="open-telegram-mini">Открыть в Telegram</button>':""}${telegramStatus.projectBotUrl?'<button class="secondary" data-action="open-telegram-project">Ссылка клиента</button>':""}<button class="primary" data-action="configure-telegram">Подключить Telegram</button><button class="secondary" data-action="refresh-telegram">Проверить подключение</button></div></section><section class="settings-card" id="settings-security"><div class="settings-card-head"><div><h3>Безопасность и доступ</h3><p>Контроль текущей сессии и подключения API.</p></div></div>
    <div class="security-grid"><div><span>Сессия</span><strong>${session?"Активна":"Демо-сессия"}</strong></div><div><span>Аутентификация</span><strong>${session?.user?"Настроена":"Демо-режим"}</strong></div><div><span>API доступ</span><strong>${API_BASE?"Подключён":"Не настроен"}</strong></div><div><span>Тариф</span><strong>${billing?.plan||"Pro"}</strong></div></div>
   </section>
   <div class="settings-actions"><button class="secondary" data-action="reset-settings">Сбросить стиль</button><button class="primary" data-action="save-settings">Сохранить настройки</button></div>
  </div>
 </div>`;
}
 if(section==="Analytics") return analyticsView();
 if(section==="Billing") return invoicesView();
 if(section==="Templates") return templateView();
 if(section==="Settings") return settingsView();
 if(section==="Clients") return crmView("Clients",crm.clients.map(x=>[x.name,x.email||"Нет email",x.projectIds?.length?x.projectIds.length+" проекта":"Без проектов",x.id]));
 if(section==="Leads") return crmView("Leads",crm.leads.map(x=>[x.name,x.email||x.phone||"No contact",x.status||"new"]));
 if(section==="Bookings") return crmView("Bookings",crm.bookings.map(x=>[x.customerName,x.startAt?new Date(x.startAt).toLocaleString():"No time",x.status||"pending"]));
 if(section==="Catalog") return catalogView();
 if(section==="Orders") return ordersView();
 const list=rows[section]||[];
 const sectionCopy:Record<string,string>={
  Projects:"Управление всеми клиентскими проектами и их состоянием.",
  Clients:"Клиенты студии и связанные с ними проекты.",
  Leads:"Все входящие заявки из сайтов и Mini Apps.",
  Bookings:"Записи клиентов, статусы и предстоящие визиты.",
  Catalog:"Каталог услуг и товаров, который используется в сайтах и Mini Apps.",
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
 const sectionActions:Record<string,string>={
  Projects:"Создать проект",
  Websites:"Создать сайт",
  "Mini Apps":"Создать Mini App",
  Clients:"Добавить клиента",
  Leads:"Обновить лиды",
  Bookings:"Обновить записи",
  Templates:"Открыть шаблоны",
  Domains:"Подключить домен"
 };
 return `<div class="eyebrow">03 / Workspace</div><div class="workspace-head"><div><h2>${section}</h2><p class="hero-copy">${sectionCopy[section]||"Рабочий раздел TorclixGroup."}</p></div><button class="primary" data-action="new-project">+ Новый проект</button></div><section class="card table-card"><div class="card-head"><div class="card-title">${section}</div><div class="card-meta">${list.length} ${list.length===1?"проект":"проектов"}</div></div>${list.length?list.map((r,idx)=>{const p=projectRows?projects.find(x=>x.name===r[0]):null;return `<div class="workspace-row ${p?"clickable-row":""}" ${p?`data-project="${p.id}"`:""}><div class="project-name">${r[0]}</div><div class="project-type">${r[1]}</div><span class="badge ${/Live|Published|Active|Connected|Current|Ready/.test(r[2])?"live":""}">${r[2]}</span>${p?`<button type="button" class="row-action" data-project="${p.id}" aria-label="Открыть">→</button>`:""}</div>`}).join(""):`<div class="inspector-note">${section==="Websites"?"Здесь появятся созданные сайты. Создайте первый проект типа «Сайт» или «Сайт + Mini App».":section==="Mini Apps"?"Здесь появятся созданные Mini Apps. Создайте первый проект типа «Mini App» или «Сайт + Mini App».":"Пока нет данных."}</div>`}</section>`;

}

function catalogView(){
 const projectOptions=projects.map(p=>'<option value="'+htmlEsc(p.id)+'">'+htmlEsc(p.name)+'</option>').join("");
 const items=catalogItems.filter(x=>!editingCatalogId||x.id===editingCatalogId);
 const rows=catalogItems.map(x=>'<div class="workspace-row"><div class="project-name">'+htmlEsc(x.name)+'</div><div class="project-type">'+htmlEsc(projects.find(p=>p.id===x.projectId)?.name||"Проект")+' · '+(x.itemType==="product"?"Товар":"Услуга")+(x.category?" · "+htmlEsc(x.category):"")+'</div><span class="badge '+(x.status==="active"?"live":"")+'">'+htmlEsc(x.price||"0")+" "+htmlEsc(x.currency||"EUR")+'</span><button type="button" class="row-action" data-catalog-edit="'+htmlEsc(x.id)+'">→</button></div>').join("");
 return '<div class="eyebrow">03 / Business OS</div><div class="workspace-head"><div><h2>Каталог</h2><p class="hero-copy">Реальные товары и услуги клиентских проектов. Эти позиции станут основой для заказов и оплат.</p></div><button class="primary" data-action="catalog-new">+ Добавить позицию</button></div>'+
 '<section class="card table-card"><div class="card-head"><div class="card-title">Позиции каталога</div><div class="card-meta">'+catalogItems.length+'</div></div>'+(rows||'<div class="inspector-note">Каталог пока пуст. Добавьте первую услугу или товар.</div>')+'</section>'+
 (catalogModal?'<div class="modal-backdrop" data-close="catalog-modal"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Business OS</div><div class="modal-title">'+(editingCatalogId?"Редактировать позицию":"Новая позиция")+'</div></div><button class="close" data-close="catalog-modal">×</button></div><div class="modal-body"><div class="settings-grid"><label class="settings-field"><span>Проект</span><select id="catalog-project">'+projectOptions+'</select></label><label class="settings-field"><span>Название</span><input id="catalog-name" placeholder="Например, Комплексная мойка"/></label><label class="settings-field"><span>Тип</span><select id="catalog-type"><option value="service">Услуга</option><option value="product">Товар</option></select></label><label class="settings-field"><span>Категория</span><input id="catalog-category" placeholder="Основные"/></label><label class="settings-field"><span>Цена</span><input id="catalog-price" type="number" min="0" step="0.01" placeholder="0"/></label><label class="settings-field"><span>Валюта</span><select id="catalog-currency"><option>EUR</option><option>USD</option><option>RUB</option><option>GBP</option></select></label><label class="settings-field"><span>Остаток</span><input id="catalog-stock" type="number" min="0" step="1" placeholder="Не ограничивать"/></label><label class="settings-field"><span>Статус</span><select id="catalog-status"><option value="active">Активна</option><option value="draft">Черновик</option></select></label></div><label class="settings-field"><span>Описание</span><textarea id="catalog-description" placeholder="Короткое описание для клиента"></textarea></label></div><div class="modal-foot"><button class="secondary" data-close="catalog-modal">Отмена</button><button class="primary" data-action="catalog-save">Сохранить</button></div></div></div>':"")+'</div>';
}

function analyticsView(){
 const a=analytics||{projects:{total:0,live:0,draft:0},leads:{total:0,status:{}},bookings:{total:0,status:{}},clients:{total:0},byProject:[]};
 const traffic=(a as any).traffic||{visitors:0,pageviews:0,conversions:0};
 return `<div class="dashboard-page"><div class="workspace-head reference-section-head"><div><div class="eyebrow">TORCLIXGROUP / ANALYTICS</div><h2>Аналитика</h2><p class="hero-copy">Единая картина по всем клиентским проектам.</p></div><button class="primary" data-action="analytics-refresh">↻ Обновить</button></div>
 <div class="metric-grid"><div class="metric-card"><div class="metric-top"><span>Посетители</span><span class="metric-icon">◉</span></div><strong>${traffic.visitors||0}</strong><small>За последние 30 дней</small><div class="metric-delta positive">↗ Живые данные</div></div><div class="metric-card"><div class="metric-top"><span>Просмотры</span><span class="metric-icon">◌</span></div><strong>${traffic.pageviews||0}</strong><small>Страницы сайтов</small></div><div class="metric-card"><div class="metric-top"><span>Конверсии</span><span class="metric-icon">↗</span></div><strong>${traffic.conversions||0}</strong><small>Заявки и ключевые действия</small></div><div class="metric-card"><div class="metric-top"><span>Клиенты</span><span class="metric-icon">♧</span></div><strong>${a.clients.total}</strong><small>В CRM студии</small></div></div>
 <section class="dashboard-card analytics-performance"><div class="dashboard-card-head"><div><h2>Производительность платформы</h2><p>Сводка по всем проектам TorclixGroup.</p></div></div><div class="analytics-bars"><div class="analytics-bar-row"><span>Проекты</span><div><i style="width:${Math.min(100,a.projects.total*10)}%"></i></div><b>${a.projects.total}</b></div><div class="analytics-bar-row"><span>Лиды</span><div><i style="width:${Math.min(100,a.leads.total*5)}%"></i></div><b>${a.leads.total}</b></div><div class="analytics-bar-row"><span>Бронирования</span><div><i style="width:${Math.min(100,a.bookings.total*8)}%"></i></div><b>${a.bookings.total}</b></div></div></section>
 <section class="dashboard-bottom"><section class="dashboard-card"><div class="dashboard-card-head"><div><h2>Лиды по статусам</h2><p>Воронка продаж</p></div></div><div class="status-list">${Object.entries(a.leads.status||{}).map(([k,v])=>`<div><span>${htmlEsc(k)}</span><b>${htmlEsc(String(v))}</b></div>`).join("")||'<div class="empty-state">Пока нет лидов.</div>'}</div></section><section class="dashboard-card"><div class="dashboard-card-head"><div><h2>Проекты</h2><p>Результаты по клиентам</p></div></div><div class="performance-list">${(a.byProject||[]).slice(0,6).map((p:any)=>`<div class="performance-row"><span class="performance-logo project-tone-0">${htmlEsc((p.name||"P").slice(0,1))}</span><span class="performance-name"><strong>${htmlEsc(p.name)}</strong><small>${p.leads} лидов · ${p.bookings} бронирований</small></span><span class="performance-arrow">→</span></div>`).join("")||'<div class="empty-state">Нет данных.</div>'}</div></section></section>
 </div>`;
}

function inboxView(){
 const leads=crm.leads||[], bookings=crm.bookings||[], os=orders||[];
 const total=leads.length+bookings.length+os.length;
 const cards=[
  ["Всего обращений",total,"Все входящие"],
  ["Новые заявки",leads.filter((x:any)=>x.status==="new").length,"Требуют внимания"],
  ["Бронирования",bookings.length,"Записи клиентов"],
  ["Заказы",os.length,"Каталог и Mini App"]
 ];
 return `<div class="dashboard-page"><div class="workspace-head reference-section-head"><div><div class="eyebrow">TORCLIXGROUP / INBOX</div><h2>Клиенты и заявки</h2><p class="hero-copy">Все обращения, бронирования и заказы из клиентских проектов.</p></div><button class="primary" data-action="crm-refresh">↻ Обновить</button></div>
 <div class="metric-grid inbox-metrics">${cards.map((x,i)=>`<div class="metric-card"><div class="metric-top"><span>${x[0]}</span><span class="metric-icon">${["♧","!","□","€"][i]}</span></div><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("")}</div>
 <section class="dashboard-card inbox-panel"><div class="dashboard-card-head"><div><h2>Входящие заявки</h2><p>Последние обращения клиентов.</p></div><span class="section-count">${leads.length}</span></div>
 <div class="inbox-list">${leads.map((x:any)=>`<div class="inbox-row"><span class="client-avatar">${htmlEsc((x.name||"К").slice(0,1).toUpperCase())}</span><div class="inbox-main"><strong>${htmlEsc(x.name||"Новая заявка")}</strong><small>${htmlEsc(x.phone||x.email||"Без контакта")} · ${htmlEsc(projects.find(p=>p.id===x.projectId)?.name||"Проект")}</small></div><span class="badge ${x.status==="new"?"live":""}">${htmlEsc(x.status||"new")}</span><select data-inbox-lead="${htmlEsc(x.id)}"><option value="new" ${x.status==="new"?"selected":""}>Новая</option><option value="contacted" ${x.status==="contacted"?"selected":""}>Связались</option><option value="qualified" ${x.status==="qualified"?"selected":""}>Квалифицирована</option><option value="won" ${x.status==="won"?"selected":""}>Успешна</option><option value="lost" ${x.status==="lost"?"selected":""}>Закрыта</option></select></div>`).join("")||'<div class="empty-state">Новых заявок пока нет.</div>'}</div></section>
 <section class="dashboard-bottom inbox-secondary"><section class="dashboard-card"><div class="dashboard-card-head"><div><h2>Бронирования</h2><p>Последние записи.</p></div><span class="section-count">${bookings.length}</span></div><div class="inbox-list compact">${bookings.slice(0,8).map((x:any)=>`<div class="inbox-row"><span class="client-avatar soft">${htmlEsc((x.customerName||"Б").slice(0,1).toUpperCase())}</span><div class="inbox-main"><strong>${htmlEsc(x.customerName||"Бронирование")}</strong><small>${htmlEsc(x.service||"Услуга")} · ${htmlEsc(x.startAt||"")}</small></div><span class="badge">${htmlEsc(x.status||"pending")}</span></div>`).join("")||'<div class="empty-state">Нет бронирований.</div>'}</div></section>
 <section class="dashboard-card"><div class="dashboard-card-head"><div><h2>Заказы</h2><p>Последние покупки.</p></div><span class="section-count">${os.length}</span></div><div class="inbox-list compact">${os.slice(0,8).map((x:any)=>`<div class="inbox-row"><span class="client-avatar gold">€</span><div class="inbox-main"><strong>Заказ #${htmlEsc(String(x.id).slice(0,8))}</strong><small>${htmlEsc(x.customerName||"Клиент")} · ${htmlEsc(String(x.total))} ${htmlEsc(x.currency||"EUR")}</small></div><span class="badge ${x.status==="paid"||x.status==="completed"?"live":""}">${htmlEsc(x.status||"pending")}</span></div>`).join("")||'<div class="empty-state">Нет заказов.</div>'}</div></section></section>
 </div>`;
}

