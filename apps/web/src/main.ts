import "./styles.css";

type NavItem = { icon: string; label: string; section?: string };
type Project = { name: string; url: string; type: string; status: "Live" | "Draft"; leads: number };

const nav: NavItem[] = [
  { icon: "⌂", label: "Overview" },
  { icon: "▦", label: "Projects" },
  { icon: "♙", label: "Clients" },
  { icon: "◫", label: "Websites" },
  { icon: "◈", label: "Mini Apps" },
  { icon: "✦", label: "Templates" },
  { icon: "◇", label: "Components" },
  { icon: "↗", label: "Analytics" },
  { icon: "⌁", label: "Domains", section: "Workspace" },
  { icon: "⇄", label: "Integrations" },
  { icon: "◌", label: "Billing" },
  { icon: "⚙", label: "Settings" }
];

const projects: Project[] = [
  { name: "Maison Noire", url: "maisonnoire.studio", type: "Website + Mini App", status: "Live", leads: 128 },
  { name: "Forma Fitness", url: "forma.fit", type: "Mini App", status: "Live", leads: 74 },
  { name: "Northline Clinic", url: "northline.health", type: "Website", status: "Draft", leads: 31 },
  { name: "Atelier 24", url: "atelier24.com", type: "Website", status: "Live", leads: 96 }
];

let activeNav = "Overview";
let modalOpen = false;
let selectedType = "Website + Mini App";
let toast = "";

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Root element not found");

