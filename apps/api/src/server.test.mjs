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

test("tenant-scoped project API uses the deterministic demo identity in development",async()=>{
  const response=await fetch(base+"/api/projects");
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

test("published project health and catalog endpoints are usable",async()=>{
  const health=await fetch(base+"/public/projects/p1/health");
  const healthBody=await health.json();
  assert.equal(health.status,200);
  assert.equal(healthBody.data.published,true);
  assert.equal(healthBody.data.name,"Maison Noire");

  const catalog=await fetch(base+"/public/projects/p1/catalog");
  const catalogBody=await catalog.json();
  assert.equal(catalog.status,200);
  assert.ok(Array.isArray(catalogBody.data));
  assert.ok(catalogBody.data.length>=1);
});

test("published site CTA creates a public lead",async()=>{
  const response=await fetch(base+"/public/projects/p1/leads",{
    method:"POST",
    headers:{"content-type":"application/json","idempotency-key":"lead-test-12345678"},
    body:JSON.stringify({name:"Site Test",email:"site@example.com",phone:"+358000000",source:"published_site"})
  });
  const body=await response.json();
  assert.equal(response.status,201);
  assert.equal(body.data.received,true);
});

test("published site booking CTA creates a booking",async()=>{
  const response=await fetch(base+"/public/projects/p1/bookings",{
    method:"POST",
    headers:{"content-type":"application/json","idempotency-key":"booking-test-12345678"},
    body:JSON.stringify({customerName:"Booking Test",customerEmail:"booking@example.com",startAt:"2030-01-01T12:00:00.000Z",service:"Тестовая запись"})
  });
  const body=await response.json();
  assert.equal(response.status,201);
  assert.equal(body.data.received,true);
  assert.equal(body.data.status,"pending");
});

test("public analytics event endpoint accepts a valid pageview",async()=>{
  const event=await fetch(base+"/public/projects/p1/events",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      type:"pageview",
      sessionId:"test-session-12345678",
      path:"/menu?utm_source=test"
    })
  });
  assert.equal(event.status,202);
});

test("billing endpoint exposes plan limits and live usage",async()=>{
  const response=await fetch(base+"/api/billing");
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.data.plan,"pro");
  assert.equal(body.data.limits.projects,50);
  assert.equal(body.data.limits.leads,10000);
  assert.equal(typeof body.data.usage.projects,"number");
  assert.equal(typeof body.data.usage.leads,"number");
});

test("project creation enforces the starter project limit",async()=>{
  for(let i=0;i<3;i++){
    const response=await fetch(base+"/api/projects",{method:"POST",headers:{"content-type":"application/json","x-torclix-user":"demo"},body:JSON.stringify({name:"Limit Test "+i,type:"website",industry:"services"})});
    assert.equal(response.status,201);
  }
  const blocked=await fetch(base+"/api/projects",{method:"POST",headers:{"content-type":"application/json","x-torclix-user":"demo"},body:JSON.stringify({name:"Limit Test blocked",type:"website",industry:"services"})});
  const body=await blocked.json();
  assert.equal(blocked.status,409);
  assert.equal(body.error,"PROJECT_LIMIT_REACHED");
  assert.equal(body.limit,5);
});
