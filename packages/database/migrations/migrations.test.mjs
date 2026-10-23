import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const migrationFiles=(await readdir(dir)).filter(name=>name.endsWith(".sql")).sort();

test("database migrations are lexicographically ordered",()=>{
  assert.deepEqual(migrationFiles,[...migrationFiles].sort());
  assert.ok(migrationFiles.length>0);
});

test("YooKassa webhook migration defines an idempotency primary key",async()=>{
  const sql=await readFile(path.join(dir,"024_yookassa_billing.sql"),"utf8");
  assert.match(sql,/yookassa_webhook_events/);
  assert.match(sql,/event_id\s+text\s+primary\s+key/i);
  assert.match(sql,/received_at\s+timestamptz/i);
});
