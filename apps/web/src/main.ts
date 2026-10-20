import "./styles.css";

type Project = { name: string; url: string; type: string; status: "Live" | "Draft"; leads: number; industry: string };
type NavItem = { icon: string; label: string; section?: string };

const nav: NavItem[] = [
  { icon: "⌂", label: "Overview" }, { icon: "▦", label: "Projects" }, { icon: "♙", label: "Clients" },
  { icon: "◫", label: "Websites" }, { icon: "◈", label: "Mini Apps" }, { icon: "✦", label: "Templates" },
  { icon: "◇", label: "Components" }, { icon: "↗", label: "Analytics" }, { icon: "⌁", label: "Domains", section: "Workspace" },
  { icon: "⇄", label: "Integrations" }, { icon: "◌", label: "Billing" }, { icon: "⚙", label: "Settings" }
];

const projects: Project[] = [
  { name:"Maison Noire", url:"maisonnoire.studio", type:"Website + Mini App", status:"Live", leads:128, industry:"Restaurant" },
  { name:"Forma Fitness", url:"forma.fit", type:"Mini App", status:"Live", leads:74, industry:"Fitness" },
  { name:"Northline Clinic", url:"northline.health", type:"Website", status:"Draft", leads:31, industry:"Medical" },
  { name:"Atelier 24", url:"atelier24.com", type:"Website", status:"Live", leads:96, industry:"Services" }
];

const templates = [
  ["Restaurant / Noir","Website + Mini App","Menu, booking, loyalty, orders"],
  ["Beauty / Atelier","Website + Mini App","Services, staff, calendar, booking"],
  ["Fitness / Forma","Mini App","Classes, trainers, memberships"],
  ["Medical / Northline","Website","Services, doctors, booking, SEO"],
  ["Real Estate / North","Website","Listings, agents, inquiries"],
  ["Services / Studio","Website","Cases, services, leads"]
];

let activeNav="Overview", modalOpen=false, selectedType="Website + Mini App", toast="";
const root=document.querySelector<HTMLDivElement>("#root");
if(!root) throw new Error("Root element not found");

