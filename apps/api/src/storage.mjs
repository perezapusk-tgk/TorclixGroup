import { randomUUID,createHash } from "node:crypto";
import { readdir,readFile } from "node:fs/promises";
import { dirname,resolve } from "node:path";
import { fileURLToPath } from "node:url";

let pool = null;
let initialized = false;
let databaseUnavailable = false;
const memoryPublishedDocuments = new Map();
const memoryOrganizationSettings = new Map();
const memoryBillingWebhookEvents = new Set();

async function getPool(){
  if(pool || databaseUnavailable || !process.env.DATABASE_URL) return pool;
  try{
    const { Pool } = await import("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized:false }
    });
    pool.on("error", error => console.error("Torclix PostgreSQL pool error", error));
    return pool;
  }catch(error){
    databaseUnavailable = true;
    console.error("PostgreSQL driver unavailable", error);
    return null;
  }
}

export async function initStorage(){
  if(initialized) return;
  const db=await getPool();
  if(!db){ initialized=true; return; }
  const migrationsDir=resolve(dirname(fileURLToPath(import.meta.url)),"../../../packages/database/migrations");
  const lockClient=await db.connect();
  try{
    await lockClient.query("select pg_advisory_lock(hashtext('torclixgroup-schema-migrations'))");
    await lockClient.query(`create table if not exists torclix_schema_migrations(
      id text primary key,
      applied_at timestamptz not null default now()
    )`);
    const files=(await readdir(migrationsDir))
      .filter(name=>/^\\d+_.+\\.sql$/.test(name))
      .filter(name=>process.env.NODE_ENV==="production" ? name!=="004_demo_seed.sql" : true)
      .sort();
    for(const file of files){
      const applied=await lockClient.query("select 1 from torclix_schema_migrations where id=$1",[file]);
      if(applied.rowCount) continue;
      const sql=await readFile(resolve(migrationsDir,file),"utf8");
      try{
        await lockClient.query("begin");
        await lockClient.query(sql);
        await lockClient.query("insert into torclix_schema_migrations(id) values($1)",[file]);
        await lockClient.query("commit");
      }catch(error){
        await lockClient.query("rollback");
        throw new Error(`Migration ${file} failed: ${error instanceof Error?error.message:String(error)}`);
      }
    }
    initialized=true;
  }finally{
    try{ await lockClient.query("select pg_advisory_unlock(hashtext('torclixgroup-schema-migrations'))"); }catch{}
    lockClient.release();
  }
}

export async function getSessionUser(userKey,email=null,name=null){
  if(userKey==="demo" && !process.env.DATABASE_URL){
    return {id:"user_demo",email:"demo@torclix.local",name:"Studio Owner"};
  }
  if(String(userKey).startsWith("trial:")){
    const digest=createHash("sha256").update(String(userKey)).digest("hex");
    const id=process.env.DATABASE_URL
      ? digest.slice(0,8)+"-"+digest.slice(8,12)+"-4"+digest.slice(13,16)+"-8"+digest.slice(17,20)+"-"+digest.slice(20,32)
      : "user_trial_"+digest.slice(0,24);
    const trialEmail="trial-"+digest.slice(0,24)+"@torclix.local";
    const db=await getPool();
    if(!db) return {id,email:trialEmail,name:name||"Владелец пробной студии"};
    const {rows}=await db.query(
      "insert into users(id,external_id,email,name) values($1::uuid,$2,$3,$4) on conflict(external_id) do update set name=excluded.name returning id::text,email,name",
      [id,String(userKey),trialEmail,name||"Владелец пробной студии"]
    );
    return rows[0];
  }
  const db=await getPool();
  if(!db) return null;
  let {rows}=await db.query("select id::text,email,name from users where external_id=$1 or id::text=$1 or email=$2 limit 1",[userKey,email||""]);
  if(!rows[0] && userKey==="demo"){
    const created=await db.query(
      "insert into users(external_id,email,name) values($1,$2,$3) on conflict(external_id) do update set email=excluded.email,name=excluded.name returning id::text,email,name",
      ["demo","demo@torclix.local","Studio Owner"]
    );
    rows=created.rows;
  }
  return rows[0]||null;
}

