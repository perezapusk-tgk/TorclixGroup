import "./styles.css";

type Project = { id:string; name:string; slug?:string; url:string; type:string; status:"Live"|"Draft"; leads:number; industry:string };
type Block = { id:string; type:string; title:string; body:string };
type Page = { id:string; name:string; blocks:Block[] };
type SiteDoc = { projectId:string; pages:Page[]; activePage:string; accent:string; miniApp?:{modules:string[];navigation?:string[];theme?:{accent:string;mode:"light"|"dark"}}; };

const nav = [
  ["⌂","Обзор","Overview"],["▦","Проекты","Projects"],["✦","Шаблоны","Templates"],["♙","Клиенты и заявки","Clients & Leads"],["↗","Аналитика","Analytics"],["⌁","Аудит","Audit"],["◌","Биллинг","Billing"],["▣","Портал клиента","Client Portal"],["✦","Брендинг","Branding"],["▤","Счета","Invoices"],["◇","Экономика","Economics"]
] as const;

const seed:Project[]=[
 {id:"p1",name:"Maison Noire",url:"maisonnoire.studio",type:"Website + Mini App",status:"Live",leads:128,industry:"Restaurant"},
 {id:"p2",name:"Forma Fitness",url:"forma.fit",type:"Mini App",status:"Live",leads:74,industry:"Fitness"},
 {id:"p3",name:"Northline Clinic",url:"northline.health",type:"Website",status:"Draft",leads:31,industry:"Medical"},
 {id:"p4",name:"Atelier 24",url:"atelier24.com",type:"Website",status:"Live",leads:96,industry:"Services"}
];
const templates=[["Restaurant / Noir","Website + Mini App","Меню · столики · заказы · лояльность","restaurant"],["Beauty / Atelier","Website + Mini App","Услуги · мастера · календарь · запись","beauty"],["Fitness / Forma","Mini App","Занятия · тренеры · абонементы","fitness"],["Medical / Northline","Website","Услуги · врачи · запись","medical"],["Real Estate / North","Website","Объекты · агенты · заявки","realty"],["Services / Studio","Website","Услуги · специалисты · заявки","services"],["Car Wash / Wash","Website + Mini App","Услуги · прайс · запись","wash"],["Education / Class","Website + Mini App","Курсы · занятия · запись","education"],["Retail / Store","Website + Mini App","Каталог · корзина · заказы","retail"]];

let projects:Project[] = JSON.parse(localStorage.getItem("tg-projects")||"null")||[];
let active="Overview", editorProject:string|null=null, modal=false, selectedType="Website + Mini App", selectedIndustry="wash", wizardStep=1, toast="", editorTab="Design", selectedBlock:string|null=null, projectViewTab="overview", mobileMenu=false, portalToken=new URLSearchParams(location.search).get("portal")||"", portalData:any=null;
type StudioSettings={workspaceName:string;brandName:string;language:string;font:string;currency:string;accent:string;theme:string;density:string;radius:string;animations:boolean;compactNav:boolean;emailNotifications:boolean;leadNotifications:boolean;bookingNotifications:boolean};
const defaultStudioSettings:StudioSettings={workspaceName:"Perezapusk Studio",brandName:"TorclixGroup",language:"ru",font:"Inter",currency:"EUR",accent:"#2f6bea",theme:"light",density:"comfortable",radius:"medium",animations:true,compactNav:false,emailNotifications:true,leadNotifications:true,bookingNotifications:true};
let studioSettings:StudioSettings={...defaultStudioSettings,...(JSON.parse(localStorage.getItem("tg-settings")||"null")||{})};
function htmlEsc(value:any){return String(value??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"} as Record<string,string>)[c]||c)}
function saveSettings(){
  localStorage.setItem("tg-settings",JSON.stringify(studioSettings));
  applyStudioSettings();
  if(API_BASE) void api("/api/settings",{method:"PATCH",body:JSON.stringify(studioSettings)});
}
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

const uiEn:Record<string,string>=Object.fromEntries([
  ...Object.entries(uiRu).map(([en,ru])=>[ru,en]),
  ["Настройки","Settings"],["Центр настроек","Settings center"],["Разделы","Sections"],["Основные","General"],["Внешний вид","Appearance"],["Уведомления","Notifications"],["Безопасность","Security"],
  ["Рабочее пространство","Workspace"],["Основные параметры студии и бренда.","Core studio and brand settings."],["Название рабочего пространства","Workspace name"],["Название бренда","Brand name"],["Язык","Language"],["Валюта оплаты","Billing currency"],["Шрифт","Font"],
  ["Акцентный цвет","Accent color"],["Тема","Theme"],["Тёмная","Dark"],["Светлая","Light"],["Плотность интерфейса","Interface density"],["Комфортная","Comfortable"],["Компактная","Compact"],["Скругление","Corner radius"],["Малое","Small"],["Среднее","Medium"],["Большое","Large"],
  ["Анимации интерфейса","Interface animations"],["Компактная навигация","Compact navigation"],["Сохранить настройки","Save settings"],["Сбросить стиль","Reset style"],["Настройки возвращены к стандартным.","Settings restored to defaults."],["Настройки сохранены.","Settings saved."],
  ["Всё синхронизировано","Everything is synchronized"],["Бренд и внешний вид","Brand and appearance"],["Предпочтения","Preferences"],["Основная кнопка","Primary button"],
  ["Telegram и Mini App","Telegram & Mini App"],["Подключено","Connected"],["Не подключено","Not connected"],["Активен","Active"],["Ожидает токен","Waiting for token"],["Готов","Ready"],["Не настроен","Not configured"],
  ["Безопасность и доступ","Security & access"],["Контроль текущей сессии и подключения API.","Control the current session and API connection."],["Сессия","Session"],["Активна","Active"],["Демо-сессия","Demo session"],["Аутентификация","Authentication"],["Настроена","Configured"],["Демо-режим","Demo mode"],["API доступ","API access"],["Подключён","Connected"],
  ["Уведомления по email","Email notifications"],["Уведомления о новых лидах","New lead notifications"],["Уведомления о бронированиях","Booking notifications"],["Системные сообщения и изменения рабочего пространства","System messages and workspace changes"],["Сообщать о новых заявках клиентов","Notify about new client leads"],["Сообщать о новых и изменённых бронированиях","Notify about new and changed bookings"],
  ["Публикация клиентского мини‑приложения и подключение бота.","Publish the client Mini App and connect the bot."],["Статус бота","Bot status"],["Открыть в Telegram","Open in Telegram"],["Ссылка клиента","Client link"],["Подключить Telegram","Connect Telegram"],["Проверить подключение","Check connection"],
  ["Digital infrastructure","Digital infrastructure"],["Создавайте сайты и Telegram Mini Apps для клиентов быстрее. Управляйте проектами, контентом, лидами и публикацией из одной студии.","Create websites and Telegram Mini Apps for clients faster. Manage projects, content, leads and publishing from one studio."]
]);

// Extended RU -> EN coverage for dynamic Studio screens and actions.
Object.assign(uiEn,{
  "Статус":"Status","Опубликован":"Published","Черновик":"Draft","Заявки":"Leads","Бронирования":"Bookings","Страницы":"Pages",
  "Быстрый запуск":"Quick launch","Редактировать сайт":"Edit website","Настроить Mini App":"Configure Mini App","Открыть заявки":"Open leads",
  "Открыть сайт клиента":"Open client site","Публикация":"Publishing","Проект опубликован и доступен клиентам.":"Project is published and available to clients.",
  "Проект ещё не опубликован.":"The project is not published yet.","Опубликовать изменения":"Publish changes","Опубликовать проект":"Publish project",
  "Заявки и записи":"Leads & bookings","Данные этого проекта из CRM TorclixGroup.":"Data for this project from TorclixGroup CRM.",
  "Лиды":"Leads","Пока нет заявок.":"No leads yet.","Пока нет бронирований.":"No bookings yet.",
  "QR-код проекта":"Project QR code","Откройте клиентский сайт с телефона.":"Open the client site from your phone.","Скопировать ссылку":"Copy link",
  "Настройки проекта":"Project settings","Изменения сохраняются в проекте студии.":"Changes are saved to the studio project.",
  "Название проекта":"Project name","Slug / адрес":"Slug / address","Изменения":"Changes","Тип":"Type","Отрасль":"Industry","Проект ID":"Project ID",
  "Сохранить изменения":"Save changes","Публикация и домен":"Publishing & domain","После сохранения можно сразу открыть клиентский сайт.":"After saving, you can open the client site immediately.",
  "QR-код":"QR code","Конструктор Mini App":"Mini App builder","модулей · Telegram ready":"modules · Telegram ready",
  "Настройки сохраняются в документ проекта и используются опубликованным Mini App.":"Settings are saved to the project document and used by the published Mini App.",
  "Сохранить блок":"Save block","Готово":"Done","Выберите блок в макете, чтобы изменить его содержимое.":"Select a block in the canvas to edit its content.",
  "Заголовок":"Title","Текст":"Text","Новая история клиента начинается здесь.":"A new client story starts here.",
  "Секция":"Section","добавлена.":"added.","Новая страница":"New page","Начните собирать страницу для клиента.":"Start building a page for the client.",
  "Выберите формат":"Choose a project type","Выберите отрасль":"Choose an industry","Назовите проект":"Name your project",
  "Готово к созданию":"Ready to create","Отрасль:":"Industry:","Отмена":"Cancel","Назад":"Back","Продолжить →":"Continue →","Создать проект →":"Create project →",
  "Ресторан и кафе":"Restaurant & cafe","Красота":"Beauty","Фитнес и спорт":"Fitness & sports","Медицина":"Medical","Недвижимость":"Real estate",
  "Услуги":"Services","Автомойка":"Car wash","Обучение":"Education","Магазин":"Retail","Другое":"Other",
  "Меню, столики, доставка":"Menu, tables, delivery","Салоны, мастера, запись":"Salons, specialists, booking","Занятия, тренеры, абонементы":"Classes, trainers, memberships",
  "Клиники, врачи, запись":"Clinics, doctors, booking","Объекты, агенты, заявки":"Properties, agents, leads","Сервисы, специалисты, заявки":"Services, specialists, leads",
  "Услуги, запись, прайс":"Services, booking, pricing","Курсы, занятия, преподаватели":"Courses, classes, instructors","Каталог, корзина, заказы":"Catalog, cart, orders","Сохранить настройки":"Save settings","Настройки проекта сохранены.":"Project settings saved.","Не удалось сохранить проект.":"Could not save the project.",
  "Ссылка скопирована.":"Link copied.","Не удалось скопировать ссылку.":"Could not copy the link.","Обновить":"Refresh","Данные обновлены.":"Data updated.",
  "Аналитика обновлена.":"Analytics refreshed.","Счета обновлены.":"Invoices refreshed.","Календарь обновлён.":"Calendar refreshed.","Сотрудник добавлен.":"Staff member added.",
  "Событие добавлено.":"Event added.","Проверьте дату и время события.":"Check the event date and time.","Не удалось создать событие.":"Could not create the event.",
  "Домен добавлен.":"Domain added.","DNS подтверждён. SSL будет подключён следующим этапом.":"DNS verified. SSL will be connected in the next step.",
  "Проверка не выполнена.":"Verification failed.","TXT-значение скопировано.":"TXT value copied.","Не удалось скопировать TXT.":"Could not copy TXT.",
  "Проект создан. Опубликуйте его из проекта.":"Project created. Publish it from the project.","создан и опубликован. Сайт уже доступен клиенту.":"created and published. The client site is already available.",
  "Mini App опубликован. Можно открыть его по ссылке.":"Mini App published. You can open it using the link.",
  "Не удалось опубликовать Mini App":"Could not publish the Mini App","Не удалось сохранить Mini App":"Could not save the Mini App",
  "Не удалось получить ссылку портала.":"Could not get the portal link.","Ссылка портала скопирована.":"Portal link copied.",
  "Не удалось обновить заявку.":"Could not update the lead.","Статус заявки обновлён.":"Lead status updated.",
  "Не удалось обновить бронирование.":"Could not update the booking.","Статус бронирования обновлён.":"Booking status updated.",
  "Не удалось открыть клиента.":"Could not open the client.","Не удалось открыть проект.":"Could not open the project.",
  "Счета студии и клиентских проектов. Оплата отмечается только после подтверждения провайдером.":"Studio and client project invoices. Payment is marked only after provider confirmation.",
  "Счета":"Invoices","Счетов пока нет.":"No invoices yet.","Новый счёт":"New invoice","Создайте счёт для клиента.":"Create an invoice for a client.",
  "Номер":"Number","Сумма":"Amount","Срок оплаты":"Due date","Примечание":"Note","Услуга или комментарий":"Service or note","Создать счёт":"Create invoice",
  "Оплатить":"Pay","Тариф и оплата":"Plan & billing","В месяц":"Per month","Проекты":"Projects","Валюта оплаты":"Billing currency",
  "Оплата":"Payment","Выберите тариф и перейдите к безопасной оплате. Платёж откроется в Stripe Checkout.":"Choose a plan and continue to secure payment. Payment will open in Stripe Checkout.",
  "Открыть Checkout":"Open Checkout","Экономика":"Economics","Фактические суммы из счетов и заказов.":"Actual amounts from invoices and orders.",
  "Оплачено":"Paid","Заказы":"Orders","Комиссии, налоги и внешние платежные провайдеры не считаются до их подключения.":"Fees, taxes and external payment providers are excluded until connected.",
  "Брендинг":"Branding","White-label настройки студии: имя, цвет и интерфейс.":"White-label studio settings: name, color and interface.",
  "Сохранить":"Save","Система шаблонов":"Template system","Конструктор проекта":"Project builder","Предпросмотр":"Preview","Опубликовать":"Publish",
  "Сайт":"Website","Mini App":"Mini App","Обзор":"Overview","Настройки":"Settings","Открыть Telegram":"Open Telegram","Копировать ссылку":"Copy link"
});

function localizeUI(){
 const dict=studioSettings.language==="en"?uiEn:uiRu;
 const walk=(node:Node)=>{
   node.childNodes.forEach(child=>{
     if(child.nodeType===Node.TEXT_NODE){
       const raw=child.textContent?.trim()||"";
       if(dict[raw]) child.textContent=child.textContent!.replace(raw,dict[raw]);
     } else if(child.nodeType===Node.ELEMENT_NODE) walk(child);
   });
 };
 walk(root);
 root.querySelectorAll<HTMLElement>("[placeholder]").forEach(el=>{const v=el.getAttribute("placeholder")||"";if(dict[v])el.setAttribute("placeholder",dict[v]);});
 root.querySelectorAll<HTMLElement>("[title]").forEach(el=>{const v=el.getAttribute("title")||"";if(dict[v])el.setAttribute("title",dict[v]);});
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
const AUTH0_DOMAIN=String(import.meta.env.VITE_AUTH0_DOMAIN||"").trim();
const AUTH0_CLIENT_ID=String(import.meta.env.VITE_AUTH0_CLIENT_ID||"").trim();
const AUTH0_AUDIENCE=String(import.meta.env.VITE_AUTH0_AUDIENCE||"https://torclixgroup-api").trim();
const AUTH0_TOKEN_KEY="tg-auth0-token";
let auth0Token=localStorage.getItem(AUTH0_TOKEN_KEY)||"";
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
async function hydratePublicPortal(){
 if(!portalToken||!API_BASE)return;
 const result=await api("/public/client-portal/"+encodeURIComponent(portalToken));
 portalData=result?.data||null;
 if(portalData) render();
}
function publicPortalView(){
 const p=portalData;
 if(!p) return "<main style=\"min-height:100vh;display:grid;place-items:center;padding:24px;background:#080808;color:#fff\"><section class=\"card\" style=\"max-width:720px;width:100%;padding:32px\"><div class=\"eyebrow\">TORCLIXGROUP / CLIENT PORTAL</div><h1>Портал клиента</h1><p class=\"hero-copy\">Портал не найден или ссылка устарела.</p></section></main>";
 const labels:any={draft:"Черновик",review:"На проверке",approved:"Одобрено",changes_requested:"Нужны правки"};
 return "<main style=\"min-height:100vh;padding:40px 20px;background:#080808;color:#f5f5f5\"><section class=\"card\" style=\"max-width:820px;margin:0 auto;padding:32px\"><div class=\"eyebrow\">TORCLIXGROUP / CLIENT PORTAL</div><h1>"+htmlEsc(p.name)+"</h1><span class=\"badge "+(p.status==="approved"?"live":"")+"\">"+htmlEsc(labels[p.status]||p.status)+"</span><div style=\"margin:24px 0;color:#aaa;line-height:1.7;white-space:pre-wrap\">"+htmlEsc(p.note||"Проект готов к просмотру.")+"</div><div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-top:22px\"><a class=\"primary\" style=\"display:inline-block;text-decoration:none\" href=\""+htmlEsc(API_BASE+"/published/"+encodeURIComponent(p.id))+"\">Открыть сайт проекта</a>"+(p.status!=="approved"?"<button class=\"secondary\" data-portal-status=\"approved\">Одобрить проект</button>":"")+"<button class=\"secondary\" data-portal-status=\"changes_requested\">Запросить правки</button></div><div id=\"portal-action-status\" style=\"margin-top:14px;color:#aaa\"></div></section></main>";
}
async function hydrateTeamCalendar(){
 if(!API_BASE) return;
 const [staffResult,calendarResult]=await Promise.all([api("/api/staff"),api("/api/calendar/events")]);
 (window as any).__tgStaff=Array.isArray(staffResult?.data)?staffResult.data:[];
 (window as any).__tgCalendar=Array.isArray(calendarResult?.data)?calendarResult.data:[];
 if(active==="Команда и календарь") render();
}

async function hydrateTelegram(){try{const query=editorProject?"?projectId="+encodeURIComponent(editorProject):"";const result=await api("/api/telegram/status"+query);telegramStatus={...telegramStatus,...(result?.data||{})};}catch{}}

async function hydrateSession(){
 if(!API_BASE) return;
 const remote=await api("/api/session");
 if(remote?.data){session=remote.data; render();}
}
async function hydrateStudioSettings(){
 if(!API_BASE) return;
 const remote=await api("/api/settings");
 if(remote?.data&&typeof remote.data==="object"){
   const keys=Object.keys(remote.data);
   if(keys.length){
     studioSettings={...defaultStudioSettings,...remote.data};
     localStorage.setItem("tg-settings",JSON.stringify(studioSettings));
     applyStudioSettings();
     render();
   }else{
     const local=JSON.parse(localStorage.getItem("tg-settings")||"null");
     if(local&&typeof local==="object"&&Object.keys(local).length) await api("/api/settings",{method:"PATCH",body:JSON.stringify({...defaultStudioSettings,...local})});
   }
 }
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
    slug:p.slug,
    url:publicSiteUrl(p.id),
    type:p.type==="website_mini_app"?"Website + Mini App":p.type==="mini_app"?"Mini App":"Website",
    status:p.status==="active"?"Live":"Draft",
    leads:0,
    industry:String(p.industry||"Services").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase()),clientPortal:{status:p.client_portal_status||"draft",note:p.client_portal_note||"",updatedAt:p.client_portal_updated_at||null}
  }));
  const localById=new Map(projects.map(p=>[p.id,p]));
  projects=mapped.map(p=>({...localById.get(p.id),...p}));
  for(const p of projects) if(localById.has(p.id)===false) localStorage.removeItem("tg-doc-"+p.id);
  saveProjects();
  hydrated=true;
  if(!editorProject) render();
}
async function hydrateClientPortal(id:string){ const remote=await api('/api/projects/'+id+'/client-portal'); if(remote?.data){projects=projects.map((p:any)=>p.id===id?{...p,clientPortal:remote.data}:p);saveProjects();} }
async function hydrateDocument(id:string){
  const remote=await api("/api/projects/"+id+"/document");
  if(remote?.data){
    doc=remote.data as SiteDoc;
    miniModules=Array.isArray(doc.miniApp?.modules)&&doc.miniApp.modules.length?doc.miniApp.modules:["home","catalog","booking","profile","notifications"];
    saveDoc();
  }
}