function render(){
  const content = activeNav==="Overview" ? overview() : workspace(activeNav);
  root.innerHTML=`
    <div class="app"><aside class="sidebar">
      <div class="brand"><div class="brand-mark">T</div><div><div class="brand-name">TORCLIXGROUP</div><span class="brand-sub">Studio OS / 01</span></div></div>
      <nav><div class="nav-label">Workspace</div>${nav.map((item,i)=>(item.section&&i===8?`<div class="nav-label">${item.section}</div>`:"")+ `<button class="nav-item ${activeNav===item.label?"active":""}" data-nav="${item.label}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span></button>`).join("")}</nav>
      <div class="sidebar-bottom"><div class="workspace"><div class="avatar">PG</div><div><div class="workspace-name">Perezapusk Studio</div><div class="workspace-role">Owner · Pro</div></div></div></div>
    </aside><main class="main"><header class="topbar"><div class="crumb">Studio / <strong>${activeNav}</strong></div><div class="top-actions"><button class="icon-btn">⌕</button><button class="icon-btn">⌁</button><div class="profile"><div class="avatar">PG</div></div></div></header><section class="content">${content}</section></main></div>
    ${modalOpen?modal():""}${toast?`<div class="toast">${toast}</div>`:""}`;
  bind();
}

function overview(){
 return `<div class="hero"><div><div class="eyebrow">01 / Studio overview</div><h1>Build. Operate.<br/>Scale.</h1><p class="hero-copy">One operating system for every client project. Websites, Mini Apps, leads, booking, domains and analytics — managed from one studio.</p></div><div class="actions"><button class="secondary" data-nav-direct="Templates">Browse templates</button><button class="primary" data-action="new-project">+ New project</button></div></div>
 <div class="stats"><div class="stat"><div class="stat-label">Projects</div><div class="stat-value">${projects.length} <span class="stat-delta">+4 this month</span></div></div><div class="stat"><div class="stat-label">Active / Draft</div><div class="stat-value">${projects.filter(p=>p.status==="Live").length} / ${projects.filter(p=>p.status==="Draft").length}</div></div><div class="stat"><div class="stat-label">Monthly revenue</div><div class="stat-value">€12.8k <span class="stat-delta">+18.4%</span></div></div><div class="stat"><div class="stat-label">Leads this month</div><div class="stat-value">${projects.reduce((n,p)=>n+p.leads,0)} <span class="stat-delta">+22.1%</span></div></div></div>
 <div class="grid"><section class="card"><div class="card-head"><div class="card-title">Recent projects</div><div class="card-meta">live workspace</div></div><div class="project-list">${projects.map((p,i)=>`<div class="project-row"><div><div class="project-name">${p.name}</div><div class="project-url">${p.url}</div></div><div class="project-type">${p.type}</div><div><span class="badge ${p.status==="Live"?"live":""}">${p.status}</span></div><div class="project-number">${p.leads} leads</div><button class="row-action" data-project="${i}">→</button></div>`).join("")}</div></section><section class="card"><div class="card-head"><div class="card-title">Activity</div><div class="card-meta">Today</div></div><div class="activity">${["Maison Noire published a new menu.","New lead received from Forma Fitness.","Northline Clinic domain connected.","New team member invited."].map((x,i)=>`<div class="activity-item"><div class="activity-dot"></div><div class="activity-text">${x}<span class="activity-time">${[8,31,120,240][i]} min ago</span></div></div>`).join("")}</div></section></div>
 <section class="section"><div class="section-head"><div><div class="eyebrow">02 / Fast actions</div><div class="section-title">Start something new</div></div><div class="section-note">Modular by design</div></div><div class="quick-grid"><button class="quick" data-action="new-project"><div class="quick-icon">＋</div><div class="quick-name">Create project</div><div class="quick-copy">Website, Mini App or both.</div></button><button class="quick" data-nav-direct="Templates"><div class="quick-icon">✦</div><div class="quick-name">Use a template</div><div class="quick-copy">Start from an industry kit.</div></button><button class="quick" data-nav-direct="Clients"><div class="quick-icon">♙</div><div class="quick-name">Add client</div><div class="quick-copy">Create a client workspace.</div></button><button class="quick" data-nav-direct="Domains"><div class="quick-icon">⌁</div><div class="quick-name">Connect domain</div><div class="quick-copy">Point a custom domain and publish.</div></button></div></section>`;
}

function workspace(section:string){
 const map:Record<string,[string,string,string][]>={Projects:projects.map(p=>[p.name,p.type,p.status]),Templates:templates,Clients:[["Maison Noire","Restaurant · 3 contacts","Active"],["Forma Fitness","Fitness · 2 contacts","Active"],["Northline Clinic","Medical · 4 contacts","Active"]],Websites:[["Maison Noire","maisonnoire.studio","Published"],["Northline Clinic","northline.health","Draft"],["Atelier 24","atelier24.com","Published"]],"Mini Apps":[["Maison Noire","Menu · Booking · Loyalty","Published"],["Forma Fitness","Classes · Membership","Published"]],Components:[["Hero","Marketing section","Core"],["Booking","Business module","Core"],["Pricing","Commerce section","Core"]],Analytics:[["Visitors","24.8k","↑ 18%"],["Leads","329","↑ 22%"],["Conversion","4.8%","↑ 0.7%"]],Domains:[["maisonnoire.studio","DNS verified","Connected"],["forma.fit","SSL active","Connected"],["northline.health","Awaiting DNS","Pending"]],Integrations:[["Telegram","Mini Apps + notifications","Ready"],["Stripe","Payments","Connect"],["Email","Transactional email","Connect"]],Billing:[["Studio Pro","€299 / month","Current"],["Usage","24 / 50 projects","72%"],["Next invoice","01 Nov 2026","Scheduled"]],Settings:[["Workspace","Perezapusk Studio","Owner"],["Team","4 members","Manage"],["Brand","TorclixGroup","Configure"]]};
 const rows=map[section]||[];
 return `<div class="eyebrow">03 / Workspace</div><div class="workspace-head"><div><h2>${section}</h2><p class="hero-copy">The ${section.toLowerCase()} layer of TorclixGroup. Built to become a real operating module, not a placeholder screen.</p></div><button class="primary" data-action="new-project">+ New project</button></div><section class="card table-card"><div class="card-head"><div class="card-title">${section} workspace</div><div class="card-meta">${rows.length} items</div></div>${rows.map(r=>`<div class="workspace-row"><div class="project-name">${r[0]}</div><div class="project-type">${r[1]}</div><span class="badge ${/Live|Published|Active|Connected|Current|Ready/.test(r[2])?"live":""}">${r[2]}</span><button class="row-action">→</button></div>`).join("")}</section>${section==="Templates"?`<div class="template-grid">${templates.map(t=>`<button class="template-card" data-template="${t[0]}"><div class="template-index">01</div><strong>${t[0]}</strong><span>${t[1]}</span><small>${t[2]}</small></button>`).join("")}</div>`:""}`;
}

function modal(){
 const types=[["Website","Pages, sections, SEO and publishing."],["Mini App","Modules, booking, catalog and accounts."],["Website + Mini App","The complete client experience."]];
 return `<div class="modal-backdrop" data-close="modal"><div class="modal" role="dialog"><div class="modal-head"><div><div class="eyebrow">04 / New project</div><div class="modal-title">Choose your starting point</div></div><button class="close" data-close="modal">×</button></div><div class="modal-body"><div class="type-grid">${types.map(([n,c])=>`<button class="type-option ${selectedType===n?"selected":""}" data-type="${n}"><strong>${n}</strong><span>${c}</span></button>`).join("")}</div><div class="form-row"><div class="field"><label>Project name</label><input id="project-name" placeholder="e.g. Atelier 25"/></div><div class="field"><label>Industry</label><select id="industry"><option>Restaurant</option><option>Beauty</option><option>Fitness</option><option>Medical</option><option>Real Estate</option><option>Services</option></select></div></div></div><div class="modal-foot"><button class="secondary" data-close="modal">Cancel</button><button class="primary" data-action="create-project">Create project →</button></div></div></div>`;
}

function notify(message:string){toast=message;render();window.setTimeout(()=>{toast="";render()},2200)}
function bind(){
 root.querySelectorAll<HTMLElement>("[data-nav]").forEach(el=>el.addEventListener("click",()=>{activeNav=el.dataset.nav||"Overview";render()}));
 root.querySelectorAll<HTMLElement>("[data-nav-direct]").forEach(el=>el.addEventListener("click",()=>{activeNav=el.dataset.navDirect||"Overview";render()}));
 root.querySelectorAll<HTMLElement>("[data-action='new-project']").forEach(el=>el.addEventListener("click",()=>{modalOpen=true;render()}));
 root.querySelectorAll<HTMLElement>("[data-close='modal']").forEach(el=>el.addEventListener("click",e=>{if((e.target as HTMLElement).dataset.close==="modal"||el.classList.contains("close")||el.classList.contains("secondary")){modalOpen=false;render()}}));
 root.querySelectorAll<HTMLElement>("[data-type]").forEach(el=>el.addEventListener("click",()=>{selectedType=el.dataset.type||selectedType;render()}));
 root.querySelectorAll<HTMLElement>("[data-action='create-project']").forEach(el=>el.addEventListener("click",()=>{const name=root.querySelector<HTMLInputElement>("#project-name")?.value.trim()||"Untitled project";const industry=root.querySelector<HTMLSelectElement>("#industry")?.value||"Services";projects.unshift({name,url:name.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".preview",type:selectedType,status:"Draft",leads:0,industry});modalOpen=false;activeNav="Projects";notify(`${name} created as ${selectedType} draft.`)}));
 root.querySelectorAll<HTMLElement>("[data-project]").forEach(el=>el.addEventListener("click",()=>{activeNav="Projects";render()}));
 root.querySelectorAll<HTMLElement>("[data-template]").forEach(el=>el.addEventListener("click",()=>{selectedType=el.dataset.template?.includes("Mini App")?"Mini App":"Website + Mini App";modalOpen=true;render()}));
}
render();
