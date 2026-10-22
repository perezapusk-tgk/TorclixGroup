import { readdir,readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const url=process.env.DATABASE_URL;
if(!url) throw new Error("DATABASE_URL is required");
const pool=new pg.Pool({connectionString:url,ssl:process.env.DATABASE_SSL==="false"?false:{rejectUnauthorized:false}});
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../packages/database/migrations");
const client=await pool.connect();

try{
  // Serialize migration runners across concurrent Render instances/deploy hooks.
  await client.query("select pg_advisory_lock(hashtext($1))",["torclixgroup:schema_migrations"]);
  await client.query("create table if not exists schema_migrations(version text primary key,applied_at timestamptz not null default now())");
  const files=(await readdir(dir)).filter(f=>f.endsWith(".sql")).sort();

  for(const file of files){
    const exists=await client.query("select 1 from schema_migrations where version=$1",[file]);
    if(exists.rowCount) continue;
    const sql=await readFile(path.join(dir,file),"utf8");
    try{
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations(version) values($1)",[file]);
      await client.query("commit");
      console.log("applied",file);
    }catch(error){
      await client.query("rollback");
      throw error;
    }
  }
}finally{
  try{
    await client.query("select pg_advisory_unlock(hashtext($1))",["torclixgroup:schema_migrations"]);
  }finally{
    client.release();
    await pool.end();
  }
}
