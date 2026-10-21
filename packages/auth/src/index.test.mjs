import test from "node:test";
import assert from "node:assert/strict";
import { authenticateRequest } from "./index.mjs";

test("production authentication rejects missing bearer token",async()=>{
  const previous={NODE_ENV:process.env.NODE_ENV,TORCLIX_TRIAL_MODE:process.env.TORCLIX_TRIAL_MODE};
  process.env.NODE_ENV="production";
  process.env.TORCLIX_TRIAL_MODE="false";
  assert.equal(await authenticateRequest({headers:{}}),null);
  Object.assign(process.env,{NODE_ENV:previous.NODE_ENV,TORCLIX_TRIAL_MODE:previous.TORCLIX_TRIAL_MODE});
});

test("trial authentication accepts a valid opaque trial token",async()=>{
  const previous=process.env.TORCLIX_TRIAL_MODE;
  process.env.TORCLIX_TRIAL_MODE="true";
  const result=await authenticateRequest({headers:{"x-torclix-trial":"abcdefghijklmnopqrstuvwxyz123456"}});
  assert.equal(result?.source,"trial");
  assert.match(result?.subject||"","^trial:");
  process.env.TORCLIX_TRIAL_MODE=previous;
});