function base64Url(buffer:ArrayBuffer){return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
async function sha256(value:string){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));}
async function beginAuth0Login(){
 if(!AUTH0_DOMAIN||!AUTH0_CLIENT_ID){notify("Auth0 ещё не настроен.");return;}
 const verifier=base64Url(crypto.getRandomValues(new Uint8Array(32)).buffer);
 const challenge=base64Url(await sha256(verifier));
 sessionStorage.setItem("tg-auth0-verifier",verifier);
 const redirect=window.location.origin+"/callback";
 const params=new URLSearchParams({response_type:"code",client_id:AUTH0_CLIENT_ID,redirect_uri:redirect,scope:"openid profile email",audience:AUTH0_AUDIENCE,code_challenge:challenge,code_challenge_method:"S256"});
 window.location.assign("https://"+AUTH0_DOMAIN+"/authorize?"+params.toString());
}
async function finishAuth0Login(){
 if(window.location.pathname!=="/callback") return false;
 const query=new URLSearchParams(window.location.search);
 const authError=query.get("error");
 const authErrorDescription=query.get("error_description");
 if(authError){
  sessionStorage.removeItem("tg-auth0-verifier");
  history.replaceState({},document.title,"/");
  notify(authErrorDescription||authError||"Ошибка входа через Auth0");
  return false;
 }
 const code=query.get("code");
 const verifier=sessionStorage.getItem("tg-auth0-verifier")||"";
 if(!code||!verifier) return false;
 try{
  const response=await fetch("https://"+AUTH0_DOMAIN+"/oauth/token",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({grant_type:"authorization_code",client_id:AUTH0_CLIENT_ID,code,code_verifier:verifier,redirect_uri:window.location.origin+"/callback"})});
  const payload=await response.json();
  if(!response.ok||!payload.access_token) throw new Error(payload.error_description||payload.error||"Не удалось выполнить вход");
  auth0Token=payload.access_token;localStorage.setItem(AUTH0_TOKEN_KEY,auth0Token);sessionStorage.removeItem("tg-auth0-verifier");
  history.replaceState({},document.title,"/");
  return true;
 }catch(error){sessionStorage.removeItem("tg-auth0-verifier");history.replaceState({},document.title,"/");notify(error instanceof Error?error.message:"Ошибка входа");return false;}
}
function logoutAuth0(){auth0Token="";localStorage.removeItem(AUTH0_TOKEN_KEY);session=null;render();}
async function api(path:string,options:RequestInit={}){
  if(!API_BASE) return {error:"API URL не настроен"};
  try{
    const response=await fetch(API_BASE+path,{...options,headers:{"content-type":"application/json",...(DEMO_AUTH?{"x-torclix-user":"demo"}:{}),...(TRIAL_AUTH&&!auth0Token?{"x-torclix-trial":trialToken}:{}),...(auth0Token?{authorization:"Bearer "+auth0Token}:{}),...(options.headers||{})}});
    const payload=await response.json().catch(()=>({}));
    if(response.status===401&&auth0Token){
      auth0Token="";
      localStorage.removeItem(AUTH0_TOKEN_KEY);
      session=null;
      if(!portalToken) notify("Сессия истекла. Войдите снова.");
      return {error:String(payload?.error||"Сессия истекла"),status:401,authExpired:true};
    }
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
 if(portalToken){root.innerHTML=publicPortalView();return;}

 const project=projects.find(p=>p.id===editorProject);
 root.innerHTML=`
 <div class="app"><div class="mobile-overlay ${mobileMenu?"open":""}" data-action="mobile-close"></div><aside class="sidebar ${mobileMenu?"mobile-open":""}">
  <div class="brand"><div class="brand-mark">T</div><div><div class="brand-name">${htmlEsc(studioSettings.brandName||"TorclixGroup").toUpperCase()}</div><span class="brand-sub">Studio OS / 02</span></div></div>
  <nav><div class="nav-label">Workspace</div>${nav.map(([icon,label,key])=>`<button class="nav-item ${active===key&&!editorProject?"active":""}" data-nav="${key}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("")}</nav>
  <div class="sidebar-bottom"><div class="workspace"><div class="avatar">PG</div><div><div class="workspace-name">${htmlEsc(studioSettings.workspaceName||session?.organization?.name||"Perezapusk Studio")}</div><div class="workspace-role">${session?.user?.name||"Studio Owner"} · ${session?.organization?.plan||"Pro"}</div></div></div></div>
 </aside>
 <main class="main"><header class="topbar"><div class="topbar-left"><button class="icon-btn mobile-menu-toggle" aria-label="Меню" data-action="mobile-menu">☰</button><div class="top-logo"><span class="top-logo-mark">T</span><span><b>TorclixGroup</b><small>Studio OS</small></span></div></div><div class="top-mode"><span class="mode-icon">▦</span><span>Studio</span><strong>Активен</strong><span class="mode-arrow">⌄</span></div><div class="top-actions">${auth0Token?`<button class="secondary auth-user" data-action="logout">Выйти</button>`:`<button class="secondary auth-user" data-action="login">Войти</button>`}<button class="icon-btn" data-action="back" aria-label="Назад">←</button><button class="icon-btn top-search" aria-label="Поиск">⌕</button><button class="icon-btn" aria-label="Уведомления">♧</button><div class="avatar">PG</div></div></header>
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
      <label class="settings-field"><span>Название рабочего пространства</span><input value="${htmlEsc(studioSettings.workspaceName||session?.organization?.name||"Perezapusk Studio")}" data-setting="workspaceName"/></label>
      <label class="settings-field"><span>Название бренда</span><input value="${htmlEsc(studioSettings.brandName||"TorclixGroup")}" data-setting="brandName"/></label>
      <label class="settings-field"><span>Язык</span><select data-setting="language"><option value="ru" ${s.language==="ru"?"selected":""}>Русский</option><option value="en" ${s.language==="en"?"selected":""}>English</option></select></label>
      <label class="settings-field"><span>Валюта оплаты</span><select data-setting="currency"><option value="EUR" ${s.currency==="EUR"?"selected":""}>€ EUR</option><option value="USD" ${s.currency==="USD"?"selected":""}>$ USD</option><option value="RUB" ${s.currency==="RUB"?"selected":""}>₽ RUB</option></select></label><label class="settings-field"><span>Шрифт</span><select data-setting="font"><option >Inter</option><option >Manrope</option><option >system-ui</option><option >Arial</option></select></label>
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
 const statusRows=(obj:any)=>Object.entries(obj||{}).map(([k,v])=>`<div class="workspace-row"><div class="project-name">${htmlEsc(k)}</div><div class="project-type">Записей</div><span class="badge live">${htmlEsc(String(v))}</span></div>`).join("");
 return `<div class="eyebrow">03 / Business OS</div><div class="workspace-head"><div><h2>Аналитика</h2><p class="hero-copy">Единая картина по всем клиентским проектам студии.</p></div><button class="primary" data-action="analytics-refresh">Обновить</button></div>
 <div class="project-kpis"><div class="stat"><div class="stat-label">Проекты</div><div class="stat-value">${a.projects.total}</div><small>${a.projects.live} опубликовано · ${a.projects.draft} черновиков</small></div><div class="stat"><div class="stat-label">Лиды</div><div class="stat-value">${a.leads.total}</div><small>Все источники</small></div><div class="stat"><div class="stat-label">Бронирования</div><div class="stat-value">${a.bookings.total}</div><small>Все проекты</small></div><div class="stat"><div class="stat-label">Клиенты</div><div class="stat-value">${a.clients.total}</div><small>CRM</small></div></div>
 <div class="project-overview-grid"><section class="card table-card"><div class="card-head"><div class="card-title">Лиды по статусам</div></div>${statusRows(a.leads.status)||'<div class="inspector-note">Пока нет лидов.</div>'}</section><section class="card table-card"><div class="card-head"><div class="card-title">Бронирования по статусам</div></div>${statusRows(a.bookings.status)||'<div class="inspector-note">Пока нет бронирований.</div>'}</section></div>
 <section class="card table-card"><div class="card-head"><div class="card-title">Результаты по проектам</div><div class="card-meta">${a.byProject.length}</div></div>${a.byProject.length?a.byProject.map((p:any)=>`<div class="workspace-row"><div class="project-name">${htmlEsc(p.name)}</div><div class="project-type">${htmlEsc(String(p.leads))} лидов · ${htmlEsc(String(p.bookings))} бронирований</div><span class="badge live">Проект</span></div>`).join(""):'<div class="inspector-note">Создайте первый проект, чтобы увидеть аналитику.</div>'}</section>
 <section class="card table-card"><div class="card-head"><div class="card-title">Аудит действий</div><div class="card-meta">${audit.length}</div></div>${audit.length?audit.map((x:any)=>`<div class="workspace-row"><div class="project-name">${htmlEsc(x.action||"action")}</div><div class="project-type">${htmlEsc(x.actorEmail||x.actorId||"Система")} · ${htmlEsc(x.createdAt||"")}</div><span class="badge live">${htmlEsc(x.entityType||"")}</span></div>`).join(""):'<div class="inspector-note">Записей аудита пока нет.</div>'}</section>
 </div>`;
}
function inboxView(){
 const leads=crm.leads||[], bookings=crm.bookings||[], os=orders||[];
 const total=leads.length+bookings.length+os.length;
 const leadRows=leads.map((x:any)=>"<div class=\"workspace-row\"><div><div class=\"project-name\">"+htmlEsc(x.name||"Новая заявка")+"</div><div class=\"project-type\">"+htmlEsc(x.phone||x.email||"Без контакта")+" · "+htmlEsc(projects.find(p=>p.id===x.projectId)?.name||"Проект")+"</div></div><span class=\"badge "+(x.status==="new"?"live":"")+"\">"+htmlEsc(x.status||"new")+"</span><select data-inbox-lead=\""+htmlEsc(x.id)+"\"><option value=\"new\" "+(x.status==="new"?"selected":"")+">Новая</option><option value=\"contacted\" "+(x.status==="contacted"?"selected":"")+">Связались</option><option value=\"qualified\" "+(x.status==="qualified"?"selected":"")+">Квалифицирована</option><option value=\"won\" "+(x.status==="won"?"selected":"")+">Успешна</option><option value=\"lost\" "+(x.status==="lost"?"selected":"")+">Закрыта</option></select></div>").join("")||"<div class=\"inspector-note\">Новых заявок пока нет. Отправьте заявку с клиентского сайта или Mini App.</div>";
 const bookingRows=bookings.map((x:any)=>"<div class=\"workspace-row\"><div><div class=\"project-name\">"+htmlEsc(x.customerName||"Бронирование")+"</div><div class=\"project-type\">"+htmlEsc(x.service||"Услуга")+" · "+htmlEsc(x.startAt||"")+"</div></div><span class=\"badge\">"+htmlEsc(x.status||"pending")+"</span><select data-inbox-booking=\""+htmlEsc(x.id)+"\"><option value=\"pending\" "+(x.status==="pending"?"selected":"")+">Ожидает</option><option value=\"confirmed\" "+(x.status==="confirmed"?"selected":"")+">Подтверждено</option><option value=\"completed\" "+(x.status==="completed"?"selected":"")+">Завершено</option><option value=\"cancelled\" "+(x.status==="cancelled"?"selected":"")+">Отменено</option></select></div>").join("")||"<div class=\"inspector-note\">Бронирований пока нет.</div>";
 const orderRows=os.map((x:any)=>"<div class=\"workspace-row\"><div><div class=\"project-name\">Заказ #"+htmlEsc(String(x.id).slice(0,8))+" · "+htmlEsc(x.customerName||"Клиент")+"</div><div class=\"project-type\">"+htmlEsc(projects.find(p=>p.id===x.projectId)?.name||"Проект")+" · "+htmlEsc(String(x.total))+" "+htmlEsc(x.currency||"EUR")+"</div></div><span class=\"badge "+(x.status==="paid"||x.status==="completed"?"live":"")+"\">"+htmlEsc(x.status||"pending")+"</span><select data-order-status=\""+htmlEsc(x.id)+"\"><option value=\"pending\" "+(x.status==="pending"?"selected":"")+">Ожидает</option><option value=\"paid\" "+(x.status==="paid"?"selected":"")+">Оплачен</option><option value=\"processing\" "+(x.status==="processing"?"selected":"")+">В работе</option><option value=\"completed\" "+(x.status==="completed"?"selected":"")+">Завершён</option><option value=\"cancelled\" "+(x.status==="cancelled"?"selected":"")+">Отменён</option><option value=\"refunded\" "+(x.status==="refunded"?"selected":"")+">Возврат</option></select></div>").join("")||"<div class=\"inspector-note\">Заказов пока нет.</div>";
 return "<div class=\"eyebrow\">03 / Inbox</div><div class=\"workspace-head\"><div><h2>Inbox</h2><p class=\"hero-copy\">Единый экран продаж: заявки, бронирования и заказы со всех клиентских каналов.</p></div><button class=\"primary\" data-action=\"inbox-refresh\">Обновить</button></div><div class=\"project-kpis\"><div class=\"stat\"><div class=\"stat-label\">Всего обращений</div><div class=\"stat-value\">"+total+"</div></div><div class=\"stat\"><div class=\"stat-label\">Новые заявки</div><div class=\"stat-value\">"+leads.filter(x=>x.status==="new").length+"</div></div><div class=\"stat\"><div class=\"stat-label\">Бронирования</div><div class=\"stat-value\">"+bookings.length+"</div></div><div class=\"stat\"><div class=\"stat-label\">Заказы</div><div class=\"stat-value\">"+os.length+"</div></div></div><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Заявки</div><div class=\"card-meta\">"+leads.length+"</div></div>"+leadRows+"</section><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Бронирования</div><div class=\"card-meta\">"+bookings.length+"</div></div>"+bookingRows+"</section><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Заказы</div><div class=\"card-meta\">"+os.length+"</div></div>"+orderRows+"</section></div>";
}
function crmView(title:string,items:string[][]){ const clientMode=title==="Clients"; return `<div class="eyebrow">03 / Бизнес‑операции</div><div class="workspace-head"><div><h2>${title==="Clients"?"Клиенты":title==="Leads"?"Заявки":"Бронирования"}</h2><p class="hero-copy">${clientMode?"Клиентская база студии и связанные проекты.":"Операционные данные из сайтов и Mini App TorclixGroup."}</p></div><button class="primary" data-action="crm-refresh">Обновить</button></div><section class="card table-card"><div class="card-head"><div class="card-title">${title==="Clients"?"Клиенты":title==="Leads"?"Заявки":"Бронирования"}</div><div class="card-meta">${items.length} записей</div></div>${items.length?items.map(r=>clientMode?`<button class="workspace-row" data-client-id="${htmlEsc(r[3])}" style="width:100%;text-align:left;background:transparent;border:0;color:inherit;cursor:pointer"><div class="project-name">${htmlEsc(r[0])}</div><div class="project-type">${htmlEsc(r[1])}</div><span class="badge live">${htmlEsc(r[2])}</span></button>`:`<div class="workspace-row"><div class="project-name">${r[0]}</div><div class="project-type">${r[1]}</div><span class="badge live">${r[2]}</span></div>`).join(""):`<div class="inspector-note">Пока нет записей. Подключите сайт или Mini App, чтобы начать собирать данные.</div>`}</section>`; }

function templateView(){
 return `<div class="eyebrow">03 / Template system</div><div class="workspace-head"><div><h2>Templates</h2><p class="hero-copy">Production-ready starting points. Select one to open it in the builder.</p></div><button class="primary" data-action="new-project">+ New project</button></div><div class="template-grid">${templates.map((t,i)=>`<button class="template-card" data-template="${i}"><div class="template-index">0${i+1}</div><strong>${t[0]}</strong><span>${t[1]}</span><small>${t[2]}</small></button>`).join("")}</div>`;
}

function domainsStructureView(){
 const rows=(domains||[]).map((d:any)=>"<div class=\"workspace-row\"><div><div class=\"project-name\">"+htmlEsc(d.hostname)+"</div><div class=\"project-type\">"+htmlEsc(d.projectId||"Без проекта")+"</div></div><span class=\"badge "+(d.status==="verified"||d.status==="active"?"live":"")+"\">"+htmlEsc(d.status||"pending")+"</span><div class=\"quick-actions\">"+(d.verificationToken?("<button class=\"secondary\" data-copy-dns=\""+htmlEsc(d.id)+"\">Копировать TXT</button>"):"")+"<button class=\"secondary\" data-verify-domain=\""+htmlEsc(d.id)+"\">Проверить DNS</button></div></div>").join("");
 return "<div class=\"eyebrow\">DOMAINS / PUBLISHING</div><div class=\"workspace-head\"><div><h2>Домены</h2><p class=\"hero-copy\">Подключайте домены клиентов и подтверждайте их через DNS TXT.</p></div><button class=\"primary\" data-action=\"add-domain\">+ Подключить домен</button></div><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Подключённые домены</div><div class=\"card-meta\">"+(domains?.length||0)+"</div></div>"+(rows||"<div class=\"inspector-note\">Доменов пока нет.</div>")+"</section>";
}
function teamCalendarView(){const staff=(window as any).__tgStaff||[],events=(window as any).__tgCalendar||[];const sr=staff.map((x:any)=>"<div class=\"workspace-row\"><div><div class=\"project-name\">"+htmlEsc(x.name)+"</div><div class=\"project-type\">"+htmlEsc(x.role||"staff")+"</div></div><span class=\"badge live\">Активен</span></div>").join("")||"<div class=\"inspector-note\">Сотрудников пока нет.</div>";const er=events.map((x:any)=>"<div class=\"workspace-row\"><div><div class=\"project-name\">"+htmlEsc(x.title)+"</div><div class=\"project-type\">"+htmlEsc(new Date(x.startAt).toLocaleString("ru-RU"))+" — "+htmlEsc(new Date(x.endAt).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}))+"</div></div><span class=\"badge\">"+htmlEsc(x.status||"scheduled")+"</span></div>").join("")||"<div class=\"inspector-note\">Событий пока нет.</div>";return "<div class=\"eyebrow\">05 / OPERATIONS</div><div class=\"workspace-head\"><div><h2>Команда и календарь</h2><p class=\"hero-copy\">Сотрудники и рабочее расписание студии.</p></div><div style=\"display:flex;gap:10px;flex-wrap:wrap\"><button class=\"secondary\" data-action=\"calendar-refresh\">Обновить</button><button class=\"secondary\" data-action=\"staff-add\">+ Сотрудник</button><button class=\"primary\" data-action=\"calendar-add\">+ Событие</button></div></div><div class=\"project-overview-grid\"><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Команда</div><div class=\"card-meta\">"+staff.length+"</div></div>"+sr+"</section><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Календарь</div><div class=\"card-meta\">"+events.length+"</div></div>"+er+"</section></div>";}
function studioStructureView(section:string){
 if(section==="Команда и календарь") return teamCalendarView();
 if(section==="Domains") return domainsStructureView();
 if(section==="Audit") return auditStructureView();
 if(section==="Billing") return billingStructureView();
 if(section==="Client Portal") return clientPortalStructureView();
 if(section==="Branding") return brandingStructureView();
 if(section==="Invoices") return invoiceStructureView();
 if(section==="Economics") return economicsStructureView();
 return "";
}
function auditStructureView(){
 const rows=(audit||[]).map((x:any)=>"<div class=\"workspace-row\"><div class=\"project-name\">"+htmlEsc(x.action||"action")+"</div><div class=\"project-type\">"+htmlEsc(x.actorEmail||x.actorId||"Система")+"</div><span class=\"badge live\">"+htmlEsc(x.createdAt||"")+"</span></div>").join("");
 return "<div class=\"eyebrow\">06 / Audit</div><div class=\"workspace-head\"><div><h2>Журнал аудита</h2><p class=\"hero-copy\">Кто и что сделал в рабочем пространстве.</p></div><button class=\"secondary\" data-action=\"analytics-refresh\">Обновить</button></div><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Последние действия</div><div class=\"card-meta\">"+(audit?.length||0)+"</div></div>"+(rows||"<div class=\"inspector-note\">Записей пока нет.</div>")+"</section>";
}
function billingStructureView(){
 const plan=billing?.plan||"pro",price=billing?.price||299,usage=billing?.usage?.projects||projects.length,limit=billing?.limits?.projects||50,memberUsage=billing?.usage?.members||1,memberLimit=billing?.limits?.members||10,staffUsage=billing?.usage?.staff||0,leadUsage=billing?.usage?.leads||crm.leads.length,leadLimit=billing?.limits?.leads||10000,currency=studioSettings.currency||"EUR";
 const currencySymbol:any={EUR:"€",USD:"$",RUB:"₽"};
 const symbol=currencySymbol[currency]||currency;
 const available=Array.isArray(billing?.availableCurrencies)&&billing.availableCurrencies.length?billing.availableCurrencies:["EUR"];
 const cards=[["starter","Starter",49,"5 проектов"],["pro","Pro",299,"50 проектов"],["scale","Scale",799,"250 проектов"]].map(x=>"<button class=\"template-card "+(plan===x[0]?"selected":"")+" \" data-billing-plan=\""+x[0]+"\"><strong>"+x[1]+"</strong><span>"+symbol+x[2]+" / мес</span><small>"+x[3]+"</small></button>").join("");
 const currencyOptions=available.map((c:string)=>"<button type=\"button\" class=\"secondary \" data-billing-currency=\""+htmlEsc(c)+"\" style=\"min-width:88px\" "+(c===currency?"aria-current=\"true\"":"")+">"+htmlEsc(currencySymbol[c]||c)+" "+htmlEsc(c)+"</button>").join("");
 return "<div class=\"eyebrow\">07 / Billing</div><div class=\"workspace-head\"><div><h2>Тариф и оплата</h2><p class=\"hero-copy\">Управление тарифом, лимитами и счетами. Валюта оплаты выбирается в настройках студии.</p></div></div><div class=\"stats\"><div class=\"stat\"><div class=\"stat-label\">Тариф</div><div class=\"stat-value\">"+htmlEsc(plan)+"</div></div><div class=\"stat\"><div class=\"stat-label\">В месяц</div><div class=\"stat-value\">"+htmlEsc(symbol)+htmlEsc(price)+"</div></div><div class=\"stat\"><div class=\"stat-label\">Проекты</div><div class=\"stat-value\">"+usage+"/"+limit+"</div></div><div class=\"stat\"><div class=\"stat-label\">Лиды</div><div class=\"stat-value\">"+(billing?.usage?.leads||crm.leads.length)+"</div></div></div><section class=\"card\"><div class=\"card-head\"><div class=\"card-title\">Тариф</div></div><div class=\"template-grid\" style=\"padding:20px\">"+cards+"</div></section><section class=\"card\"><div class=\"card-head\"><div class=\"card-title\">Валюта оплаты</div><div class=\"card-meta\">"+htmlEsc(currency)+"</div></div><div style=\"padding:20px;display:flex;gap:8px;flex-wrap:wrap\">"+currencyOptions+"</div></section><section class=\"card\"><div class=\"card-head\"><div class=\"card-title\">Оплата</div></div><div style=\"padding:20px\"><p class=\"hero-copy\">Выберите тариф и перейдите к безопасной оплате. Платёж откроется в Stripe Checkout.</p><button class=\"primary\" data-action=\"billing-checkout\" data-plan=\""+htmlEsc(plan)+"\" data-currency=\""+htmlEsc(currency)+"\">Оплатить в "+htmlEsc(symbol)+" "+htmlEsc(currency)+" / открыть Checkout</button></div></section>";
}
function clientPortalStructureView(){
 const p=projects.find(x=>x.id===editorProject)||projects[0];
 const portal=(p as any)?.clientPortal||{status:"draft",note:""};
 const statusLabel:any={draft:"Черновик",review:"На проверке",approved:"Одобрено",changes_requested:"Нужны правки"};
 const statusClass=portal.status==="approved"?"live":portal.status==="changes_requested"?"warn":"";
 return "<div class=\"eyebrow\">08 / CLIENT PORTAL</div><div class=\"workspace-head\"><div><h2>Портал клиента</h2><p class=\"hero-copy\">Клиент получает отдельный экран проекта и может принять результат или запросить изменения.</p></div><span class=\"badge "+statusClass+"\">"+htmlEsc(statusLabel[portal.status]||"Черновик")+"</span></div>"+
 "<section class=\"card\"><div class=\"card-head\"><div class=\"card-title\">Согласование проекта</div><div class=\"card-meta\">"+htmlEsc(p?.name||"Проект")+"</div></div><div style=\"padding:20px\"><div class=\"settings-grid\"><label class=\"settings-field\"><span>Статус клиента</span><select id=\"client-portal-status\"><option value=\"draft\" "+(portal.status==="draft"?"selected":"")+">Черновик</option><option value=\"review\" "+(portal.status==="review"?"selected":"")+">На проверке</option><option value=\"approved\" "+(portal.status==="approved"?"selected":"")+">Одобрено</option><option value=\"changes_requested\" "+(portal.status==="changes_requested"?"selected":"")+">Нужны правки</option></select></label><label class=\"settings-field\" style=\"grid-column:1/-1\"><span>Комментарий клиенту</span><textarea id=\"client-portal-note\" rows=\"5\" placeholder=\"Что нужно проверить или изменить?\">"+htmlEsc(portal.note||"")+"</textarea></label></div><div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-top:16px\"><button class=\"primary\" data-action=\"save-client-portal\">Сохранить статус</button><button class=\"secondary\" data-action=\"open-client-portal\">Открыть портал</button>"+(portal.token?"<button class=\"secondary\" data-copy-portal=\""+htmlEsc(portal.token)+"\">Скопировать ссылку</button>":"")+"</div></div></section>"+
 " <section class=\"quick-grid\"><div class=\"quick\"><div class=\"quick-name\">Сайт</div><div class=\"quick-copy\">"+(p?.status==="Live"?"Опубликован":"Черновик")+"</div></div><div class=\"quick\"><div class=\"quick-name\">Лиды</div><div class=\"quick-copy\">"+(p?.leads||0)+"</div></div><div class=\"quick\"><div class=\"quick-name\">Бронирования</div><div class=\"quick-copy\">"+crm.bookings.length+"</div></div><div class=\"quick\"><div class=\"quick-name\">Счета</div><div class=\"quick-copy\">"+invoices.length+"</div></div></section>";
}
function brandingStructureView(){
 return "<div class=\"eyebrow\">09 / Branding</div><div class=\"workspace-head\"><div><h2>Брендинг</h2><p class=\"hero-copy\">White-label настройки студии: имя, цвет и интерфейс.</p></div><button class=\"primary\" data-action=\"save-settings\">Сохранить</button></div><section class=\"card\"><div style=\"padding:20px\"><div class=\"settings-grid\"><label class=\"settings-field\"><span>Название бренда</span><input data-setting=\"brand-name\" value=\"TorclixGroup\"/></label><label class=\"settings-field\"><span>Акцентный цвет</span><input data-setting=\"accent\" type=\"color\" value=\""+htmlEsc(studioSettings.accent)+"\"/></label><label class=\"settings-field\"><span>Тема</span><select data-setting=\"theme\"><option value=\"dark\" "+(studioSettings.theme==="dark"?"selected":"")+">Тёмная</option><option value=\"light\" "+(studioSettings.theme==="light"?"selected":"")+">Светлая</option></select></label><label class=\"settings-field\"><span>Шрифт</span><select data-setting=\"font\"><option>Inter</option><option>Manrope</option><option>system-ui</option></select></label></div></div></section>";
}
function invoiceCreateModal(){return '<div class="modal-backdrop"><div class="modal-card"><div class="modal-head"><div><h3>Новый счёт</h3><p class="hero-copy">Создайте счёт для клиента.</p></div><button class="close" data-close="invoice-modal">×</button></div><div class="modal-body"><label class="settings-field"><span>Проект</span><select id="invoice-project">'+projects.map(p=>'<option value="'+htmlEsc(p.id)+'">'+htmlEsc(p.name)+'</option>').join("")+'</select></label><label class="settings-field"><span>Номер</span><input id="invoice-number" placeholder="INV-2026-001"/></label><label class="settings-field"><span>Сумма</span><input id="invoice-total" type="number" min="0" step="0.01" placeholder="0"/></label><label class="settings-field"><span>Срок оплаты</span><input id="invoice-due" type="date"/></label><label class="settings-field"><span>Примечание</span><textarea id="invoice-notes" placeholder="Услуга или комментарий"></textarea></label></div><div class="modal-foot"><button class="secondary" data-close="invoice-modal">Отмена</button><button class="primary" data-action="invoice-save">Создать счёт</button></div></div></div>';}
function invoiceStructureView(){
 const list=(invoices||[]).map((x:any)=>"<div class=\"workspace-row\"><div class=\"project-name\">"+htmlEsc(x.number||x.id||"Счёт")+"</div><div class=\"project-type\">"+htmlEsc(x.clientName||x.customerName||"Клиент")+"</div><span class=\"badge "+(x.status==="paid"?"live":"")+"\">"+htmlEsc(x.status||"draft")+"</span></div>").join("");
 return "<div class=\"eyebrow\">10 / Invoices</div><div class=\"workspace-head\"><div><h2>Счета</h2><p class=\"hero-copy\">Выставляйте и отслеживайте счета клиентам.</p></div><button class=\"primary\" data-action=\"invoice-create\">+ Новый счёт</button></div><section class=\"card table-card\"><div class=\"card-head\"><div class=\"card-title\">Счета</div><div class=\"card-meta\">"+(invoices?.length||0)+"</div></div>"+(list||"<div class=\"inspector-note\">Счетов пока нет.</div>")+"</section>";
}
function economicsStructureView(){
 const invoiceTotal=(invoices||[]).reduce((s,x)=>s+Number(x.total||0),0),paid=(invoices||[]).filter(x=>x.status==="paid").reduce((s,x)=>s+Number(x.total||0),0),ordersRevenue=(orders||[]).filter(x=>!["cancelled","refunded"].includes(x.status)).reduce((s,x)=>s+Number(x.total||0),0);
 return "<div class=\"eyebrow\">11 / Economics</div><div class=\"workspace-head\"><div><h2>Экономика</h2><p class=\"hero-copy\">Фактические суммы из счетов и заказов.</p></div></div><div class=\"stats\"><div class=\"stat\"><div class=\"stat-label\">Счета</div><div class=\"stat-value\">€"+invoiceTotal.toFixed(2)+"</div></div><div class=\"stat\"><div class=\"stat-label\">Оплачено</div><div class=\"stat-value\">€"+paid.toFixed(2)+"</div></div><div class=\"stat\"><div class=\"stat-label\">Заказы</div><div class=\"stat-value\">€"+ordersRevenue.toFixed(2)+"</div></div><div class=\"stat\"><div class=\"stat-label\">Проекты</div><div class=\"stat-value\">"+projects.length+"</div></div></div><section class=\"card\"><div style=\"padding:20px\"><p class=\"hero-copy\">Комиссии, налоги и внешние платежные провайдеры не считаются до их подключения.</p></div></section>";
}
function editor(project:Project){
 const page=doc.pages.find(p=>p.id===doc.activePage)||doc.pages[0];
 const websiteEnabled=project.type==="Website"||project.type==="Website + Mini App";
 const miniEnabled=project.type==="Mini App"||project.type==="Website + Mini App";
 const moduleCatalog=[["home","Главная","Стартовый экран и быстрые действия."],["catalog","Каталог","Товары, услуги и категории."],["booking","Бронирование","Доступность, слоты и подтверждения."],["calendar","Календарь","Расписание и предстоящие визиты."],["cart","Корзина и заказ","Корзина, оформление и статус заказа."],["membership","Абонементы","Планы, пакеты и подписки."],["loyalty","Лояльность","Баллы, награды и уровни клиентов."],["profile","Профиль","Аккаунт, настройки и история."],["notifications","Уведомления","Системные и транзакционные уведомления."],["telegram","Telegram","Связка Telegram Mini App и бота."]];
 const tab=(id:string,label:string)=>'<button class="project-tab '+(projectViewTab===id?"selected":"")+'" data-project-tab="'+id+'">'+label+'</button>';
 if(!websiteEnabled&&projectViewTab==="builder") projectViewTab=miniEnabled?"mini":"overview";
 const overviewTab=projectViewTab==="overview"?projectOverview(project):"";
 const builderTab=projectViewTab==="builder"&&websiteEnabled?`
 <div class="builder"><aside class="builder-side"><div class="builder-tabs"><button class="${editorTab==="Design"?"selected":""}" data-tab="Design">Дизайн</button><button class="${editorTab==="Content"?"selected":""}" data-tab="Content">Контент</button></div>
 <div class="panel-title">Страницы</div>${doc.pages.map(p=>`<button class="page-item ${p.id===doc.activePage?"selected":""}" data-page="${p.id}"><span>${p.name}</span><small>${p.blocks.length} блоков</small></button>`).join("")}
 <div class="panel-title">Добавить секцию</div><div class="block-palette">${["Hero","Features","Gallery","Pricing","Testimonials","FAQ","Booking","Contact","CTA"].map(type=>`<button class="palette-item" data-add-block="${type}">+ ${type}</button>`).join("")}</div></aside>
 <div class="canvas"><div class="site-preview" style="--editor-accent:${doc.accent}">${page.blocks.map((b,i)=>`<article class="canvas-block" data-block="${htmlEsc(b.id)}"><div class="block-number">0${i+1}</div><div><div class="block-type">${htmlEsc(b.type)}</div><h3>${htmlEsc(b.title)}</h3><p>${htmlEsc(b.body)}</p><button class="preview-button">Подробнее →</button></div><button class="block-remove" data-remove-block="${htmlEsc(b.id)}">×</button></article>`).join("")}</div></div>
 <aside class="inspector"><div class="panel-title">${selectedBlock?"Редактор блока":"Общий стиль"}</div>${selectedBlock?blockInspector(page):`<label class="field"><span>Акцент</span><input id="accent" type="color" value="${doc.accent}"/></label><div class="style-chip">Адаптивность</div><div class="style-chip">SEO готов</div><div class="style-chip">Свой домен</div><div class="style-chip">Аналитика</div><div class="inspector-note">Выберите блок в макете, чтобы изменить его содержимое.</div>`}</aside></div>`:"";
 const miniTab=projectViewTab==="mini"&&miniEnabled?`<div class="project-module-view">${miniAppPanel(moduleCatalog)}</div>`:"";
 const crmTab=projectViewTab==="crm"?projectCRM(project):"";
 const settingsTab=projectViewTab==="settings"?projectSettings(project):"";
 return `<div class="editor-shell"><div class="editor-top"><div><div class="eyebrow">04 / Проект</div><h2>${project.name}</h2><div class="editor-url">${project.url} · ${project.type} · ${project.industry}</div><div class="editor-links"><button class="secondary sm" data-action="preview">Открыть сайт</button><button class="ghost-btn sm" data-copy-link="${htmlEsc(publicSiteUrl(project.id))}">Копировать ссылку</button>${project.type.includes("Mini App")?'<button class="secondary sm" data-action="open-miniapp">Открыть Mini App</button>':""}${project.type.includes("Mini App")?'<button class="ghost-btn sm" data-copy-link="${htmlEsc(publicMiniAppUrl(project.id))}">Ссылка Mini App</button>':""}<button class="ghost-btn sm" data-action="open-telegram">Открыть Telegram</button></div></div><div class="editor-actions"><button class="secondary" data-action="preview">Предпросмотр</button><button class="primary" data-action="publish">Опубликовать</button></div></div>
 <div class="project-tabs">${tab("overview","Обзор")}${websiteEnabled?tab("builder","Сайт"):""}${miniEnabled?tab("mini","Mini App"):""}${tab("crm","Заявки и записи")}${tab("settings","Настройки")}</div>
 ${overviewTab}${builderTab}${miniTab}${crmTab}${settingsTab}</div>`;
}