function render() {
  root.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">T</div><div><div class="brand-name">TORCLIXGROUP</div><span class="brand-sub">Studio OS / 01</span></div></div>
        <nav>
          <div class="nav-label">Workspace</div>
          ${nav.map((item, index) => {
            const extra = item.section && index === 8 ? `<div class="nav-label">${item.section}</div>` : "";
            return `${extra}<button class="nav-item ${activeNav === item.label ? "active" : ""}" data-nav="${item.label}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span></button>`;
          }).join("")}
        </nav>
        <div class="sidebar-bottom"><div class="workspace"><div class="avatar">PG</div><div><div class="workspace-name">Perezapusk Studio</div><div class="workspace-role">Owner · Pro</div></div></div></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="crumb">Studio / <strong>${activeNav}</strong></div><div class="top-actions"><button class="icon-btn">⌕</button><button class="icon-btn">⌁</button><div class="profile"><div class="avatar">PG</div></div></div></header>
        <section class="content">
          <div class="hero"><div><div class="eyebrow">01 / Studio overview</div><h1>Build. Operate.<br/>Scale.</h1><p class="hero-copy">One operating system for every client project. Websites, Mini Apps, leads, booking, domains and analytics — managed from one studio.</p></div><div class="actions"><button class="secondary" data-action="templates">Browse templates</button><button class="primary" data-action="new-project">+ New project</button></div></div>
          <div class="stats">
            <div class="stat"><div class="stat-label">Projects</div><div class="stat-value">24 <span class="stat-delta">+4 this month</span></div></div>
            <div class="stat"><div class="stat-label">Active / Draft</div><div class="stat-value">18 / 6</div></div>
            <div class="stat"><div class="stat-label">Monthly revenue</div><div class="stat-value">€12.8k <span class="stat-delta">+18.4%</span></div></div>
            <div class="stat"><div class="stat-label">Leads this month</div><div class="stat-value">329 <span class="stat-delta">+22.1%</span></div></div>
          </div>
          <div class="grid">
            <section class="card"><div class="card-head"><div class="card-title">Recent projects</div><div class="card-meta">24 total · updated live</div></div><div class="project-list">
              ${projects.map((p, i) => `<div class="project-row"><div><div class="project-name">${p.name}</div><div class="project-url">${p.url}</div></div><div class="project-type">${p.type}</div><div><span class="badge ${p.status === "Live" ? "live" : ""}">${p.status}</span></div><div class="project-number">${p.leads} leads</div><button class="row-action" data-project="${i}">→</button></div>`).join("")}
            </div></section>
            <section class="card"><div class="card-head"><div class="card-title">Activity</div><div class="card-meta">Today</div></div><div class="activity">
              <div class="activity-item"><div class="activity-dot"></div><div class="activity-text">Maison Noire published a new menu.<span class="activity-time">8 min ago</span></div></div>
              <div class="activity-item"><div class="activity-dot"></div><div class="activity-text">New lead received from Forma Fitness.<span class="activity-time">31 min ago</span></div></div>
              <div class="activity-item"><div class="activity-dot"></div><div class="activity-text">Northline Clinic domain connected.<span class="activity-time">2 hours ago</span></div></div>
              <div class="activity-item"><div class="activity-dot"></div><div class="activity-text">New team member invited.<span class="activity-time">4 hours ago</span></div></div>
            </div></section>
          </div>
          <section class="section"><div class="section-head"><div><div class="eyebrow">02 / Fast actions</div><div class="section-title">Start something new</div></div><div class="section-note">Modular by design</div></div><div class="quick-grid">
            <button class="quick" data-action="new-project"><div class="quick-icon">＋</div><div class="quick-name">Create project</div><div class="quick-copy">Website, Mini App or both.</div></button>
            <button class="quick" data-action="templates"><div class="quick-icon">✦</div><div class="quick-name">Use a template</div><div class="quick-copy">Start from a production-ready industry kit.</div></button>
            <button class="quick" data-action="client"><div class="quick-icon">♙</div><div class="quick-name">Add client</div><div class="quick-copy">Create a client workspace and invite their team.</div></button>
            <button class="quick" data-action="domain"><div class="quick-icon">⌁</div><div class="quick-name">Connect domain</div><div class="quick-copy">Point a custom domain and publish.</div></button>
          </div></section>
        </section>
      </main>
    </div>
    ${modalOpen ? modal() : ""}
    ${toast ? `<div class="toast">${toast}</div>` : ""}
  `;
  bind();
}

function modal() {
  const types = [["Website", "Pages, sections, SEO and publishing."], ["Mini App", "Modules, booking, catalog and accounts."], ["Website + Mini App", "The complete client experience."]];
  return `<div class="modal-backdrop" data-close="modal"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="eyebrow">03 / New project</div><div class="modal-title">Choose your starting point</div></div><button class="close" data-close="modal">×</button></div><div class="modal-body"><div class="type-grid">${types.map(([name, copy]) => `<button class="type-option ${selectedType === name ? "selected" : ""}" data-type="${name}"><strong>${name}</strong><span>${copy}</span></button>`).join("")}</div><div class="form-row"><div class="field"><label>Project name</label><input id="project-name" placeholder="e.g. Atelier 24" /></div><div class="field"><label>Industry</label><select id="industry"><option>Restaurant</option><option>Beauty</option><option>Fitness</option><option>Medical</option><option>Real Estate</option><option>Services</option></select></div></div></div><div class="modal-foot"><button class="secondary" data-close="modal">Cancel</button><button class="primary" data-action="create-project">Create project →</button></div></div></div>`;
}

function notify(message: string) {
  toast = message; render(); window.setTimeout(() => { toast = ""; render(); }, 2200);
}

function bind() {
  root.querySelectorAll<HTMLElement>("[data-nav]").forEach((el) => el.addEventListener("click", () => {
    activeNav = el.dataset.nav ?? "Overview";
    if (activeNav !== "Overview") notify(`${activeNav} workspace is ready for the next build phase.`);
    else render();
  }));
  root.querySelectorAll<HTMLElement>("[data-action='new-project']").forEach((el) => el.addEventListener("click", () => { modalOpen = true; render(); }));
  root.querySelectorAll<HTMLElement>("[data-action='templates']").forEach((el) => el.addEventListener("click", () => notify("Template library is queued for the builder phase.")));
  root.querySelectorAll<HTMLElement>("[data-action='client']").forEach((el) => el.addEventListener("click", () => notify("Client workspace flow is queued for the Studio module.")));
  root.querySelectorAll<HTMLElement>("[data-action='domain']").forEach((el) => el.addEventListener("click", () => notify("Domain manager is queued for the Infrastructure module.")));
  root.querySelectorAll<HTMLElement>("[data-close='modal']").forEach((el) => el.addEventListener("click", (event) => { if ((event.target as HTMLElement).dataset.close === "modal" || el.classList.contains("close") || el.classList.contains("secondary")) { modalOpen = false; render(); } }));
  root.querySelectorAll<HTMLElement>("[data-type]").forEach((el) => el.addEventListener("click", () => { selectedType = el.dataset.type ?? selectedType; render(); }));
  root.querySelectorAll<HTMLElement>("[data-action='create-project']").forEach((el) => el.addEventListener("click", () => { const name = root.querySelector<HTMLInputElement>("#project-name")?.value.trim() || "Untitled project"; modalOpen = false; notify(`${name} created as ${selectedType} draft.`); }));
  root.querySelectorAll<HTMLElement>("[data-project]").forEach((el) => el.addEventListener("click", () => { const project = projects[Number(el.dataset.project)]; notify(`Opening ${project.name} — project workspace is next.`); }));
}

render();
