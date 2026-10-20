import { randomUUID } from "node:crypto";

let pool = null;
let initialized = false;
let databaseUnavailable = false;

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

  await db.query(`create extension if not exists pgcrypto`);
  await db.query(`create table if not exists organizations (
    id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
    plan text not null default 'starter', created_at timestamptz not null default now()
  )`);
  await db.query(`create table if not exists users (
    id uuid primary key default gen_random_uuid(), email text not null unique, name text not null,
    created_at timestamptz not null default now()
  )`);
  await db.query(`create table if not exists memberships (
    organization_id uuid not null references organizations(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    role text not null default 'member', created_at timestamptz not null default now(),
    primary key (organization_id,user_id)
  )`);
  await db.query(`create table if not exists clients (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
    name text not null, email text, created_at timestamptz not null default now()
  )`);
  await db.query(`create table if not exists projects (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
    client_id uuid references clients(id) on delete set null, name text not null, type text not null,
    industry text not null, status text not null default 'draft', slug text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`);
  await db.query(`create table if not exists site_documents (
    project_id uuid primary key references projects(id) on delete cascade,
    version integer not null default 1, document jsonb not null default '{"pages":[]}'::jsonb,
    published_document jsonb, updated_at timestamptz not null default now()
  )`);
  await db.query(`create table if not exists leads (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
    project_id uuid references projects(id) on delete cascade, name text not null, email text, phone text,
    source text, status text not null default 'new', created_at timestamptz not null default now()
  )`);
  await db.query(`create table if not exists bookings (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
    project_id uuid references projects(id) on delete cascade, customer_name text not null, customer_email text,
    service text, start_at timestamptz not null, status text not null default 'pending',
    created_at timestamptz not null default now()
  )`);
  await db.query(`create table if not exists domains (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
    project_id uuid references projects(id) on delete cascade, hostname text not null unique,
    status text not null default 'pending', ssl_status text not null default 'pending',
    created_at timestamptz not null default now()
  )`);
  await db.query(`create index if not exists projects_org_idx on projects(organization_id)`);
  await db.query(`create index if not exists clients_org_idx on clients(organization_id)`);
  await db.query(`create index if not exists leads_org_idx on leads(organization_id)`);
  await db.query(`create index if not exists bookings_org_idx on bookings(organization_id)`);
  initialized=true;
}

export async function getSessionUser(userKey){
  if(userKey==="demo" && !process.env.DATABASE_URL){
    return {id:"user_demo",email:"demo@torclix.local",name:"Studio Owner"};
  }
  const db=await getPool();
  if(!db) return null;
  const {rows}=await db.query("select id::text,email,name from users where id::text=$1 or email=$1 limit 1",[userKey]);
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

export async function getDocument(projectId,organizationId,fallback){
  const db=await getPool();
  if(!db) return fallback();
  const {rows}=await db.query(`select d.document from site_documents d join projects p on p.id=d.project_id
    where d.project_id=$1::uuid and p.organization_id=$2::uuid limit 1`,[projectId,organizationId]);
  return rows[0]?.document ?? fallback();
}

export async function saveDocument(projectId,organizationId,document){
  const db=await getPool();
  if(!db) return document;
  await db.query(`insert into site_documents(project_id,document) select $1::uuid,$3::jsonb
    where exists(select 1 from projects where id=$1::uuid and organization_id=$2::uuid)
    on conflict(project_id) do update set document=excluded.document,version=site_documents.version+1,updated_at=now()`,
    [projectId,organizationId,JSON.stringify(document)]);
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