export async function listOrganizationsForUser(userId){
  if(userId==="user_demo" && !process.env.DATABASE_URL){
    return [{id:"org_demo",name:"Torclix Demo",slug:"torclix-demo",plan:"pro",role:"owner"}];
  }
  const db=await getPool();
  if(!db) return [];
  let {rows}=await db.query(`select o.id::text,o.name,o.slug,o.plan,m.role
    from organizations o join memberships m on m.organization_id=o.id
    where m.user_id=$1 order by o.created_at asc`,[userId]);
  if(!rows.length){
    const isTrial=!String(userId).startsWith("user_demo");
    const orgId=isTrial?randomUUID():"00000000-0000-4000-8000-000000000001";
    const slug=isTrial?("trial-"+String(userId).replace(/[^a-z0-9_]/gi,"").slice(-24)):"torclix-demo";
    const org=await db.query(
      "insert into organizations(id,name,slug,plan) values($1,$2,$3,$4) on conflict(slug) do update set name=excluded.name,plan=excluded.plan returning id::text,name,slug,plan",
      [orgId,isTrial?"Пробная студия":"Демо TorclixGroup",slug,isTrial?"starter":"pro"]
    );
    await db.query(
      "insert into memberships(organization_id,user_id,role) values($1::uuid,$2::uuid,$3) on conflict(organization_id,user_id) do update set role=excluded.role",
      [org.rows[0].id,userId,"owner"]
    );
    rows=[{...org.rows[0],role:"owner"}];
  }
  return rows;
}

export async function listTeamMembers(organizationId){
  if(organizationId==="org_demo" && !process.env.DATABASE_URL){
    return [
      {id:"user_demo",name:"Studio Owner",email:"demo@torclix.local",role:"owner",status:"active"},
      {id:"user_editor",name:"Creative Editor",email:"editor@torclix.local",role:"editor",status:"invited"}
    ];
  }
  const db=await getPool();
  if(!db) return [];
  const {rows}=await db.query(`select u.id::text,u.name,u.email,m.role
    from users u join memberships m on m.user_id=u.id
    where m.organization_id=$1::uuid order by u.created_at asc`,[organizationId]);
  return rows.map(row=>({...row,status:"active"}));
}

export async function getMembershipRole(userId,organizationId){
  if(userId==="user_demo" && organizationId==="org_demo" && !process.env.DATABASE_URL) return "owner";
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query("select role from memberships where user_id=$1 and organization_id=$2",[userId,organizationId]);
  return rows[0]?.role||null;
}

export async function getOrganizationById(organizationId){
  if(organizationId==="org_demo" && !process.env.DATABASE_URL) return {id:"org_demo",name:"Torclix Demo",slug:"torclix-demo",plan:"pro"};
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query("select id::text,name,slug,plan from organizations where id=$1::uuid limit 1",[organizationId]);
  return rows[0]||null;
}

export async function getOrganizationSettings(organizationId){
  const db=await getPool();
  if(!db) return memoryOrganizationSettings.get(organizationId)||{};
  const {rows}=await db.query("select settings from organizations where id=$1::uuid limit 1",[organizationId]);
  return rows[0]?.settings||{};
}
export async function updateOrganizationSettings(organizationId,settings){
  const safe=settings&&typeof settings==="object"&&!Array.isArray(settings)?settings:{};
  const db=await getPool();
  if(!db){memoryOrganizationSettings.set(organizationId,safe);return safe;}
  const {rows}=await db.query(
    "update organizations set settings=$2::jsonb where id=$1::uuid returning settings",
    [organizationId,JSON.stringify(safe)]
  );
  return rows[0]?.settings||safe;
}

export async function setOrganizationPlan(organizationId,plan){
  const db=await getPool();
  if(!db) return {id:organizationId,plan,source:"memory"};
  const {rows}=await db.query("update organizations set plan=$2,updated_at=now() where id=$1 returning id::text as id,plan",[organizationId,plan]);
  return rows[0]?{...rows[0],source:"internal"}:null;
}

