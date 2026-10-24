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
    env:{...process.env,NODE_ENV:"development",TORCLIX_DEV_AUTH:"true",PORT:String(port),DATABASE_URL:"",STRIPE_WEBHOOK_SECRET:"whsec_test"},
    stdio:["ignore","pipe","pipe"]
  });
  child.stderr.on("data",()=>{});
  await waitForServer();
});

test.after(()=>child?.kill("SIGTERM"));

test("YooKassa webhook rejects requests when credentials are not configured",async()=>{
  const response=await fetch(base+"/api/billing/webhook",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"notification",event:"payment.succeeded",object:{id:"payment_test"}})});
  assert.equal(response.status,503);
  const body=await response.json();
  assert.equal(body.error,"ЮKassa webhook is not configured");
});

test("YooKassa webhook rejects malformed events",async()=>{
  const response=await fetch(base+"/api/billing/webhook",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"notification",event:"payment.succeeded",object:{}})});
  assert.equal(response.status,503);
});

test("public runtime sends security headers",async()=>{
  const response=await fetch(base+"/published/p1");
  assert.equal(response.status,200);
  assert.equal(response.headers.get("x-content-type-options"),"nosniff");
  assert.equal(response.headers.get("x-frame-options"),"DENY");
  assert.match(response.headers.get("content-security-policy")||"",/script-src/);
});

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

test("public project exposes safe Telegram Mini App metadata",async()=>{
  const response=await fetch(base+"/public/projects/p1/telegram");
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.data.miniAppUrl.includes("/miniapp/p1"),true);
  assert.equal(body.data.enabled,false);
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

  const replay=await fetch(base+"/public/projects/p1/leads",{
    method:"POST",
    headers:{"content-type":"application/json","idempotency-key":"lead-test-12345678"},
    body:JSON.stringify({name:"Site Test",email:"site@example.com",phone:"+358000000",source:"published_site"})
  });
  const replayBody=await replay.json();
  assert.equal(replay.status,201);
  assert.equal(replayBody.data.received,true);
  assert.equal(replayBody.data.id,body.data.id);
});

test("Mini App rejects forged Telegram initData on booking",async()=>{
  const response=await fetch(base+"/public/projects/p1/bookings",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({customerName:"Telegram Forgery",startAt:"2030-01-01T12:00:00.000Z",service:"Forgery test",tg_init:"auth_date=9999999999&user=%7B%22id%22%3A123%7D&hash=0000000000000000000000000000000000000000000000000000000000000000"})
  });
  const body=await response.json();
  assert.equal(response.status,401);
  assert.equal(body.error,"Telegram авторизация недействительна");
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

  const replay=await fetch(base+"/public/projects/p1/bookings",{
    method:"POST",
    headers:{"content-type":"application/json","idempotency-key":"booking-test-12345678"},
    body:JSON.stringify({customerName:"Booking Test",customerEmail:"booking@example.com",startAt:"2030-01-01T12:00:00.000Z",service:"Тестовая запись"})
  });
  const replayBody=await replay.json();
  assert.equal(replay.status,201);
  assert.equal(replayBody.data.received,true);
  assert.equal(replayBody.data.id,body.data.id);
});

test("public order endpoint validates catalog and creates an order",async()=>{
  const response=await fetch(base+"/public/projects/p1/orders",{method:"POST",headers:{"content-type":"application/json","idempotency-key":"order-test-12345678"},body:JSON.stringify({items:[{catalogItemId:"00000000-0000-4000-8000-000000001101",quantity:1}],customerName:"Order Test",customerEmail:"order@example.com",source:"published_site"})});
  const body=await response.json();
  assert.equal(response.status,201);
  assert.equal(body.data.received,true);

  const replay=await fetch(base+"/public/projects/p1/orders",{
    method:"POST",
    headers:{"content-type":"application/json","idempotency-key":"order-test-12345678"},
    body:JSON.stringify({items:[{catalogItemId:"00000000-0000-4000-8000-000000001101",quantity:1}],customerName:"Order Test",customerEmail:"order@example.com",source:"published_site"})
  });
  const replayBody=await replay.json();
  assert.equal(replay.status,201);
  assert.equal(replayBody.data.received,true);
  assert.equal(replayBody.data.id,body.data.id);
});

