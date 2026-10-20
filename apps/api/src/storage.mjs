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

export function newId(prefix){ return prefix+"_"+randomUUID().slice(0,8); }