export async function updateBilling(organizationId,{customerId=null,subscriptionId=null,status=null,plan=null}={}){
  const db=await getPool();
  if(!db) return {id:organizationId,customerId,subscriptionId,status,plan,source:"memory"};
  const allowedStatus=new Set(["inactive","trialing","active","past_due","canceled","unpaid"]);
  const safeStatus=status&&allowedStatus.has(status)?status:null;
  const allowedPlan=new Set(["starter","pro","scale"]);
  const safePlan=plan&&allowedPlan.has(plan)?plan:null;
  const {rows}=await db.query(
    `update organizations set
      yookassa_customer_id=coalesce($2,yookassa_customer_id),
      yookassa_payment_id=coalesce($3,yookassa_payment_id),
      billing_status=coalesce($4,billing_status),
      plan=coalesce($5,plan),
      updated_at=now()
    where id=$1::uuid
    returning id::text as id,plan,yookassa_customer_id as "customerId",yookassa_payment_id as "subscriptionId",billing_status as status`,
    [organizationId,customerId,subscriptionId,safeStatus,safePlan]);
  return rows[0]?{...rows[0],source:"yookassa"}:null;
}
export async function claimBillingWebhookEvent(eventId){
  const id=String(eventId||"").trim();
  if(!id)return true;
  const db=await getPool();
  if(!db){ if(memoryBillingWebhookEvents.has(id)) return false; memoryBillingWebhookEvents.add(id); return true; }
  const result=await db.query("insert into yookassa_webhook_events(event_id) values($1) on conflict(event_id) do nothing",[id]);
  return result.rowCount===1;
}

export async function findOrganizationByBilling({customerId=null,subscriptionId=null}={}){
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query(
    `select id::text as id,plan,yookassa_customer_id as "customerId",yookassa_payment_id as "subscriptionId",billing_status as status
     from organizations where ($1 is not null and yookassa_customer_id=$1) or ($2 is not null and yookassa_payment_id=$2) limit 1`,
    [customerId,subscriptionId]);
  return rows[0]||null;
}

export async function listProjects(fallback,organizationId){
  const db=await getPool();
  if(!db) return [...fallback.values()].filter(project=>!organizationId||project.organizationId===organizationId);
  const {rows}=await db.query(`select id::text,organization_id::text as "organizationId",client_id::text as "clientId",
    name,type,industry,status,slug from projects where organization_id=$1 order by created_at desc`,[organizationId]);
  return rows;
}

export async function getPublishedProject(projectId){
  const db=await getPool(); if(!db) return null;
  const {rows}=await db.query('select id::text,organization_id::text as "organizationId",name,type,industry,slug from projects where id=$1::uuid limit 1',[projectId]);
  return rows[0]||null;
}

export async function getProject(projectId,organizationId){
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query(`select id::text,organization_id::text as "organizationId",client_id::text as "clientId",
    name,type,industry,status,slug from projects where id=$1 and organization_id=$2 limit 1`,[projectId,organizationId]);
  return rows[0]||null;
}

export async function saveProject(project){
  const db=await getPool();
  if(!db) return project;
  await db.query(`insert into projects(id,organization_id,client_id,name,type,industry,status,slug)
    values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)
    on conflict(id) do update set name=excluded.name,client_id=excluded.client_id,type=excluded.type,
    industry=excluded.industry,status=excluded.status,slug=excluded.slug,updated_at=now()`,
    [project.id,project.organizationId,project.clientId||null,project.name,project.type,project.industry,project.status,project.slug||null]);
  return project;
}

export async function ensureClientPortalToken(projectId,organizationId){
 const db=await getPool();
 if(db){const existing=await db.query("select client_portal_token from projects where id=$1::uuid and organization_id=$2::uuid",[projectId,organizationId]);if(!existing.rowCount)return null;if(existing.rows[0].client_portal_token)return existing.rows[0].client_portal_token;const token=randomUUID().replace(/-/g,"")+randomUUID().replace(/-/g,"");const {rows}=await db.query("update projects set client_portal_token=$1 where id=$2::uuid and organization_id=$3::uuid returning client_portal_token",[token,projectId,organizationId]);return rows[0]?.client_portal_token||null;}
 return null;
}
export async function getPublicClientPortal(token){
 const db=await getPool();if(!db)return null;
 const {rows}=await db.query("select id::text, name, slug, client_portal_status as status, client_portal_note as note, client_portal_updated_at as updated_at from projects where client_portal_token=$1 and status='active' limit 1",[token]);return rows[0]||null;
}
export async function updateClientPortal(projectId,organizationId,status,note){
  const db=await getPool();
  const allowed=new Set(["draft","review","approved","changes_requested"]);
  const nextStatus=allowed.has(status)?status:"draft";
  const nextNote=String(note||"").slice(0,4000);
  if(!db) return {projectId,status:nextStatus,note:nextNote,updatedAt:new Date().toISOString()};
  const {rows}=await db.query(`update projects set client_portal_status=$3,client_portal_note=$4,client_portal_updated_at=now(),updated_at=now()
    where id=$1::uuid and organization_id=$2::uuid
    returning id,client_portal_status as status,client_portal_note as note,client_portal_updated_at as "updatedAt"`,[projectId,organizationId,nextStatus,nextNote]);
  return rows[0]||null;
}

