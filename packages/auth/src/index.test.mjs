import test from "node:test";
import assert from "node:assert/strict";
import { authenticateRequest } from "./index.mjs";

test("production authentication rejects missing bearer token",async()=>{
  const previousNode=process.env.NODE_ENV; const previousTrial=process.env.TORCLIX_TRIAL_MODE;
  process.env.NODE_ENV="production";
  process.env.TORCLIX_TRIAL_MODE="false";
  assert.equal(await authenticateRequest({headers:{}}),null);
  if(previousNode===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=previousNode;
  if(previousTrial===undefined) delete process.env.TORCLIX_TRIAL_MODE; else process.env.TORCLIX_TRIAL_MODE=previousTrial;
});

test("trial authentication accepts a valid opaque trial token",async()=>{
  const previous=process.env.TORCLIX_TRIAL_MODE;
  process.env.TORCLIX_TRIAL_MODE="true";
  const result=await authenticateRequest({headers:{"x-torclix-trial":"abcdefghijklmnopqrstuvwxyz123456"}});
  assert.equal(result?.source,"trial");
  assert.match(result?.subject||"","^trial:");
  process.env.TORCLIX_TRIAL_MODE=previous;
});
