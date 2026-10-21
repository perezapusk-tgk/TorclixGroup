import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEvent, recordEvent, analyticsSummary, recordAudit, listAudit, summarize } from "./analytics.mjs";

test("normalizeEvent rejects unknown types and bad sessions", () => {
  assert.equal(normalizeEvent({ type: "hack", sessionId: "abcdefgh1" }), null);
  assert.equal(normalizeEvent({ type: "pageview", sessionId: "x" }), null);
});

test("normalizeEvent strips query/hash and reduces referrer to hostname", () => {
  const e = normalizeEvent({ type: "pageview", sessionId: "session-12345", path: "menu?x=1#top", referrer: "https://google.com/search?q=a" });
  assert.deepEqual(e, { type: "pageview", sessionId: "session-12345", path: "/menu", referrer: "google.com" });
});

test("analytics are isolated per organization and counted correctly", async () => {
  await recordEvent("orgA", "p1", { type: "pageview", sessionId: "aaaaaaaa1", path: "/" });
  await recordEvent("orgA", "p1", { type: "pageview", sessionId: "aaaaaaaa1", path: "/menu" });
  await recordEvent("orgA", "p1", { type: "lead_form", sessionId: "aaaaaaaa2", path: "/" });
  await recordEvent("orgB", "p9", { type: "pageview", sessionId: "bbbbbbbb1", path: "/" });
  const s = await analyticsSummary("orgA", { days: 7 });
  assert.equal(s.pageviews, 2);
  assert.equal(s.visitors, 2);
  assert.equal(s.conversions, 1);
  assert.equal(s.series.length, 7);
  assert.equal((await analyticsSummary("orgB", { days: 7 })).pageviews, 1);
});

test("summarize ignores rows outside the window", () => {
  const old = { sessionId: "zzzzzzzz1", type: "pageview", path: "/", referrer: null, createdAt: "2020-01-01T00:00:00Z" };
  assert.equal(summarize([old], 7).series.reduce((n, d) => n + d.pageviews, 0), 0);
});

test("audit log is per organization, newest first, never throws", async () => {
  const auth = { organization: { id: "orgA" }, user: { id: "u1", role: "admin" } };
  await recordAudit(auth, "project.publish", "project", "p1");
  await recordAudit(auth, "invoice.create", "invoice", "i1");
  await recordAudit({ organization: { id: "orgB" }, user: { id: "u2", role: "owner" } }, "domain.add");
  const rows = await listAudit("orgA");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].action, "invoice.create");
  assert.equal(await recordAudit({}, "broken"), null);
});