export async function updatePublicClientPortal(token,status,note){
  const db=await getPool();
  const allowed=new Set(["review","approved","changes_requested"]);
  const nextStatus=allowed.has(status)?status:"review";
  const nextNote=String(note||"").slice(0,4000);
  if(!db) return null;
  const {rows}=await db.query(`update projects set client_portal_status=$2,client_portal_note=$3,client_portal_updated_at=now(),updated_at=now()
    where client_portal_token=$1 and status='active'
    returning id,name,slug,client_portal_status as status,client_portal_note as note,client_portal_updated_at as "updatedAt"`,[token,nextStatus,nextNote]);
  return rows[0]||null;
}

export async function getClientPortal(projectId,organizationId){
  const db=await getPool();
  if(!db) return {projectId,status:"draft",note:"",updatedAt:null,token:null};
  const {rows}=await db.query(`select id,client_portal_status as status,client_portal_note as note,client_portal_updated_at as "updatedAt",client_portal_token as token
    from projects where id=$1::uuid and organization_id=$2::uuid limit 1`,[projectId,organizationId]);
  return rows[0]||null;
}

export async function getPublishedDocument(projectId){
  const db=await getPool();
  if(!db) return memoryPublishedDocuments.get(projectId)||null;
  const {rows}=await db.query("select published_document from site_documents where project_id=$1::uuid limit 1",[projectId]);
  return rows[0]?.published_document ?? null;
}

export async function getDocument(projectId,organizationId,fallback){
  const db=await getPool();
  if(!db) return fallback();
  const {rows}=await db.query(`select d.document from site_documents d join projects p on p.id=d.project_id
    where d.project_id=$1::uuid and p.organization_id=$2::uuid limit 1`,[projectId,organizationId]);
  return rows[0]?.document ?? fallback();
}

export async function publishDocument(projectId,organizationId,document){
  const db=await getPool();
  if(!db){ memoryPublishedDocuments.set(projectId,document); return document; }
  await db.query(`insert into site_documents(project_id,document,published_document)
    select $1::uuid,$3::jsonb,$3::jsonb
    where exists(select 1 from projects where id=$1::uuid and organization_id=$2::uuid)
    on conflict(project_id) do update set published_document=excluded.published_document,published_version=site_documents.version,updated_at=now()`,
    [projectId,organizationId,JSON.stringify(document)]);
  return document;
}

export async function unpublishDocument(projectId,organizationId){
  const db=await getPool();
  if(!db){ memoryPublishedDocuments.delete(projectId); return; }
  await db.query("update site_documents set published_document=null,published_version=null,updated_at=now() where project_id=$1::uuid and exists(select 1 from projects where id=$1::uuid and organization_id=$2::uuid)",[projectId,organizationId]);
}

export async function saveDocument(projectId,organizationId,document){
  const db=await getPool();
  if(!db) return document;
  const result=await db.query(`insert into site_documents(project_id,document)
    select $1::uuid,$3::jsonb
    where exists(select 1 from projects where id=$1::uuid and organization_id=$2::uuid)
    on conflict(project_id) do update set document=excluded.document,version=site_documents.version+1,updated_at=now()
    returning version`,[projectId,organizationId,JSON.stringify(document)]);
  const version=result.rows[0]?.version;
  if(version){
    await db.query(`insert into site_document_versions(project_id,version,document)
      values($1::uuid,$2,$3::jsonb)
      on conflict(project_id,version) do nothing`,[projectId,version,JSON.stringify(document)]);
  }
  return document;
}


