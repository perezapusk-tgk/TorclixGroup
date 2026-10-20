const root = document.querySelector<HTMLDivElement>("#root");

if (root) {
  root.innerHTML = `
    <main style="min-height:100vh;background:#0a0a0a;color:#fff;padding:64px;font-family:Inter,Arial,sans-serif">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.55">TORCLIXGROUP / 01</p>
      <h1 style="font-size:clamp(48px,9vw,120px);line-height:.9;max-width:900px;margin:32px 0">
        The operating system for modern studios.
      </h1>
      <p style="max-width:620px;font-size:20px;line-height:1.5;opacity:.7">
        Websites, Mini Apps, clients, leads, booking, domains and analytics in one workspace.
      </p>
    </main>
  `;
}
