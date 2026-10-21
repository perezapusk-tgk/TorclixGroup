import crypto from "node:crypto";

export const EVENT_TYPES = ["pageview", "click", "lead_form", "booking_start", "order_start"];
const MAX_MEMORY = 20000;
const memEvents = [];
const memAudit = [];
let pool = null;

async function db() {
  if (pool || !process.env.DATABASE_URL) return pool;
  const { default: pg } = await import("pg");
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
  });
  return pool;
}

export function normalizeEvent(input = {}) {
  const type = String(input.type || "pageview");
  if (!EVENT_TYPES.includes(type)) return null;
  const sessionId = String(input.sessionId || "");
  if (!/^[A-Za-z0-9._:-]{8,64}$/.test(sessionId)) return null;
  let path = String(input.path || "/").slice(0, 300);
  if (!path.startsWith("/")) path = "/" + path;
  path = path.split("?")[0].split("#")[0] || "/";
  let referrer = null;
  if (input.referrer) {
    try { referrer = new URL(String(input.referrer)).hostname.slice(0, 120); } catch { referrer = null; }
  }
  return { type, sessionId, path, referrer };
}

export async function recordEvent(organizationId, projectId, input) {
  const e = normalizeEvent(input);
  if (!e) return null;
  const row = { id: crypto.randomUUID(), organizationId, projectId, ...e, createdAt: new Date().toISOString() };
  const p = await db();
  if (!p) {
    memEvents.push(row);
    if (memEvents.length > MAX_MEMORY) memEvents.splice(0, memEvents.length - MAX_MEMORY);
    return row;
  }
  await p.query(
    "insert into site_events(id,organization_id,project_id,session_id,type,path,referrer) values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7)",
    [row.id, organizationId, projectId, e.sessionId, e.type, e.path, e.referrer]
  );
  return row;
}

function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }
function topN(map, n = 5, key = "path") {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, count]) => ({ [key]: k, count }));
}

export function summarize(rows, days, now = new Date()) {
  const series = new Map();
  for (let i = days - 1; i >= 0; i--) series.set(dayKey(now.getTime() - i * 86400000), { pageviews: 0, visitors: new Set() });
  const visitors = new Set(), pages = new Map(), refs = new Map(), types = {};
  let pageviews = 0;
  for (const r of rows) {
    const bucket = series.get(dayKey(r.createdAt));
    types[r.type] = (types[r.type] || 0) + 1;
    if (r.type === "pageview") {
      pageviews++;
      pages.set(r.path, (pages.get(r.path) || 0) + 1);
      if (r.referrer) refs.set(r.referrer, (refs.get(r.referrer) || 0) + 1);
      if (bucket) bucket.pageviews++;
    }
    visitors.add(r.sessionId);
    if (bucket) bucket.visitors.add(r.sessionId);
  }
  return {
    days, visitors: visitors.size, pageviews,
    conversions: (types.lead_form || 0) + (types.booking_start || 0) + (types.order_start || 0),
    events: types,
    series: [...series.entries()].map(([date, v]) => ({ date, pageviews: v.pageviews, visitors: v.visitors.size })),
    topPages: topN(pages, 5, "path"), topReferrers: topN(refs, 5, "referrer")
  };
}

export async function analyticsSummary(organizationId, { projectId = null, days = 30 } = {}) {
  days = Math.min(90, Math.max(1, Number(days) || 30));
  const since = new Date(Date.now() - days * 86400000);
  const p = await db();
  if (!p) return summarize(memEvents.filter(r => r.organizationId === organizationId && (!projectId || r.projectId === projectId) && new Date(r.createdAt) >= since), days);
  const params = [organizationId, since.toISOString()];
  let sql = "select session_id,type,path,referrer,created_at from site_events where organization_id=$1::uuid and created_at>=$2";
  if (projectId) { params.push(projectId); sql += " and project_id=$3::uuid"; }
  const r = await p.query(sql + " order by created_at desc limit 200000", params);
  return summarize(r.rows.map(x => ({sessionId:x.session_id,type:x.type,path:x.path,referrer:x.referrer,createdAt:x.created_at})), days);
}

export async function recordAudit(auth, action, entityType = null, entityId = null, meta = {}) {
  try {
    const row = {id:crypto.randomUUID(),organizationId:auth.organization.id,actorId:auth.user?.id||null,actorRole:auth.user?.role||null,action:String(action).slice(0,80),entityType,entityId:entityId==null?null:String(entityId),meta,createdAt:new Date().toISOString()};
    const p = await db();
    if (!p) { memAudit.push(row); if (memAudit.length > MAX_MEMORY) memAudit.splice(0, memAudit.length - MAX_MEMORY); return row; }
    await p.query("insert into audit_log(id,organization_id,actor_id,actor_role,action,entity_type,entity_id,meta) values($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb)",[row.id,row.organizationId,row.actorId,row.actorRole,row.action,entityType,row.entityId,JSON.stringify(meta||{})]);
    return row;
  } catch(error) { console.error("audit log failed",error?.message||error); return null; }
}

export async function listAudit(organizationId, limit = 100) {
  limit = Math.min(500, Math.max(1, Number(limit) || 100));
  const p = await db();
  if (!p) return memAudit.filter(x=>x.organizationId===organizationId).slice(-limit).reverse();
  const r = await p.query("select * from audit_log where organization_id=$1 order by created_at desc limit $2",[organizationId,limit]);
  return r.rows.map(x=>({id:x.id,organizationId:x.organization_id,actorId:x.actor_id,actorRole:x.actor_role,action:x.action,entityType:x.entity_type,entityId:x.entity_id,meta:x.meta,createdAt:x.created_at}));
}