function projectOverview(project:Project){
 const leads=crm.leads.filter((x:any)=>x.projectId===project.id);
 const bookings=crm.bookings.filter((x:any)=>x.projectId===project.id);
 return `<section class="project-dashboard"><div class="project-kpis"><div class="stat"><div class="stat-label">Статус</div><div class="stat-value">${project.status==="Live"?"Опубликован":"Черновик"}</div></div><div class="stat"><div class="stat-label">Заявки</div><div class="stat-value">${leads.length||project.leads}</div></div><div class="stat"><div class="stat-label">Бронирования</div><div class="stat-value">${bookings.length}</div></div><div class="stat"><div class="stat-label">Страницы</div><div class="stat-value">${doc.pages.length}</div></div></div>
 <div class="project-overview-grid"><section class="card"><div class="card-head"><div class="card-title">Быстрый запуск</div></div><div class="quick-actions"><button class="secondary" data-project-tab="builder">Редактировать сайт</button>${project.type.includes("Mini App")?'<button class="secondary" data-project-tab="mini">Настроить Mini App</button>':""}<button class="secondary" data-project-tab="crm">Открыть заявки</button><button class="secondary" data-action="preview">Открыть сайт клиента</button>${project.type.includes("Mini App")?'<button class="secondary" data-action="open-miniapp">Открыть Mini App</button>':""}</div></section><section class="card"><div class="card-head"><div class="card-title">Публикация</div></div><p class="inspector-note">${project.status==="Live"?"Проект опубликован и доступен клиентам.":"Проект ещё не опубликован."}</p><button class="primary" data-action="publish"> ${project.status==="Live"?"Опубликовать изменения":"Опубликовать проект"} </button></section></div></section>`;
}
function projectCRM(project:Project){
 const leads=crm.leads.filter((x:any)=>!x.projectId||x.projectId===project.id);
 const bookings=crm.bookings.filter((x:any)=>!x.projectId||x.projectId===project.id);
 return `<div class="project-module-view"><div class="workspace-head"><div><h3>Заявки и записи</h3><p class="hero-copy">Данные этого проекта из CRM TorclixGroup.</p></div><button class="secondary" data-action="crm-refresh">Обновить</button></div><div class="project-overview-grid"><section class="card table-card"><div class="card-head"><div class="card-title">Лиды</div><div class="card-meta">${leads.length}</div></div>${leads.length?leads.slice(0,12).map((x:any)=>`<div class="workspace-row"><div class="project-name">${x.name||"Без имени"}</div><div class="project-type">${x.email||x.phone||"Контакт не указан"}</div><span class="badge live">${x.status||"new"}</span></div>`).join(""):'<div class="inspector-note">Пока нет заявок.</div>'}</section><section class="card table-card"><div class="card-head"><div class="card-title">Бронирования</div><div class="card-meta">${bookings.length}</div></div>${bookings.length?bookings.slice(0,12).map((x:any)=>`<div class="workspace-row"><div class="project-name">${x.customerName||"Без имени"}</div><div class="project-type">${x.startAt?new Date(x.startAt).toLocaleString("ru-RU"):"Время не указано"}</div><span class="badge live">${x.status||"pending"}</span></div>`).join(""):'<div class="inspector-note">Пока нет бронирований.</div>'}</section></div></div>`;
}
function projectQrModal(project:Project){
 const url=API_BASE+"/published/"+encodeURIComponent(project.id);
 const qr="https://quickchart.io/qr?size=320&text="+encodeURIComponent(url);
 return '<div class="modal-backdrop"><div class="modal-card" style="max-width:430px"><div class="modal-head"><div><h3>QR-код проекта</h3><p class="hero-copy">Откройте клиентский сайт с телефона.</p></div><button class="close" data-close="project-qr">×</button></div><div class="modal-body" style="text-align:center"><img src="'+qr+'" alt="QR-код" style="width:280px;height:280px;max-width:100%;image-rendering:auto;border-radius:12px;background:#fff;padding:10px"/><div class="hero-copy" style="margin-top:14px;word-break:break-all">'+htmlEsc(url)+'</div></div><div class="modal-foot"><button class="secondary" data-action="copy-project-link">Скопировать ссылку</button><button class="primary" data-close="project-qr">Готово</button></div></div></div>';
}