export async function listStaff(fallback,organizationId){
 const db=await getPool(); if(!db) return [...fallback.values()].filter(x=>x.organizationId===organizationId);
 const {rows}=await db.query(`select id::text,name,role,email,phone,status,created_at as "createdAt",updated_at as "updatedAt" from staff_members where organization_id=$1::uuid order by created_at desc`,[organizationId]); return rows;
}
export async function saveStaff(member){
 const db=await getPool(); if(!db) return member;
 const {rows}=await db.query(`insert into staff_members(id,organization_id,name,role,email,phone,status) values($1::uuid,$2::uuid,$3,$4,$5,$6,$7) on conflict(id) do update set name=excluded.name,role=excluded.role,email=excluded.email,phone=excluded.phone,status=excluded.status,updated_at=now() returning id::text,name,role,email,phone,status,created_at as "createdAt",updated_at as "updatedAt"`,[member.id,member.organizationId,member.name,member.role||"staff",member.email||null,member.phone||null,member.status||"active"]); return rows[0];
}
export async function listCalendarEvents(fallback,organizationId,from,to){
 const db=await getPool(); if(!db) return [...fallback.values()].filter(x=>x.organizationId===organizationId&&(!from||x.startAt>=from)&&(!to||x.startAt<=to));
 const params=[organizationId]; let where="organization_id=$1::uuid"; if(from){params.push(from);where+=" and end_at >= $"+params.length;} if(to){params.push(to);where+=" and start_at <= $"+params.length;}
 const {rows}=await db.query(`select id::text,project_id::text as "projectId",staff_id::text as "staffId",booking_id::text as "bookingId",title,start_at as "startAt",end_at as "endAt",status,notes,created_at as "createdAt" from calendar_events where ${where} order by start_at`,params); return rows;
}
export async function saveCalendarEvent(event){
 const db=await getPool(); if(!db) return event;
 const {rows}=await db.query(`insert into calendar_events(id,organization_id,project_id,staff_id,booking_id,title,start_at,end_at,status,notes) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10) on conflict(id) do update set project_id=excluded.project_id,staff_id=excluded.staff_id,booking_id=excluded.booking_id,title=excluded.title,start_at=excluded.start_at,end_at=excluded.end_at,status=excluded.status,notes=excluded.notes,updated_at=now() returning id::text,project_id::text as "projectId",staff_id::text as "staffId",booking_id::text as "bookingId",title,start_at as "startAt",end_at as "endAt",status,notes`,[event.id,event.organizationId,event.projectId||null,event.staffId||null,event.bookingId||null,event.title,event.startAt,event.endAt,event.status||"scheduled",event.notes||null]); return rows[0];
}
export async function listRecords(table,fallback,organizationId){
  const db=await getPool();
  if(!db) return [...fallback.values()].filter(item=>!organizationId||item.organizationId===organizationId);
  const allowed={clients:"clients",leads:"leads",bookings:"bookings"};
  const actual=allowed[table]; if(!actual) return [];
  const {rows}=await db.query(`select * from ${actual} where organization_id=$1::uuid order by created_at desc`,[organizationId]);
  return rows.map(r=>({
    id:r.id?.toString(),organizationId:r.organization_id?.toString(),projectId:r.project_id?.toString(),
    name:r.name,email:r.email,phone:r.phone,source:r.source,status:r.status,
    customerName:r.customer_name,customerEmail:r.customer_email,customerPhone:r.customer_phone,telegramUserId:r.telegram_user_id?.toString(),telegramUsername:r.telegram_username,startAt:r.start_at,service:r.service
  }));
}

