import { randomUUID,createHash } from "node:crypto";
import { readdir,readFile } from "node:fs/promises";
import { dirname,resolve } from "node:path";
import { fileURLToPath } from "node:url";

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