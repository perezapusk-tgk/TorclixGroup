import { randomUUID } from "node:crypto";

let pool = null;
let initialized = false;

async function getPool(){
  if(pool || !process.env.DATABASE_URL) return pool;
  try{
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized:false } });
    return pool;
  }catch{
    return null;
  }
}

export async function initStorage(){
  if(initialized) return;
  const db=await getPool();
  if(db){
    await db.query(`create table if not exists tg_projects (
      id text primary key, organization_id text not null, client_id text, name text not null,
      type text not null, industry text not null, status text not null default 'draft',
      slug text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`);
    await db.query(`create table if not exists tg_clients (
      id text primary key, organization_id text not null, name text not null, email text, project_ids jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now()
    )`);
    await db.query(`create table if not exists tg_leads (
      id text primary key, organization_id text not null, project_id text, name text not null, email text, phone text, source text, status text not null default 'new',
      created_at timestamptz not null default now()
    )`);
    await db.query(`create table if not exists tg_bookings (
      id text primary key, organization_id text not null, project_id text, customer_name text not null, customer_email text, start_at timestamptz not null, service text, status text not null default 'pending',
      created_at timestamptz not null default now()
    )`);
    await db.query(`create table if not exists tg_documents (
      project_id text primary key references tg_projects(id) on delete cascade,
      document jsonb not null, updated_at timestamptz not null default now()
    )`);
  }
  initialized=true;
}

export async function listProjects(fallback){
  const db=await getPool();
  if(!db) return [...fallback.values()];
  const {rows}=await db.query("select id, organization_id as \"organizationId\", client_id as \"clientId\", name, type, industry, status, slug from tg_projects order by created_at desc");
  return rows;
}

export async function saveProject(project){
  const db=await getPool();
  if(!db) return project;
  await db.query(`insert into tg_projects(id,organization_id,client_id,name,type,industry,status,slug)
    values($1,$2,$3,$4,$5,$6,$7,$8)
    on conflict(id) do update set name=excluded.name,type=excluded.type,industry=excluded.industry,status=excluded.status,slug=excluded.slug,updated_at=now()`,
    [project.id,project.organizationId,project.clientId||null,project.name,project.type,project.industry,project.status,project.slug||null]);
  return project;
}

export async function getDocument(projectId,fallback){
  const db=await getPool();
  if(!db) return fallback();
  const {rows}=await db.query("select document from tg_documents where project_id=$1",[projectId]);
  return rows[0]?.document ?? fallback();
}

export async function saveDocument(projectId,document){
  const db=await getPool();
  if(!db) return document;
  await db.query(`insert into tg_documents(project_id,document) values($1,$2)
    on conflict(project_id) do update set document=excluded.document,updated_at=now()`,[projectId,JSON.stringify(document)]);
  return document;
}

export async function listRecords(table,fallback){
  const db=await getPool();
  if(!db) return [...fallback.values()];
  const allowed={clients:"tg_clients",leads:"tg_leads",bookings:"tg_bookings"};
  const actual=allowed[table]; if(!actual) return [...fallback.values()];
  const {rows}=await db.query(`select * from ${actual} order by created_at desc`);
  return rows.map(r=>({id:r.id,organizationId:r.organization_id,projectId:r.project_id,name:r.name,email:r.email,phone:r.phone,source:r.source,status:r.status,customerName:r.customer_name,customerEmail:r.customer_email,startAt:r.start_at,service:r.service,projectIds:r.project_ids}));
}
export async function saveRecord(table,item){
  const db=await getPool(); if(!db) return item;
  const queries={
    clients:[`insert into tg_clients(id,organization_id,name,email,project_ids) values($1,$2,$3,$4,$5) on conflict(id) do update set name=excluded.name,email=excluded.email,project_ids=excluded.project_ids`,[item.id,item.organizationId,item.name,item.email||null,JSON.stringify(item.projectIds||[])]],
    leads:[`insert into tg_leads(id,organization_id,project_id,name,email,phone,source,status) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do update set status=excluded.status,name=excluded.name,email=excluded.email,phone=excluded.phone,source=excluded.source`,[item.id,item.organizationId,item.projectId||null,item.name,item.email||null,item.phone||null,item.source||"website",item.status||"new"]],
    bookings:[`insert into tg_bookings(id,organization_id,project_id,customer_name,customer_email,start_at,service,status) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do update set status=excluded.status,customer_name=excluded.customer_name,customer_email=excluded.customer_email,start_at=excluded.start_at,service=excluded.service`,[item.id,item.organizationId,item.projectId||null,item.customerName,item.customerEmail||null,item.startAt,item.service||null,item.status||"pending"]]
  };
  const q=queries[table]; if(q) await db.query(q[0],q[1]); return item;
}
export function newId(prefix){ return prefix+"_"+randomUUID().slice(0,8); }