test("public analytics event endpoint rate-limits abusive clients",async()=>{
  for(let i=0;i<120;i++){
    const response=await fetch(base+"/public/projects/p1/events",{
      method:"POST",
      headers:{"content-type":"application/json","x-forwarded-for":"198.51.100.77"},
      body:JSON.stringify({type:"pageview",sessionId:"rate-test-"+i,path:"/"})
    });
    assert.notEqual(response.status,500);
  }
  const blocked=await fetch(base+"/public/projects/p1/events",{
    method:"POST",
    headers:{"content-type":"application/json","x-forwarded-for":"198.51.100.77"},
    body:JSON.stringify({type:"pageview",sessionId:"rate-test-blocked",path:"/"})
  });
  assert.equal(blocked.status,429);
  const body=await blocked.json();
  assert.equal(body.error,"RATE_LIMITED");
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

test("domain creation rejects local and IP hostnames",async()=>{
  for(const hostname of ["localhost","app.local","127.0.0.1"]){
    const response=await fetch(base+"/api/domains",{method:"POST",headers:{"content-type":"application/json","x-torclix-user":"demo"},body:JSON.stringify({hostname})});
    assert.equal(response.status,400);
  }
});

test("calendar event rejects a project outside the demo organization",async()=>{
  const response=await fetch(base+"/api/calendar/events",{method:"POST",headers:{"content-type":"application/json","x-torclix-user":"demo"},body:JSON.stringify({title:"Isolation Test",startAt:"2030-01-01T12:00:00.000Z",endAt:"2030-01-01T13:00:00.000Z",projectId:"missing-foreign-project"})});
  assert.equal(response.status,404);
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

test("team creation enforces the configured billing member limit",async()=>{
  const billing=await fetch(base+"/api/billing");
  const billingBody=await billing.json();
  const limit=Number(billingBody.data.limits.members);
  let blocked=null;
  for(let i=0;i<=limit;i++){
    const response=await fetch(base+"/api/staff",{method:"POST",headers:{"content-type":"application/json","x-torclix-user":"demo"},body:JSON.stringify({name:"Staff Limit "+i,role:"manager"})});
    if(response.status===409){blocked=await response.json();break;}
    assert.equal(response.status,201);
  }
  assert.ok(blocked,"staff limit must eventually be enforced");
  assert.equal(blocked.error,"STAFF_LIMIT_REACHED");
  assert.equal(blocked.limit,limit);
});

test("project creation enforces the configured project limit",async()=>{
  const billing=await fetch(base+"/api/billing");
  const billingBody=await billing.json();
  const limit=Number(billingBody.data.limits.projects);
  const initial=Number(billingBody.data.usage.projects);
  for(let i=initial;i<limit;i++){
    const response=await fetch(base+"/api/projects",{method:"POST",headers:{"content-type":"application/json","x-torclix-user":"demo"},body:JSON.stringify({name:"Limit Test "+i,type:"website",industry:"services"})});
    assert.equal(response.status,201);
  }
  const blocked=await fetch(base+"/api/projects",{method:"POST",headers:{"content-type":"application/json","x-torclix-user":"demo"},body:JSON.stringify({name:"Limit Test blocked",type:"website",industry:"services"})});
  const body=await blocked.json();
  assert.equal(blocked.status,409);
  assert.equal(body.error,"PROJECT_LIMIT_REACHED");
  assert.equal(body.limit,limit);
});


test("client portal supports review and approval workflow",async()=>{
  const current=await fetch(base+"/api/projects/p1/client-portal");
  const currentBody=await current.json();
  assert.equal(current.status,200);
  assert.ok(currentBody.data);
  assert.ok(currentBody.data.portalUrl);

  const review=await fetch(base+"/api/projects/p1/client-portal",{
    method:"PATCH",
    headers:{"content-type":"application/json","x-torclix-user":"demo"},
    body:JSON.stringify({status:"review",note:"Проверьте главную страницу"})
  });
  const reviewBody=await review.json();
  assert.equal(review.status,200);
  assert.equal(reviewBody.data.status,"review");

  const token=new URL(reviewBody.data.portalUrl).pathname.split("/").pop();
  assert.ok(token);

  const publicPortal=await fetch(base+"/public/client-portal/"+token);
  const publicBody=await publicPortal.json();
  assert.equal(publicPortal.status,200);
  assert.equal(publicBody.data.status,"review");

  const approved=await fetch(base+"/public/client-portal/"+token,{
    method:"PATCH",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({status:"approved",note:"Всё согласовано"})
  });
  const approvedBody=await approved.json();
  assert.equal(approved.status,200);
  assert.equal(approvedBody.data.status,"approved");
});

test("calendar event validates interval and accepts a valid event",async()=>{
  const invalid=await fetch(base+"/api/calendar/events",{
    method:"POST",
    headers:{"content-type":"application/json","x-torclix-user":"demo"},
    body:JSON.stringify({title:"Bad interval",startAt:"2030-01-01T13:00:00.000Z",endAt:"2030-01-01T12:00:00.000Z"})
  });
  assert.equal(invalid.status,400);

  const valid=await fetch(base+"/api/calendar/events",{
    method:"POST",
    headers:{"content-type":"application/json","x-torclix-user":"demo"},
    body:JSON.stringify({title:"Client meeting",startAt:"2030-01-01T12:00:00.000Z",endAt:"2030-01-01T13:00:00.000Z",status:"confirmed"})
  });
  const validBody=await valid.json();
  assert.equal(valid.status,201);
  assert.equal(validBody.data.title,"Client meeting");

  const listed=await fetch(base+"/api/calendar/events?from=2030-01-01T00:00:00.000Z&to=2030-01-02T00:00:00.000Z");
  const listedBody=await listed.json();
  assert.equal(listed.status,200);
  assert.ok(listedBody.data.some(event=>event.title==="Client meeting"));
});
