import crypto from "node:crypto";

export function verifyTelegramInitData(initData, botToken, maxAgeSec = 86400) {
  if (!botToken || typeof initData !== "string" || initData.length < 20 || initData.length > 4096) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const a = Buffer.from(calculated, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get("auth_date") || 0);
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || age < -60 || age > maxAgeSec) return null;
  try {
    const user = JSON.parse(params.get("user") || "null");
    return user && Number.isInteger(user.id) ? user : null;
  } catch {
    return null;
  }
}

export async function telegramApi(method, payload = {}, token = process.env.TELEGRAM_BOT_TOKEN) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!data?.ok) throw new Error(data?.description || `Telegram API error: ${response.status}`);
  return data.result;
}

export function telegramMiniAppUrl(projectId) {
  if (!projectId) throw new Error("projectId is required");
  const base = String(process.env.PUBLIC_URL || process.env.API_PUBLIC_URL || "https://torclixgroup-api.onrender.com").replace(/\/$/, "");
  return `${base}/miniapp/${encodeURIComponent(projectId)}`;
}

export async function configureTelegramBot(projectId) {
  if (!projectId) throw new Error("projectId is required");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return {enabled:false};
  const base = String(process.env.PUBLIC_URL || process.env.API_PUBLIC_URL || "https://torclixgroup-api.onrender.com").replace(/\/$/, "");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.createHmac("sha256", token).update("TorclixGroup:telegram:webhook").digest("hex");
  const webhook = `${base}/tg/webhook`;
  const bot = await telegramApi("getMe", {}, token);
  await telegramApi("setWebhook", {
    url: webhook,
    secret_token: secret,
    allowed_updates: ["message","callback_query"]
  }, token);
  await telegramApi("setChatMenuButton", {
    menu_button: {type:"web_app", text:"Открыть мини‑приложение", web_app:{url:telegramMiniAppUrl(projectId)}}
  }, token);
  return {enabled:true, id:bot.id || null, username:bot.username || null, botUrl:bot.username ? `https://t.me/${bot.username}` : null, webhook, secret};
}
