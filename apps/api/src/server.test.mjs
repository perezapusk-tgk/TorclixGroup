import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port=4317;
const base="http://127.0.0.1:"+port;
let child;

async function waitForServer(){
  for(let i=0;i<50;i++){
    try{
      const response=await fetch(base+"/health");
      if(response.ok) return;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error("API server did not start");
}

test.before(async()=>{
  child=spawn(process.execPath,["apps/api/src/server.mjs"],{
    cwd:process.cwd(),
    env:{...process.env,NODE_ENV:"development",TORCLIX_DEV_AUTH:"true",PORT:String(port),DATABASE_URL:""},
    stdio:["ignore","pipe","pipe"]
  });
  child.stderr.on("data",()=>{});
  await waitForServer();
});

test.after(()=>child?.kill("SIGTERM"));

test("health endpoint exposes development runtime",async()=>{
  const response=await fetch(base+"/health");
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.ok,true);
  assert.equal(body.auth,"development-session");
});

test("tenant-scoped project API requires a development identity",async()=>{
  const unauthorized=await fetch(base+"/api/projects");
  assert.equal(unauthorized.status,401);

  const response=await fetch(base+"/api/projects",{headers:{"x-torclix-user":"demo"}});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.every(project=>project.organizationId==="org_demo"));
});

test("project publishing creates a public runtime in development",async()=>{
  const publish=await fetch(base+"/api/projects/p1/publish",{
    method:"POST",
    headers:{"x-torclix-user":"demo"}
  });
  const publishBody=await publish.json();
  assert.equal(publish.status,200);
  assert.equal(publishBody.data.published,true);

  const publicPage=await fetch(base+"/published/p1");
  assert.equal(publicPage.status,200);
  assert.match(await publicPage.text(),/Maison Noire/);

  const legacyMini=await fetch(base+"/miniapp/p1");
  assert.equal(legacyMini.status,200);
  assert.match(await legacyMini.text(),/Maison Noire/);
});
