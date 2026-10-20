import { randomUUID } from "node:crypto";

let pool = null;
let initialized = false;
let databaseUnavailable = false;
const memoryPublishedDocuments = new Map();

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
  // Schema creation is migration-owned. API startup only verifies that the
  // canonical schema is present; run `pnpm --filter @torclix/api migrate`
  // before starting an environment backed by PostgreSQL.
  await db.query("select 1 from organizations limit 1");
  initialized=true;
}

export async function getSessionUser(userKey,email=null,name=null){
  if(userKey==="demo" && !process.env.DATABASE_URL){
    return {id:"user_demo",email:"demo@torclix.local",name:"Studio Owner"};
  }
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query("select id::text,email,name from users where external_id=$1 or id::text=$1 or email=$2 limit 1",[userKey,email||""]);
  return rows[0]||null;
}

export async function listOrganizationsForUser(userId){
  if(userId==="user_demo" && !process.env.DATABASE_URL){
    return [{id:"org_demo",name:"Torclix Demo",slug:"torclix-demo",plan:"pro",role:"owner"}];
  }
  const db=await getPool();
  if(!db) return [];
  const {rows}=await db.query(`select o.id::text,o.name,o.slug,o.plan,m.role
    from organizations o join memberships m on m.organization_id=o.id
    where m.user_id=$1 order by o.created_at asc`,[userId]);
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

export async function listRecords(table,fallback,organizationId){
  const db=await getPool();
  if(!db) return [...fallback.values()].filter(item=>!organizationId||item.organizationId===organizationId);
  const allowed={clients:"clients",leads:"leads",bookings:"bookings"};
  const actual=allowed[table]; if(!actual) return [];
  const {rows}=await db.query(`select * from ${actual} where organization_id=$1::uuid order by created_at desc`,[organizationId]);
  return rows.map(r=>({
    id:r.id?.toString(),organizationId:r.organization_id?.toString(),projectId:r.project_id?.toString(),
    name:r.name,email:r.email,phone:r.phone,source:r.source,status:r.status,
    customerName:r.customer_name,customerEmail:r.customer_email,startAt:r.start_at,service:r.service
  }));
}

export async function findDomain(hostname){
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query('select id::text,organization_id::text as "organizationId",project_id::text as "projectId",hostname,status,ssl_status as "sslStatus" from domains where hostname=$1 and status in (\'active\',\'verified\') limit 1',[hostname]);
  return rows[0]||null;
}

export async function listDomains(organizationId){
  const db=await getPool(); if(!db) return [];
  const {rows}=await db.query('select id::text,organization_id::text as "organizationId",project_id::text as "projectId",hostname,status,ssl_status as "sslStatus" from domains where organization_id=$1::uuid order by created_at desc',[organizationId]);
  return rows;
}

export async function saveDomain(domain){
  const db=await getPool(); if(!db) return domain;
  await db.query("insert into domains(id,organization_id,project_id,hostname,status,ssl_status) values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6)",[domain.id,domain.organizationId,domain.projectId||null,domain.hostname,domain.status||"pending",domain.sslStatus||"pending"]);
  return domain;
}

export async function saveRecord(table,item){
  const db=await getPool(); if(!db) return item;
  const queries={
    clients:[`insert into clients(id,organization_id,name,email) values($1::uuid,$2::uuid,$3,$4)
      on conflict(id) do update set name=excluded.name,email=excluded.email`,
      [item.id,item.organizationId,item.name,item.email||null]],
    leads:[`insert into leads(id,organization_id,project_id,name,email,phone,source,status)
      values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)
      on conflict(id) do update set status=excluded.status,name=excluded.name,email=excluded.email,phone=excluded.phone,source=excluded.source`,
      [item.id,item.organizationId,item.projectId||null,item.name,item.email||null,item.phone||null,item.source||"website",item.status||"new"]],
    bookings:[`insert into bookings(id,organization_id,project_id,customer_name,customer_email,start_at,service,status)
      values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)
      on conflict(id) do update set status=excluded.status,customer_name=excluded.customer_name,
      customer_email=excluded.customer_email,start_at=excluded.start_at,service=excluded.service`,
      [item.id,item.organizationId,item.projectId||null,item.customerName,item.customerEmail||null,item.startAt,item.service||null,item.status||"pending"]]
  };
  const q=queries[table]; if(q) await db.query(q[0],q[1]);
  return item;
}

export function newId(){ return randomUUID(); }