function projectSettings(project:Project){
 return `<div class="project-module-view"><div class="settings-card"><div class="settings-card-head"><div><h3>Настройки проекта</h3><p>Изменения сохраняются в проекте студии.</p></div><span class="badge ${project.status==="Live"?"live":""}">${project.status==="Live"?"Опубликован":"Черновик"}</span></div><div class="settings-form-grid"><label class="field"><span>Название проекта</span><input id="project-settings-name" value="${htmlEsc(project.name)}"/></label><label class="field"><span>Slug / адрес</span><input id="project-settings-slug" value="${htmlEsc(project.slug||project.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"))}"/></label></div><div class="security-grid"><div><span>Тип</span><strong>${htmlEsc(project.type)}</strong></div><div><span>Отрасль</span><strong>${htmlEsc(project.industry)}</strong></div><div><span>Проект ID</span><strong>${htmlEsc(project.id)}</strong></div></div><button class="primary" data-action="save-project-settings">Сохранить изменения</button></div><div class="settings-card"><div class="settings-card-head"><div><h3>Публикация и домен</h3><p>После сохранения можно сразу открыть клиентский сайт.</p></div></div><div class="quick-actions"><button class="secondary" data-action="preview">Открыть сайт клиента</button><button class="secondary" data-action="copy-project-link">Скопировать ссылку</button><button class="secondary" data-action="show-project-qr">QR-код</button><button class="secondary" data-nav-direct="Analytics">Аналитика</button><button class="secondary" data-nav-direct="Domains">Домены</button></div></div></div>`;
}
function miniAppPanel(moduleCatalog:string[][]){
 const miniUrl=API_BASE&&editorProject?API_BASE+"/miniapp/"+editorProject:"";
 return '<section class="mini-app-panel"><div class="card-head"><div><div class="eyebrow">05 / Mini App runtime</div><div class="card-title">Конструктор Mini App</div></div><div class="card-meta">'+miniModules.length+' модулей · Telegram ready</div></div><div class="mini-app-toolbar"><div><strong>Публикация</strong><small>Настройки сохраняются в документ проекта и используются опубликованным Mini App.</small></div><div class="mini-app-toolbar-actions">'+(miniUrl?'<button class="secondary" data-action="open-miniapp">Открыть Mini App</button>':"")+'<button class="primary" data-action="publish-miniapp">Опубликовать</button></div></div><div class="mini-module-grid">'+moduleCatalog.map(m=>'<button class="mini-module '+(miniModules.includes(m[0])?"selected":"")+'" data-mini-module="'+m[0]+'"><span class="mini-module-mark">'+(miniModules.includes(m[0])?"✓":"+")+'</span><strong>'+m[1]+'</strong><small>'+m[2]+'</small></button>').join("")+'</div></section>';
}

