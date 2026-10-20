import test from "node:test";
import assert from "node:assert/strict";
import { can } from "./index.mjs";

test("owner has all permissions",()=>assert.equal(can("owner","anything:write"),true));
test("editor can write projects",()=>assert.equal(can("editor","projects:write"),true));
test("viewer cannot write projects",()=>assert.equal(can("viewer","projects:write"),false));
test("viewer can read analytics",()=>assert.equal(can("viewer","analytics:read"),true));