export async function updateOrderPayment(orderId,paymentInvoiceUrl,paymentPayload,commissionRate=5){
  const db=await getPool();
  if(!db) return null;
  const totalExpression="total::numeric";
  const {rows}=await db.query(`update orders set payment_provider='telegram',payment_invoice_url=$2,payment_payload=$3,
    commission_rate=$4::numeric,commission_amount=round((total::numeric*$4::numeric/100),2),
    seller_amount=round((total::numeric-(total::numeric*$4::numeric/100)),2),updated_at=now()
    where id=$1::uuid
    returning id::text,organization_id::text as "organizationId",project_id::text as "projectId",
    customer_name as "customerName",customer_email as "customerEmail",customer_phone as "customerPhone",
    status,currency,total::text,source,payment_provider as "paymentProvider",payment_invoice_url as "paymentInvoiceUrl",
    payment_payload as "paymentPayload",commission_rate as "commissionRate",commission_amount as "commissionAmount",
    seller_amount as "sellerAmount",telegram_payment_charge_id as "telegramPaymentChargeId",
    created_at as "createdAt",updated_at as "updatedAt"`,[orderId,paymentInvoiceUrl,paymentPayload,commissionRate]);
  return rows[0]||null;
}
export async function markOrderPaid(orderId,telegramPaymentChargeId,paymentProvider="telegram"){
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query(`update orders set status='paid',payment_provider=$2,payment_payload=coalesce(payment_payload,''),telegram_payment_charge_id=$3,updated_at=now()
    where id=$1::uuid
    returning id::text,organization_id::text as "organizationId",project_id::text as "projectId",
    customer_name as "customerName",customer_email as "customerEmail",customer_phone as "customerPhone",
    status,currency,total::text,source,payment_provider as "paymentProvider",payment_invoice_url as "paymentInvoiceUrl",
    payment_payload as "paymentPayload",commission_rate as "commissionRate",commission_amount as "commissionAmount",
    seller_amount as "sellerAmount",telegram_payment_charge_id as "telegramPaymentChargeId",
    created_at as "createdAt",updated_at as "updatedAt"`,[orderId,paymentProvider,telegramPaymentChargeId||null]);
  return rows[0]||null;
}
export async function listOrders(fallback,organizationId,projectId=null){
  const db=await getPool();
  if(!db) return [...fallback.values()].filter(x=>x.organizationId===organizationId&&(!projectId||x.projectId===projectId));
  const params=[organizationId]; let where="organization_id=$1::uuid";
  if(projectId){params.push(projectId);where+=" and project_id=$2::uuid";}
  const {rows}=await db.query(`select id::text,organization_id::text as "organizationId",project_id::text as "projectId",
    customer_id::text as "customerId",customer_name as "customerName",customer_email as "customerEmail",
    customer_phone as "customerPhone",status,currency,total::text,source,payment_provider as "paymentProvider",
    payment_invoice_url as "paymentInvoiceUrl",payment_payload as "paymentPayload",
    commission_rate as "commissionRate",commission_amount as "commissionAmount",seller_amount as "sellerAmount",
    telegram_payment_charge_id as "telegramPaymentChargeId",created_at as "createdAt",updated_at as "updatedAt"
    from orders where ${where} order by created_at desc`,params);
  return rows;
}
export async function saveOrder(order,items){
  const db=await getPool();
  if(!db) return {...order,items};
  const client=await db.connect();
  try{
    await client.query("begin");
    let customerId=order.customerId||null;
    if(!customerId&&order.telegramUserId){
      const upserted=await client.query(`insert into clients(id,organization_id,name,email,telegram_user_id,telegram_username)
        values($1::uuid,$2::uuid,$3,$4,$5::bigint,$6)
        on conflict (organization_id,telegram_user_id) where telegram_user_id is not null
        do update set name=excluded.name,
          email=coalesce(excluded.email,clients.email),
          telegram_username=coalesce(excluded.telegram_username,clients.telegram_username)
        returning id`,
        [newId(),order.organizationId,order.customerName,order.customerEmail||null,order.telegramUserId,order.telegramUsername||null]);
      customerId=upserted.rows[0].id;
    }
    await client.query(`insert into orders(id,organization_id,project_id,customer_id,customer_name,customer_email,customer_phone,status,currency,total,source,payment_provider,payment_invoice_url,payment_payload,commission_rate,commission_amount,seller_amount,telegram_payment_charge_id)
      values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10::numeric,$11,$12,$13,$14,$15::numeric,$16::numeric,$17::numeric,$18)`,
      [order.id,order.organizationId,order.projectId,customerId,order.customerName,order.customerEmail||null,order.customerPhone||null,order.status,order.currency,order.total,order.source,order.paymentProvider||null,order.paymentInvoiceUrl||null,order.paymentPayload||null,order.commissionRate??5,order.commissionAmount??Number(order.total||0)*0.05,order.sellerAmount??Number(order.total||0)*0.95,order.telegramPaymentChargeId||null]);
    for(const item of items){
      if(item.catalogItemId){
        const stock=await client.query(`update catalog_items
          set stock=stock-$2,updated_at=now()
          where id=$1::uuid and stock is not null and stock >= $2
          returning id`,[item.catalogItemId,item.quantity]);
        if(stock.rowCount===0){
          const unlimited=await client.query(`select id from catalog_items where id=$1::uuid and stock is null`,[item.catalogItemId]);
          if(unlimited.rowCount===0) throw new Error("INSUFFICIENT_STOCK");
        }
      }
      await client.query(`insert into order_items(id,order_id,catalog_item_id,name,quantity,unit_price,total)
        values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::numeric,$7::numeric)`,
        [item.id,order.id,item.catalogItemId||null,item.name,item.quantity,item.unitPrice,item.total]);
    }
    await client.query("commit");
    return {...order,items};
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}
export async function updateOrderStatus(orderId,organizationId,status){
  const db=await getPool(); if(!db) return null;
  const {rows}=await db.query(`update orders set status=$3,updated_at=now()
    where id=$1::uuid and organization_id=$2::uuid
    returning id::text,organization_id::text as "organizationId",project_id::text as "projectId",
    customer_name as "customerName",customer_email as "customerEmail",customer_phone as "customerPhone",
    status,currency,total::text,source,payment_provider as "paymentProvider",payment_invoice_url as "paymentInvoiceUrl",
    payment_payload as "paymentPayload",commission_rate as "commissionRate",commission_amount as "commissionAmount",
    seller_amount as "sellerAmount",telegram_payment_charge_id as "telegramPaymentChargeId",
    created_at as "createdAt",updated_at as "updatedAt"`,
    [orderId,organizationId,status]);
  return rows[0]||null;
}

export async function listCatalogItems(fallback,organizationId,projectId=null){
  const db=await getPool();
  if(!db){
    return [...fallback.values()].filter(item=>item.organizationId===organizationId&&(!projectId||item.projectId===projectId)&&item.status!=="archived");
  }
  const params=[organizationId];
  let where="organization_id=$1::uuid and status <> 'archived'";
  if(projectId){params.push(projectId);where+=" and project_id=$2::uuid";}
  const {rows}=await db.query(`select id::text,organization_id::text as "organizationId",project_id::text as "projectId",
    name,slug,item_type as "itemType",description,price::text,currency,category,status,stock,image_url as "imageUrl",
    created_at as "createdAt",updated_at as "updatedAt"
    from catalog_items where ${where} order by created_at desc`,params);
  return rows;
}

export async function getCatalogItem(itemId,organizationId){
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query(`select id::text,organization_id::text as "organizationId",project_id::text as "projectId",
    name,slug,item_type as "itemType",description,price::text,currency,category,status,stock,image_url as "imageUrl",
    created_at as "createdAt",updated_at as "updatedAt"
    from catalog_items where id=$1::uuid and organization_id=$2::uuid limit 1`,[itemId,organizationId]);
  return rows[0]||null;
}

export async function saveCatalogItem(item){
  const db=await getPool();
  if(!db) return item;
  const {rows}=await db.query(`insert into catalog_items(
    id,organization_id,project_id,name,slug,item_type,description,price,currency,category,status,stock,image_url)
    values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8::numeric,$9,$10,$11,$12,$13)
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,item_type=excluded.item_type,
    description=excluded.description,price=excluded.price,currency=excluded.currency,category=excluded.category,
    status=excluded.status,stock=excluded.stock,image_url=excluded.image_url,updated_at=now()
    returning id::text,organization_id::text as "organizationId",project_id::text as "projectId",
    name,slug,item_type as "itemType",description,price::text,currency,category,status,stock,image_url as "imageUrl",
    created_at as "createdAt",updated_at as "updatedAt"`,
    [item.id,item.organizationId,item.projectId,item.name,item.slug,item.itemType,item.description||null,item.price,item.currency,item.category||null,item.status,item.stock,item.imageUrl||null]);
  return rows[0]||item;
}

export async function archiveCatalogItem(itemId,organizationId){
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query(`update catalog_items set status='archived',updated_at=now()
    where id=$1::uuid and organization_id=$2::uuid
    returning id::text,organization_id::text as "organizationId",project_id::text as "projectId",name,slug,
    item_type as "itemType",description,price::text,currency,category,status,stock,image_url as "imageUrl",
    created_at as "createdAt",updated_at as "updatedAt"`,[itemId,organizationId]);
  return rows[0]||null;
}

export async function findDomain(hostname){
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query('select id::text,organization_id::text as "organizationId",project_id::text as "projectId",hostname,status,ssl_status as "sslStatus" from domains where hostname=$1 and status in (\'active\',\'verified\') limit 1',[hostname]);
  return rows[0]||null;
}

export async function listDomains(organizationId){
  const db=await getPool(); if(!db) return [];
  const {rows}=await db.query('select id::text,organization_id::text as "organizationId",project_id::text as "projectId",hostname,status,ssl_status as "sslStatus",verification_token as "verificationToken",verified_at as "verifiedAt" from domains where organization_id=$1::uuid order by created_at desc',[organizationId]);
  return rows;
}

export async function saveDomain(domain){
  const db=await getPool(); if(!db) return domain;
  await db.query("insert into domains(id,organization_id,project_id,hostname,status,ssl_status,verification_token) values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7)",[domain.id,domain.organizationId,domain.projectId||null,domain.hostname,domain.status||"pending",domain.sslStatus||"pending",domain.verificationToken||null]);
  return domain;
}

export async function verifyDomain(domainId,organizationId){
  const db=await getPool(); if(!db) return null;
  const {rows}=await db.query(`update domains set status='verified',verified_at=now(),ssl_status=case when ssl_status='pending' then 'pending' else ssl_status end
    where id=$1::uuid and organization_id=$2::uuid and status='pending' returning id::text,organization_id::text as "organizationId",project_id::text as "projectId",hostname,status,ssl_status as "sslStatus",verification_token as "verificationToken",verified_at as "verifiedAt"`,[domainId,organizationId]);
  return rows[0]||null;
}

export async function saveRecord(table,item){
  const db=await getPool(); if(!db) return item;
  const queries={
    clients:[`insert into clients(id,organization_id,name,email,telegram_user_id,telegram_username) values($1::uuid,$2::uuid,$3,$4,$5::bigint,$6)
      on conflict(id) do update set name=excluded.name,email=excluded.email,telegram_user_id=excluded.telegram_user_id,telegram_username=excluded.telegram_username`,
      [item.id,item.organizationId,item.name,item.email||null,item.telegramUserId||null,item.telegramUsername||null]],
    leads:[`insert into leads(id,organization_id,project_id,name,email,phone,source,status,telegram_user_id,telegram_username)
      values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9::bigint,$10)
      on conflict(id) do update set status=excluded.status,name=excluded.name,email=excluded.email,phone=excluded.phone,source=excluded.source,telegram_user_id=excluded.telegram_user_id,telegram_username=excluded.telegram_username`,
      [item.id,item.organizationId,item.projectId||null,item.name,item.email||null,item.phone||null,item.source||"website",item.status||"new",item.telegramUserId||null,item.telegramUsername||null]],
    bookings:[`insert into bookings(id,organization_id,project_id,customer_name,customer_email,customer_phone,telegram_user_id,telegram_username,start_at,service,status)
      values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11)
      on conflict(id) do update set status=excluded.status,customer_name=excluded.customer_name,
      customer_email=excluded.customer_email,customer_phone=excluded.customer_phone,telegram_user_id=excluded.telegram_user_id,
      telegram_username=excluded.telegram_username,start_at=excluded.start_at,service=excluded.service`,
      [item.id,item.organizationId,item.projectId||null,item.customerName,item.customerEmail||null,item.customerPhone||null,item.telegramUserId||null,item.telegramUsername||null,item.startAt,item.service||null,item.status||"pending"]]
  };
  const q=queries[table]; if(q) await db.query(q[0],q[1]);
  return item;
}

export async function getTelegramIntegration(organizationId,projectId){
  const db=await getPool(); if(!db) return null;
  const {rows}=await db.query(`select id::text,organization_id::text as "organizationId",project_id::text as "projectId",bot_id as "botId",bot_username as "botUsername",enabled,webhook_url as "webhookUrl",last_checked_at as "lastCheckedAt",created_at as "createdAt",updated_at as "updatedAt" from telegram_integrations where organization_id=$1::uuid and project_id=$2::uuid limit 1`,[organizationId,projectId]);
  return rows[0]||null;
}
export async function listTelegramIntegrations(organizationId){
  const db=await getPool(); if(!db) return [];
  const {rows}=await db.query(`select id::text,organization_id::text as "organizationId",project_id::text as "projectId",bot_id as "botId",bot_username as "botUsername",enabled,webhook_url as "webhookUrl",last_checked_at as "lastCheckedAt",created_at as "createdAt",updated_at as "updatedAt" from telegram_integrations where organization_id=$1::uuid order by created_at desc`,[organizationId]);
  return rows;
}
export async function saveTelegramIntegration(integration){
  const db=await getPool(); if(!db) return integration;
  await db.query(`insert into telegram_integrations(id,organization_id,project_id,bot_id,bot_username,enabled,webhook_url,last_checked_at)
    values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,now())
    on conflict(organization_id,project_id) do update set bot_id=excluded.bot_id,bot_username=excluded.bot_username,enabled=excluded.enabled,webhook_url=excluded.webhook_url,last_checked_at=now(),updated_at=now()`,
    [integration.id,integration.organizationId,integration.projectId,integration.botId||null,integration.botUsername||null,integration.enabled!==false,integration.webhookUrl||null]);
  return integration;
}
export function newId(){ return randomUUID(); }