function blockInspector(page:Page){
 const block=page.blocks.find(b=>b.id===selectedBlock);
 if(!block) return `<div class="inspector-note">Выберите блок в макете, чтобы изменить его содержимое.</div>`;
 return `<div class="selected-block"><div class="style-chip">${htmlEsc(block.type)}</div><label class="field"><span>Заголовок</span><textarea id="block-title">${htmlEsc(block.title)}</textarea></label><label class="field"><span>Текст</span><textarea id="block-body">${htmlEsc(block.body)}</textarea></label><button class="primary full" data-action="save-block">Сохранить блок</button><button class="secondary full" data-action="clear-block">Готово</button></div>`;
}

function projectModal(){
 const types=[["Website","Сайт клиента: страницы, секции, SEO и публикация."],["Mini App","Telegram Mini App: модули, запись, каталог и профиль."],["Website + Mini App","Полный клиентский цифровой продукт."]];
 const industries=[["restaurant","🍽️","Ресторан и кафе","Меню, столики, доставка"],["beauty","✦","Красота","Салоны, мастера, запись"],["fitness","◒","Фитнес и спорт","Занятия, тренеры, абонементы"],["medical","✚","Медицина","Клиники, врачи, запись"],["realty","⌂","Недвижимость","Объекты, агенты, заявки"],["services","◆","Услуги","Сервисы, специалисты, заявки"],["wash","◌","Автомойка","Услуги, запись, прайс"],["education","▣","Обучение","Курсы, занятия, преподаватели"],["retail","◇","Магазин","Каталог, корзина, заказы"],["other","•","Другое","Универсальный шаблон"]];
 const names=["Выберите формат","Выберите отрасль","Назовите проект"];
 const stepBody=wizardStep===1?`<div class="type-grid">${types.map(([n,c])=>`<button class="type-option ${selectedType===n?"selected":""}" data-type="${n}"><strong>${n}</strong><span>${c}</span></button>`).join("")}</div>`:wizardStep===2?`<div class="industry-grid">${industries.map(([id,icon,n,c])=>`<button class="industry-option ${selectedIndustry===id?"selected":""}" data-industry="${id}"><span class="industry-icon">${icon}</span><span class="industry-copy"><strong>${n}</strong><small>${c}</small></span><span class="industry-check">${selectedIndustry===id?"✓":""}</span></button>`).join("")}</div>`:`<div class="project-create-preview"><div class="eyebrow">Готово к созданию</div><h3>${selectedType}</h3><p>Отрасль: <strong>${industries.find(x=>x[0]===selectedIndustry)?.[2]||"Услуги"}</strong></p><div class="field"><label>Название проекта</label><input id="project-name" placeholder="Например, ПЕНА24"/></div></div>`;
 return `<div class="modal-backdrop" data-close="modal"><div class="modal modal-wizard"><div class="modal-head"><div><div class="eyebrow">05 / Новый проект · шаг ${wizardStep} из 3</div><div class="modal-title">${names[wizardStep-1]}</div></div><button class="close" data-close="modal">×</button></div><div class="wizard-progress"><span class="${wizardStep>=1?"on":""}">01</span><i></i><span class="${wizardStep>=2?"on":""}">02</span><i></i><span class="${wizardStep>=3?"on":""}">03</span></div><div class="modal-body">${stepBody}</div><div class="modal-foot"><button class="secondary" data-close="modal">Отмена</button>${wizardStep>1?`<button class="secondary" data-action="wizard-back">Назад</button>`: ""}${wizardStep<3?`<button class="primary" data-action="wizard-next">Продолжить →</button>`:`<button class="primary" data-action="create-project">Создать проект →</button>`}</div></div></div>`;
}

function notify(m:string){toast=m;render();window.setTimeout(()=>{toast="";render()},2200)}
function bind(){
 root.querySelectorAll<HTMLElement>("[data-action='login']").forEach(el=>el.addEventListener("click",()=>void beginAuth0Login()));
 root.querySelectorAll<HTMLElement>("[data-action='logout']").forEach(el=>el.addEventListener("click",()=>logoutAuth0()));
 root.querySelectorAll<HTMLElement>("[data-action='mobile-menu']").forEach(el=>el.addEventListener("click",()=>{mobileMenu=!mobileMenu;render();}));
 root.querySelectorAll<HTMLElement>("[data-action='mobile-close']").forEach(el=>el.addEventListener("click",()=>{mobileMenu=false;render();}));
 root.querySelectorAll<HTMLElement>("[data-copy-link]").forEach(el=>el.addEventListener("click",async()=>{const value=el.dataset.copyLink||"";if(!value)return;try{await navigator.clipboard.writeText(value);notify("Ссылка скопирована.");}catch{notify("Не удалось скопировать ссылку.");}}));
 root.querySelectorAll<HTMLElement>("[data-setting]").forEach(el=>el.addEventListener("change",()=>{
   const key=el.dataset.setting as keyof StudioSettings;
   if(key==="workspaceName") studioSettings.workspaceName=(el as HTMLInputElement).value.trim()||"Perezapusk Studio";
   else if(key==="brandName") studioSettings.brandName=(el as HTMLInputElement).value.trim()||"TorclixGroup";
   else if(key==="language") studioSettings.language=(el as HTMLSelectElement).value;
   else if(key==="currency") studioSettings.currency=(el as HTMLSelectElement).value;
   else if(key==="font") studioSettings.font=(el as HTMLSelectElement).value;
   else if(key==="accent") studioSettings.accent=(el as HTMLInputElement).value;
   else if(key==="theme") studioSettings.theme=(el as HTMLSelectElement).value;
   else if(key==="density") studioSettings.density=(el as HTMLSelectElement).value;
   else if(key==="radius") studioSettings.radius=(el as HTMLSelectElement).value;
   else if(key==="animations"||key==="compactNav"||key==="emailNotifications"||key==="leadNotifications"||key==="bookingNotifications") studioSettings[key]=(el as HTMLInputElement).checked;
   saveSettings(); render();
 }));
 root.querySelectorAll<HTMLElement>("[data-billing-currency]").forEach(el=>el.addEventListener("click",()=>{const currency=el.dataset.billingCurrency||"EUR";studioSettings.currency=currency;saveSettings();render();notify("Валюта оплаты: "+currency+".");}));
 root.querySelectorAll<HTMLElement>("[data-action='save-project-settings']").forEach(el=>el.addEventListener("click",async()=>{if(!editorProject)return;const name=root.querySelector<HTMLInputElement>("#project-settings-name")?.value.trim();const slug=root.querySelector<HTMLInputElement>("#project-settings-slug")?.value.trim();if(!name){notify("Введите название проекта.");return;}const result=await api("/api/projects/"+editorProject,{method:"PATCH",body:JSON.stringify({name,slug})});if(result?.data){projects=projects.map((p:any)=>p.id===editorProject?{...p,...result.data}:p);await hydrateProjects();notify("Настройки проекта сохранены.");render();}else notify(result?.error||"Не удалось сохранить проект.");}));
 root.querySelectorAll<HTMLElement>("[data-action='save-client-portal']").forEach(el=>el.addEventListener("click",async()=>{if(!editorProject)return;const status=root.querySelector<HTMLSelectElement>("#client-portal-status")?.value||"draft";const note=root.querySelector<HTMLTextAreaElement>("#client-portal-note")?.value||"";const result=await api("/api/projects/"+editorProject+"/client-portal",{method:"PATCH",body:JSON.stringify({status,note})});if(result?.data){projects=projects.map((p:any)=>p.id===editorProject?{...p,clientPortal:result.data}:p);saveProjects();notify("Статус клиентского портала сохранён.");render();}else notify(result?.error||"Не удалось сохранить статус.");}));
 root.querySelectorAll<HTMLElement>("[data-action='open-client-portal']").forEach(el=>el.addEventListener("click",async()=>{if(!editorProject)return;const r=await api("/api/projects/"+editorProject+"/client-portal");const token=r?.data?.token;if(!token){notify("Не удалось получить ссылку портала.");return;}window.open(location.origin+"/?portal="+encodeURIComponent(token),"_blank","noopener,noreferrer");}));
 root.querySelectorAll<HTMLElement>("[data-portal-status]").forEach(el=>el.addEventListener("click",async()=>{const status=el.dataset.portalStatus||"review";const note=status==="changes_requested"?(window.prompt("Что нужно изменить?")||"Нужны правки."):"Клиент одобрил проект.";const result=await api("/public/client-portal/"+encodeURIComponent(portalToken),{method:"PATCH",body:JSON.stringify({status,note})});if(result?.data){portalData={...portalData,...result.data};render();}else{const box=root.querySelector("#portal-action-status");if(box)box.textContent=result?.error||"Не удалось обновить статус.";}}));
 root.querySelectorAll<HTMLElement>("[data-copy-portal]").forEach(el=>el.addEventListener("click",async()=>{const token=el.dataset.copyPortal||"";if(!token)return;try{await navigator.clipboard.writeText(location.origin+"/?portal="+encodeURIComponent(token));notify("Ссылка портала скопирована.");}catch{notify("Не удалось скопировать ссылку.");}}));
 root.querySelectorAll<HTMLElement>("[data-action='staff-add']").forEach(el=>el.addEventListener("click",async()=>{const name=window.prompt("Имя сотрудника");if(!name)return;const result=await api("/api/staff",{method:"POST",body:JSON.stringify({name,role:window.prompt("Роль","staff")||"staff"})});if(result?.data){await hydrateTeamCalendar();notify("Сотрудник добавлен.");}else notify(result?.error||"Ошибка.");}));
 root.querySelectorAll<HTMLElement>("[data-action='calendar-refresh']").forEach(el=>el.addEventListener("click",async()=>{await hydrateTeamCalendar();notify("Календарь обновлён.");}));
 root.querySelectorAll<HTMLElement>("[data-action='calendar-add']").forEach(el=>el.addEventListener("click",async()=>{const title=window.prompt("Название события");if(!title)return;const startRaw=window.prompt("Начало (YYYY-MM-DDTHH:mm)",new Date(Date.now()+3600000).toISOString().slice(0,16));if(!startRaw)return;const endRaw=window.prompt("Конец (YYYY-MM-DDTHH:mm)",new Date(new Date(startRaw).getTime()+3600000).toISOString().slice(0,16));if(!endRaw)return;const start=new Date(startRaw),end=new Date(endRaw);if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start){notify("Проверьте дату и время события.");return;}const staff=(window as any).__tgStaff||[];const staffHint=staff.map((x:any)=>x.name+" = "+x.id).join("\n");const staffId=staff.length?(window.prompt("ID сотрудника (необязательно):\n"+staffHint,"")||""):null;const projectId=projects[0]?.id||null;const result=await api("/api/calendar/events",{method:"POST",body:JSON.stringify({title,startAt:start.toISOString(),endAt:end.toISOString(),staffId:staffId||null,projectId})});if(result?.data){await hydrateTeamCalendar();notify("Событие добавлено.");}else notify(result?.error||"Не удалось создать событие.");}));
 root.querySelectorAll<HTMLElement>("[data-action='invoices-refresh']").forEach(el=>el.addEventListener("click",async()=>{await hydrateInvoices();notify("Счета обновлены.");}));
 root.querySelectorAll<HTMLElement>("[data-action='invoice-create']").forEach(el=>el.addEventListener("click",()=>{invoiceModal=true;render();}));
 root.querySelectorAll<HTMLElement>("[data-close='invoice-modal']").forEach(el=>el.addEventListener("click",()=>{invoiceModal=false;render();}));
 root.querySelectorAll<HTMLElement>("[data-action='invoice-save']").forEach(el=>el.addEventListener("click",async()=>{const value=(id:string)=>root.querySelector<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>("#"+id)?.value.trim()||"";const total=Number(value("invoice-total")||0);const r=await api("/api/invoices",{method:"POST",body:JSON.stringify({projectId:value("invoice-project"),number:value("invoice-number"),dueAt:value("invoice-due")||null,notes:value("invoice-notes"),items:[{description:value("invoice-notes")||"Услуга",quantity:1,unitPrice:total}]})});if(r?.data){invoiceModal=false;await hydrateInvoices();notify("Счёт создан.");}else notify(r?.error||"Не удалось создать счёт.");})); root.querySelectorAll<HTMLSelectElement>("[data-invoice-status]").forEach(el=>el.addEventListener("change",async()=>{const result=await api("/api/invoices/"+el.dataset.invoiceStatus,{method:"PATCH",body:JSON.stringify({status:el.value})});if(result?.data){await hydrateInvoices();notify("Статус счёта обновлён.");}else notify(result?.error||"Не удалось обновить счёт.");}));
 root.querySelectorAll<HTMLElement>("[data-action='orders-refresh']").forEach(el=>el.addEventListener("click",async()=>{await hydrateOrders();notify("Заказы обновлены.");}));
 root.querySelectorAll<HTMLSelectElement>("[data-order-status]").forEach(el=>el.addEventListener("change",async()=>{const result=await api("/api/orders/"+el.dataset.orderStatus,{method:"PATCH",body:JSON.stringify({status:el.value})});if(result?.data){await hydrateOrders();notify("Статус заказа обновлён.");}else notify(result?.error||"Не удалось обновить заказ.");}));
 root.querySelectorAll<HTMLElement>("[data-action='catalog-new']").forEach(el=>el.addEventListener("click",()=>{editingCatalogId=null;catalogModal=true;render();}));
 root.querySelectorAll<HTMLElement>("[data-catalog-edit]").forEach(el=>el.addEventListener("click",()=>{editingCatalogId=el.dataset.catalogEdit||null;catalogModal=true;render();}));
 root.querySelectorAll<HTMLElement>("[data-close='catalog-modal']").forEach(el=>el.addEventListener("click",e=>{if((e.target as HTMLElement).dataset.close==="catalog-modal"||el.classList.contains("close")||el.classList.contains("secondary")){catalogModal=false;editingCatalogId=null;render();}}));
 if(catalogModal){
   const current=editingCatalogId?catalogItems.find(x=>x.id===editingCatalogId):null;
   const set=(id:string,value:any)=>{const el=root.querySelector<HTMLElement>("#"+id);if(el) (el as HTMLInputElement).value=String(value??"");};
   set("catalog-project",current?.projectId||projects[0]?.id||"");set("catalog-name",current?.name||"");set("catalog-type",current?.itemType||"service");set("catalog-category",current?.category||"");set("catalog-price",current?.price||0);set("catalog-currency",current?.currency||"EUR");set("catalog-stock",current?.stock??"");set("catalog-status",current?.status||"active");set("catalog-description",current?.description||"");
 }
 root.querySelectorAll<HTMLElement>("[data-action='catalog-save']").forEach(el=>el.addEventListener("click",async()=>{
   const value=(id:string)=>root.querySelector<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>("#"+id)?.value.trim()||"";
   const projectId=value("catalog-project"),name=value("catalog-name");if(!projectId||!name){notify("Укажите проект и название позиции.");return;}
   const payload={projectId,name,itemType:value("catalog-type"),category:value("catalog-category")||null,price:value("catalog-price")||0,currency:value("catalog-currency")||"EUR",stock:value("catalog-stock")||null,status:value("catalog-status")||"active",description:value("catalog-description")};
   const result=await api(editingCatalogId?"/api/catalog/"+editingCatalogId:"/api/catalog",{method:editingCatalogId?"PATCH":"POST",body:JSON.stringify(payload)});
   if(!result?.data){notify(result?.error||"Не удалось сохранить позицию.");return;}
   catalogModal=false;editingCatalogId=null;await hydrateCatalog();notify("Позиция сохранена.");
 }));
 root.querySelectorAll<HTMLElement>("[data-action='refresh-telegram']").forEach(el=>el.addEventListener("click",async()=>{await hydrateTelegram();render();notify(telegramStatus.enabled?"Telegram подключён.":"Telegram пока не подключён.");}));
 root.querySelectorAll<HTMLElement>("[data-action='configure-telegram']").forEach(el=>el.addEventListener("click",async()=>{if(!editorProject){notify("Сначала откройте проект.");return;}const result=await api("/api/telegram/configure",{method:"POST",body:JSON.stringify({projectId:editorProject})});if(result?.data){await hydrateTelegram();render();notify(result?.data?.botUrl?`Telegram подключён: ${result.data.botUrl}`:"Telegram подключён и Mini App настроен.");}else notify(result?.error||"Не удалось подключить Telegram.");}));
 root.querySelectorAll<HTMLElement>("[data-action='open-telegram-mini']").forEach(el=>el.addEventListener("click",()=>{if(telegramStatus.projectBotUrl)window.open(telegramStatus.projectBotUrl,"_blank","noopener,noreferrer"); else if(telegramStatus.miniAppUrl)window.open(telegramStatus.miniAppUrl,"_blank","noopener,noreferrer");}));
 root.querySelectorAll<HTMLElement>("[data-action='open-telegram-project']").forEach(el=>el.addEventListener("click",()=>{if(telegramStatus.projectBotUrl)window.open(telegramStatus.projectBotUrl,"_blank","noopener,noreferrer");}));
 root.querySelectorAll<HTMLElement>("[data-action='open-telegram']").forEach(async el=>{const projectId=editorProject;if(!projectId)return;try{const result=await api("/api/telegram/status?projectId="+encodeURIComponent(projectId));const data=result?.data||{};if(data.projectBotUrl)window.open(data.projectBotUrl,"_blank","noopener,noreferrer");else if(data.miniAppUrl)window.open(data.miniAppUrl,"_blank","noopener,noreferrer");else notify("Telegram для этого проекта ещё не настроен.");}catch{notify("Не удалось открыть Telegram.");}});
 root.querySelectorAll<HTMLElement>("[data-settings-scroll]").forEach(el=>el.addEventListener("click",()=>document.getElementById("settings-"+el.dataset.settingsScroll)?.scrollIntoView({behavior:"smooth",block:"start"})));
 root.querySelectorAll<HTMLElement>("[data-action='save-settings']").forEach(el=>el.addEventListener("click",()=>{saveSettings();notify("Настройки сохранены.");}));
 root.querySelectorAll<HTMLElement>("[data-billing-plan]").forEach(el=>el.addEventListener("click",async()=>{const plan=el.dataset.billingPlan||"";const r=await api("/api/billing/plan",{method:"POST",body:JSON.stringify({plan})});if(r?.data){await hydrateWorkspace();notify("Тариф изменён на "+plan+".");}else notify(r?.error||"Не удалось изменить тариф.");}));
  root.querySelectorAll<HTMLElement>("[data-action='billing-checkout']").forEach(el=>el.addEventListener("click",async()=>{const plan=el.dataset.plan||billing?.plan||"pro";const currency=el.dataset.currency||studioSettings.currency||"EUR";const result=await api("/api/billing/checkout",{method:"POST",body:JSON.stringify({plan,currency,origin:location.origin})});if(result?.data?.url){window.location.href=result.data.url;}else notify(result?.error||"Платёжный провайдер не настроен.");}));
 root.querySelectorAll<HTMLElement>("[data-action='save-settings']").forEach(el=>el.addEventListener("click",()=>{saveSettings();notify("Настройки сохранены.");}));
 root.querySelectorAll<HTMLElement>("[data-action='reset-settings']").forEach(el=>el.addEventListener("click",()=>{studioSettings={...defaultStudioSettings};saveSettings();render();notify("Настройки возвращены к стандартным.");}));

 root.querySelectorAll<HTMLElement>("[data-nav]").forEach(el=>el.addEventListener("click",async()=>{active=el.dataset.nav||"Overview";editorProject=null;if(["Clients","Clients & Leads","Leads","Bookings"].includes(active)) await hydrateCRM();
if(active==="Clients & Leads") await hydrateOrders();if(active==="Catalog") await hydrateCatalog();if(active==="Orders") await hydrateOrders();if(["Billing","Invoices"].includes(active)) await hydrateInvoices();if(["Analytics","Audit"].includes(active)) await hydrateAnalytics();if(active==="Команда и календарь") await hydrateTeamCalendar();render()}));
 root.querySelectorAll<HTMLElement>("[data-nav-direct]").forEach(el=>el.addEventListener("click",()=>{active=el.dataset.navDirect||"Overview";editorProject=null;render()}));
 root.querySelectorAll<HTMLElement>("[data-action='back']").forEach(el=>el.addEventListener("click",()=>{editorProject=null;active="Projects";render()}));
 root.querySelectorAll<HTMLElement>("[data-action='new-project']").forEach(el=>el.addEventListener("click",()=>{modal=true;wizardStep=1;selectedType="Website + Mini App";selectedIndustry="wash";render()}));
 root.querySelectorAll<HTMLElement>("[data-close='modal']").forEach(el=>el.addEventListener("click",e=>{if((e.target as HTMLElement).dataset.close==="modal"||el.classList.contains("close")||el.classList.contains("secondary")){modal=false;render()}}));
 root.querySelectorAll<HTMLElement>("[data-type]").forEach(el=>el.addEventListener("click",()=>{selectedType=el.dataset.type||selectedType;render()}));
 root.querySelectorAll<HTMLElement>("[data-industry]").forEach(el=>el.addEventListener("click",()=>{selectedIndustry=el.dataset.industry||selectedIndustry;render()}));
 root.querySelectorAll<HTMLElement>("[data-action='wizard-next']").forEach(el=>el.addEventListener("click",()=>{if(wizardStep===1&&!selectedType){notify("Выберите формат проекта.");return;}if(wizardStep===2&&!selectedIndustry){notify("Выберите отрасль.");return;}wizardStep=Math.min(3,wizardStep+1);render()}));
 root.querySelectorAll<HTMLElement>("[data-action='wizard-back']").forEach(el=>el.addEventListener("click",()=>{wizardStep=Math.max(1,wizardStep-1);render()}));
 root.querySelectorAll<HTMLElement>("[data-action='create-project']").forEach(el=>el.addEventListener("click",async()=>{const name=root.querySelector<HTMLInputElement>("#project-name")?.value.trim()||"Новый проект";const industry=selectedIndustry;const typeMap:Record<string,string>={"Website":"website","Mini App":"mini_app","Website + Mini App":"website_mini_app"};
if(!name.trim()){notify("Введите название проекта.");return;}const localId="p"+Date.now();const payload={name,type:typeMap[selectedType]||"website",industry:industry.toLowerCase().replace(" ","_"),organizationId:"org_demo"};const remote=await api("/api/projects",{method:"POST",body:JSON.stringify(payload)});if(!remote?.data?.id){notify(remote?.error||"Не удалось создать проект.");return;}const id=remote.data.id;const moduleMap:Record<string,string[]>={wash:["home","services","booking","profile","notifications"],restaurant:["home","catalog","cart","booking","profile","loyalty"],beauty:["home","catalog","calendar","booking","profile"],fitness:["home","catalog","calendar","membership","profile"],medical:["home","catalog","booking","profile","notifications"],realty:["home","catalog","booking","profile"],services:["home","catalog","booking","profile","notifications"],education:["home","catalog","calendar","booking","profile"],retail:["home","catalog","cart","profile","notifications"],other:["home","catalog","booking","profile","notifications"]};miniModules=moduleMap[industry]||moduleMap.services;projects.unshift({id,name,url:(remote.data.slug||name.toLowerCase().replace(/[^a-z0-9]+/g,"-"))+".preview",type:selectedType,status:"Draft",leads:0,industry});saveProjects();modal=false;wizardStep=1;editorProject=id;doc=buildTemplateDocument(id,industry);doc.miniApp={modules:miniModules,navigation:miniModules,theme:{accent:doc.accent,mode:"dark"}};saveDoc();await hydrateDocument(id);const synced=await syncDocument();if(synced?.error){notify("Проект создан, но документ не сохранился: "+synced.error);return;}const published=await api("/api/projects/"+id+"/publish",{method:"POST"});if(published?.data?.published){const created=projects.find(x=>x.id===id);if(created){created.status="Live";saveProjects();}}render();notify(published?.data?.published?name+" создан и опубликован. Сайт уже доступен клиенту.":name+" создан. Опубликуйте его из проекта.")}));
 root.querySelectorAll<HTMLElement>("[data-project],[data-open-project]").forEach(el=>el.addEventListener("click",async(e)=>{e.preventDefault();e.stopPropagation();const id=el.dataset.project||el.dataset.openProject;if(!id)return;editorProject=id;active="Projects";modal=false;projectViewTab="overview";doc=loadDoc(id);selectedBlock=null;render();await hydrateDocument(id);render();}));
 root.querySelectorAll<HTMLElement>("[data-template]").forEach(el=>el.addEventListener("click",()=>{
  const t=templates[Number(el.dataset.template)];
  selectedType=t[1];
  const label=String(t[0]).toLowerCase();
  selectedIndustry=label.includes("restaurant")?"restaurant":label.includes("beauty")?"beauty":label.includes("fitness")?"fitness":label.includes("medical")?"medical":label.includes("real estate")?"realty":"services";
  modal=true; wizardStep=2; render();
}));
 root.querySelectorAll<HTMLElement>("[data-page]").forEach(el=>el.addEventListener("click",()=>{doc.activePage=el.dataset.page||doc.activePage;saveDoc();render()}));
 root.querySelectorAll<HTMLElement>("[data-tab]").forEach(el=>el.addEventListener("click",()=>{editorTab=el.dataset.tab||"Design";render()}));
 root.querySelectorAll<HTMLElement>("[data-project-tab]").forEach(el=>el.addEventListener("click",()=>{projectViewTab=el.dataset.projectTab||"overview";render()}));
 root.querySelectorAll<HTMLElement>("[data-mini-module]").forEach(el=>el.addEventListener("click",()=>{const id=el.dataset.miniModule||"";miniModules=miniModules.includes(id)?miniModules.filter(x=>x!==id):[...miniModules,id];doc.miniApp={modules:miniModules,navigation:miniModules,theme:{accent:doc.accent,mode:doc.miniApp?.theme?.mode==="light"?"light":"dark"}};if(editorProject){localStorage.setItem("tg-mini-"+editorProject,JSON.stringify(miniModules));saveDoc();void syncDocument();}render();}));
 root.querySelectorAll<HTMLElement>("[data-action='toggle-mini']").forEach(el=>el.addEventListener("click",()=>{notify("Mini App открыт в конструкторе проекта.");}));

 root.querySelectorAll<HTMLElement>("[data-action='publish-miniapp']").forEach(el=>el.addEventListener("click",async()=>{
  if(!editorProject)return;
  doc.miniApp={modules:miniModules,navigation:miniModules,theme:{accent:doc.accent,mode:doc.miniApp?.theme?.mode==="light"?"light":"dark"}};
  saveDoc();
  const sync=await syncDocument();
  if(sync?.error){notify("Не удалось сохранить Mini App: "+sync.error);return;}
  const result=await api("/api/projects/"+editorProject+"/publish",{method:"POST"});
  if(result?.data?.published){
    const p=projects.find(x=>x.id===editorProject);
    if(p){p.status="Live";saveProjects();}
    notify("Mini App опубликован. Можно открыть его по ссылке.");
  }else{
    notify("Не удалось опубликовать Mini App: "+(result?.error||"ошибка API")+".");
  }
}));
 root.querySelectorAll<HTMLElement>("[data-action='add-domain']").forEach(el=>el.addEventListener("click",async()=>{const hostname=window.prompt("Введите домен клиента, например example.com")?.trim().toLowerCase();if(!hostname)return;const projectId=editorProject||undefined;const r=await api("/api/domains",{method:"POST",body:JSON.stringify({hostname,projectId})});if(r?.data){domains=[...domains,r.data];render();notify("Домен добавлен. Добавьте TXT-запись "+r.data.verification.name+" = "+r.data.verification.value);}else notify(r?.error||"Не удалось добавить домен.");}));
 root.querySelectorAll<HTMLElement>("[data-verify-domain]").forEach(el=>el.addEventListener("click",async()=>{const id=el.dataset.verifyDomain;if(!id)return;const r=await api("/api/domains/"+id+"/verify",{method:"POST"});if(r?.data){domains=domains.map((d:any)=>d.id===id?r.data:d);render();notify("DNS подтверждён. SSL будет подключён следующим этапом.");}else{notify(r?.verification?"TXT пока не найден: "+r.verification.name+" = "+r.verification.value:(r?.error||"Проверка не выполнена."));}}));
 root.querySelectorAll<HTMLElement>("[data-copy-dns]").forEach(el=>el.addEventListener("click",async()=>{const d=domains.find((x:any)=>x.id===el.dataset.copyDns);if(!d)return;const value=d.verificationToken||"";try{await navigator.clipboard.writeText(value);notify("TXT-значение скопировано.");}catch{notify("Не удалось скопировать TXT.");}}));
 root.querySelectorAll<HTMLElement>("[data-action='analytics-refresh']").forEach(el=>el.addEventListener("click",async()=>{await hydrateAnalytics();notify("Аналитика обновлена.");}));
 root.querySelectorAll<HTMLElement>("[data-action='crm-refresh']").forEach(el=>el.addEventListener("click",async()=>{await hydrateCRM();notify("Данные обновлены.");}));
 root.querySelectorAll<HTMLElement>("[data-action='inbox-refresh']").forEach(el=>el.addEventListener("click",async()=>{await hydrateCRM();await hydrateOrders();notify("Inbox обновлён.");}));
 root.querySelectorAll<HTMLSelectElement>("[data-inbox-lead]").forEach(el=>el.addEventListener("change",async()=>{const r=await api("/api/leads/"+el.dataset.inboxLead,{method:"PATCH",body:JSON.stringify({status:el.value})});if(r?.data){await hydrateCRM();notify("Статус заявки обновлён.");}else notify(r?.error||"Не удалось обновить заявку.");}));
 root.querySelectorAll<HTMLSelectElement>("[data-inbox-booking]").forEach(el=>el.addEventListener("change",async()=>{const r=await api("/api/bookings/"+el.dataset.inboxBooking,{method:"PATCH",body:JSON.stringify({status:el.value})});if(r?.data){await hydrateCRM();notify("Статус бронирования обновлён.");}else notify(r?.error||"Не удалось обновить бронирование.");}));
 root.querySelectorAll<HTMLElement>("[data-client-id]").forEach(el=>el.addEventListener("click",async()=>{const id=el.dataset.clientId;if(!id)return;const result=await api("/api/clients/"+id+"/360");const d=result?.data;if(!d){notify(result?.error||"Не удалось открыть клиента.");return;}openClient360Modal(d);}));
 root.querySelectorAll<HTMLElement>("[data-add-block]").forEach(el=>el.addEventListener("click",()=>{const type=el.dataset.addBlock||"Section";const page=doc.pages.find(p=>p.id===doc.activePage)!;page.blocks.push({id:"b"+Date.now(),type,title:type==="Hero"?"Новая история клиента начинается здесь.":type+" section",body:"Отредактируйте этот блок под бизнес клиента."});saveDoc();void syncDocument();notify("Секция «"+type+"» добавлена.")}));
 root.querySelectorAll<HTMLElement>("[data-block]").forEach(el=>el.addEventListener("click",e=>{if((e.target as HTMLElement).closest("[data-remove-block]")) return;selectedBlock=el.dataset.block||null;render();}));
 root.querySelectorAll<HTMLElement>("[data-action='save-block']").forEach(el=>el.addEventListener("click",()=>{const page=doc.pages.find(p=>p.id===doc.activePage)!;const block=page.blocks.find(b=>b.id===selectedBlock);if(block){block.title=root.querySelector<HTMLTextAreaElement>("#block-title")?.value||block.title;block.body=root.querySelector<HTMLTextAreaElement>("#block-body")?.value||block.body;saveDoc();void syncDocument();notify("Блок сохранён.");}}));
 root.querySelectorAll<HTMLElement>("[data-action='clear-block']").forEach(el=>el.addEventListener("click",()=>{selectedBlock=null;render();}));
 root.querySelectorAll<HTMLElement>("[data-remove-block]").forEach(el=>el.addEventListener("click",()=>{const page=doc.pages.find(p=>p.id===doc.activePage)!;page.blocks=page.blocks.filter(b=>b.id!==el.dataset.removeBlock);saveDoc();void syncDocument();render()}));
 root.querySelector<HTMLInputElement>("#accent")?.addEventListener("input",e=>{doc.accent=(e.target as HTMLInputElement).value;doc.miniApp={modules:doc.miniApp?.modules||miniModules,navigation:doc.miniApp?.navigation||miniModules,theme:{accent:doc.accent,mode:doc.miniApp?.theme?.mode==="light"?"light":"dark"}};saveDoc();void syncDocument();document.documentElement.style.setProperty("--editor-accent",doc.accent)});
 root.querySelectorAll<HTMLElement>("[data-action='add-page']").forEach(el=>el.addEventListener("click",()=>{const id="page"+Date.now();doc.pages.push({id:id,name:"Новая страница",blocks:[{id:"b"+Date.now(),type:"Hero",title:"Новая страница.",body:"Начните собирать страницу для клиента."}]});doc.activePage=id;saveDoc();void syncDocument();render()}));
 root.querySelectorAll<HTMLElement>("[data-action='copy-project-link']").forEach(el=>el.addEventListener("click",async()=>{if(!editorProject)return;const url=API_BASE+"/published/"+encodeURIComponent(editorProject);try{await navigator.clipboard.writeText(url);notify("Ссылка проекта скопирована.");}catch{notify("Не удалось скопировать ссылку.");}}));
 root.querySelectorAll<HTMLElement>("[data-action='show-project-qr']").forEach(el=>el.addEventListener("click",()=>{const p=projects.find(x=>x.id===editorProject);if(p){modal=true;root.insertAdjacentHTML("beforeend",projectQrModal(p));bind();}}));
root.querySelectorAll<HTMLElement>("[data-action='preview']").forEach(el=>el.addEventListener("click",()=>{if(!editorProject){notify("Сначала откройте проект.");return;}if(!API_BASE){notify("Для предпросмотра нужен VITE_API_URL.");return;}window.open(API_BASE+"/published/"+editorProject,"_blank","noopener,noreferrer");}));
 root.querySelectorAll<HTMLElement>("[data-action='open-miniapp']").forEach(el=>el.addEventListener("click",()=>{if(!editorProject){notify("Сначала откройте проект.");return;}if(!API_BASE){notify("Для Mini App нужен VITE_API_URL.");return;}window.open(API_BASE+"/miniapp/"+encodeURIComponent(editorProject),"_blank","noopener,noreferrer");}));
 root.querySelectorAll<HTMLElement>("[data-action='publish']").forEach(el=>el.addEventListener("click",async()=>{
  const p=projects.find(x=>x.id===editorProject);if(!p)return;
  el.setAttribute("disabled","true");
  try{
    const sync=await syncDocument();
    if(sync?.error){notify("Не удалось сохранить изменения перед публикацией: "+sync.error);return;}
    const remote=await api("/api/projects/"+p.id+"/publish",{method:"POST"});
    if(remote?.data?.published){p.status="Live";saveProjects();notify(p.name+" опубликован. Сайт клиента обновлён.");}
    else notify("Публикация не выполнена: "+(remote?.error||"ошибка API")+".");
  }finally{el.removeAttribute("disabled");}
}));
}

async function boot(){
  try{
    await finishAuth0Login();
    applyStudioSettings();
    render();
    if(portalToken){await hydratePublicPortal();return;}
    await Promise.allSettled([hydrateSession(),hydrateStudioSettings(),hydrateProjects(),hydrateWorkspace(),hydrateCRM(),hydrateAnalytics(),hydrateCatalog(),hydrateOrders(),hydrateInvoices(),hydrateTelegram(),hydrateTeamCalendar()]);
    if(!editorProject) render();
  }catch(error){
    console.error("TorclixGroup boot error",error);
    root.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;background:#080808;color:#f5f5f5;font-family:Inter,system-ui,sans-serif;padding:24px"><section style="max-width:720px;width:100%;border:1px solid #2a2a2a;border-radius:20px;padding:28px;background:#111"><div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#d8ff3e;margin-bottom:12px">TORCLIXGROUP</div><h1 style="margin:0 0 10px;font-size:28px">Не удалось загрузить рабочее пространство</h1><p style="margin:0;color:#aaa;line-height:1.6">Интерфейс не смог запуститься. Обновите страницу — приложение повторит инициализацию автоматически.</p><button onclick="location.reload()" style="margin-top:20px;border:0;border-radius:12px;padding:12px 18px;background:#d8ff3e;color:#080808;font-weight:700;cursor:pointer">Обновить</button></section></main>`;
  }
}

void boot();function invoicesView(){
 const rows=invoices.map(x=>`<div class="workspace-row"><div class="project-name">${htmlEsc(x.number)}</div><div class="project-type">${htmlEsc(x.clientId||"Клиент")} · ${htmlEsc(x.projectId||"Проект")}</div><span class="badge ${x.status==="paid"?"live":""}">${htmlEsc(x.status)} · ${htmlEsc(x.total)} ${htmlEsc(x.currency)}</span><select data-invoice-status="${htmlEsc(x.id)}"><option value="draft" ${x.status==="draft"?"selected":""}>Черновик</option><option value="sent" ${x.status==="sent"?"selected":""}>Отправлен</option><option value="paid" ${x.status==="paid"?"selected":""}>Оплачен</option><option value="overdue" ${x.status==="overdue"?"selected":""}>Просрочен</option><option value="void" ${x.status==="void"?"selected":""}>Аннулирован</option></select></div>`).join("");
 return `<div class="eyebrow">04 / Billing</div><div class="workspace-head"><div><h2>Счета</h2><p class="hero-copy">Счета студии и клиентских проектов. Оплата отмечается только после подтверждения провайдером.</p></div><button class="secondary" data-action="invoices-refresh">Обновить</button></div><section class="card table-card"><div class="card-head"><div class="card-title">Счета</div><div class="card-meta">${invoices.length}</div></div>${rows||'<div class="inspector-note">Счетов пока нет.</div>'}</section>`;
}
function ordersView(){
 const statusLabel=(s:string)=>({pending:"Ожидает",paid:"Оплачен",processing:"В работе",completed:"Завершён",cancelled:"Отменён",refunded:"Возврат"}[s]||s);
 const rows=orders.map(o=>`<div class="workspace-row"><div class="project-name">#${htmlEsc(String(o.id).slice(0,8))}</div><div class="project-type">${htmlEsc(o.customerName||"Клиент")} · ${htmlEsc(projects.find(p=>p.id===o.projectId)?.name||"Проект")}</div><span class="badge ${o.status==="paid"||o.status==="completed"?"live":""}">${htmlEsc(statusLabel(o.status))} · ${htmlEsc(o.total)} ${htmlEsc(o.currency)}</span><select class="order-status" data-order-status="${htmlEsc(o.id)}">${["pending","paid","processing","completed","cancelled","refunded"].map(s=>`<option value="${s}"${o.status===s?" selected":""}>${statusLabel(s)}</option>`).join("")}</select></div>`).join("");
 return `<div class="eyebrow">04 / Business OS</div><div class="workspace-head"><div><h2>Заказы</h2><p class="hero-copy">Заказы из сайтов и Mini Apps. Следующий слой — подключение реального провайдера оплаты.</p></div><button class="secondary" data-action="orders-refresh">Обновить</button></div><section class="card table-card"><div class="card-head"><div class="card-title">Заказы</div><div class="card-meta">${orders.length}</div></div>${rows||'<div class="inspector-note">Заказов пока нет.</div>'}</section></div>`;
}
function openClient360Modal(d:any){
 const old=document.getElementById("tg-client-360-modal"); if(old) old.remove();
 const escLocal=(v:any)=>htmlEsc(v??"—");
 const projects=(d.projects||[]).map((x:any)=>`<div class="crm360-row"><strong>${escLocal(x.name)}</strong><span>${escLocal(x.type||"Проект")}</span></div>`).join("")||`<div class="crm360-empty">Нет связанных проектов</div>`;
 const leads=(d.leads||[]).map((x:any)=>`<div class="crm360-row"><span>${escLocal(x.name||"Заявка")}</span><span>${escLocal(x.status||"new")}</span></div>`).join("")||`<div class="crm360-empty">Нет заявок</div>`;
 const bookings=(d.bookings||[]).map((x:any)=>`<div class="crm360-row"><span>${escLocal(x.service||"Бронирование")}</span><span>${escLocal(x.status||"pending")}</span></div>`).join("")||`<div class="crm360-empty">Нет бронирований</div>`;
 const el=document.createElement("div"); el.id="tg-client-360-modal"; el.className="crm360-backdrop"; el.innerHTML=`<div class="crm360-modal" role="dialog" aria-modal="true" aria-label="Карточка клиента"><div class="crm360-head"><div><div class="crm360-kicker">CRM / КЛИЕНТ</div><h2>${escLocal(d.client?.name)}</h2><div class="crm360-tg">${d.client?.telegramUsername?`@${escLocal(d.client.telegramUsername)}`:"Telegram не подключён"}${d.client?.telegramUserId?` · ID ${escLocal(d.client.telegramUserId)}`:""}</div></div><button class="crm360-close" data-client360-close type="button" aria-label="Закрыть">×</button></div><div class="crm360-stats"><div><b>${escLocal(d.summary?.projects||0)}</b><span>Проекты</span></div><div><b>${escLocal(d.summary?.leads||0)}</b><span>Заявки</span></div><div><b>${escLocal(d.summary?.bookings||0)}</b><span>Бронирования</span></div></div><div class="crm360-contact">${d.client?.phone?`<span>☎ ${escLocal(d.client.phone)}</span>`:""}${d.client?.email?`<span>✉ ${escLocal(d.client.email)}</span>`:""}</div><div class="crm360-grid"><section><h3>Проекты</h3>${projects}</section><section><h3>Заявки</h3>${leads}</section><section><h3>Бронирования</h3>${bookings}</section></div></div>`;
 document.body.appendChild(el); el.querySelector("[data-client360-close]")?.addEventListener("click",()=>el.remove()); el.addEventListener("click",e=>{if(e.target===el)el.remove()});
}

