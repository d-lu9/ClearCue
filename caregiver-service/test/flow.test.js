import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.js";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  return {
    prepare(sql) {
      return {
        bind(...values) {
          const statement = sqlite.prepare(sql);
          return {
            async run() { return { meta: { changes: statement.run(...values).changes } }; },
            async first() { return statement.get(...values) ?? null; },
            async all() { return { results: statement.all(...values) }; },
          };
        },
      };
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
  };
}

async function post(env, path, body = {}, secret) {
  const response = await worker.fetch(new Request(`https://alerts.example${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "CF-Connecting-IP": "192.0.2.10",
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  }), env);
  return { status: response.status, body: await response.json() };
}

async function cron(env, at) {
  let pending;
  worker.scheduled({ scheduledTime: at.getTime() }, env, { waitUntil(task) { pending = task; } });
  await pending;
}

test("pairing, skipped-dose suppression, demo pause, one alert, and revocation work together", async () => {
  const env = { DB: database() };
  const created = await post(env, "/plan/create");
  assert.equal(created.status, 201);
  const patient = created.body.secret;
  const invited = await post(env, "/plan/invite", {}, patient);
  assert.equal(invited.status, 200);
  const paired = await post(env, "/pair", {
    code: invited.body.code,
    pushToken: "ExpoPushToken[aaaaaaaaaaaa]",
    language: "es",
  });
  assert.equal(paired.status, 200);
  const caregiver = paired.body.secret;
  assert.equal((await post(env, "/plan/status", {}, patient)).body.connected, true);

  const date = new Date().toISOString().slice(0, 10);
  const alertTime = new Date(`${date}T09:02:00.000Z`);
  const schedule = [{ id: "dose-1", minuteOfDay: 8 * 60 }];
  const skipped = [{ doseId: "dose-1", date, status: "skipped" }];
  assert.equal((await post(env, "/plan/sync", { timezone: "UTC", doses: schedule, records: skipped }, patient)).status, 200);
  await post(env, "/plan/pause", { paused: false }, patient);

  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ data: [{ status: "ok" }] }), { status: 200 });
  };
  try {
    await cron(env, alertTime);
    assert.equal(sent.length, 0, "a skipped dose should not alert");

    await post(env, "/plan/sync", { timezone: "UTC", doses: schedule, records: [] }, patient);
    await post(env, "/plan/pause", { paused: true }, patient);
    await cron(env, alertTime);
    assert.equal(sent.length, 0, "Demo Mode pause should suppress alerts");

    await post(env, "/plan/pause", { paused: false }, patient);
    await cron(env, alertTime);
    await cron(env, new Date(`${date}T09:12:00.000Z`));
    assert.equal(sent.length, 1, "the same unrecorded dose should alert once across the full alert window");
    assert.match(sent[0].body, /No se ha registrado/);
    assert.equal(sent[0].body.includes("dose-1"), false);

    assert.equal((await post(env, "/plan/delete", {}, patient)).status, 200);
    assert.equal((await post(env, "/caregiver/status", {}, caregiver)).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a connected caregiver can send a bounded generic test alert", async () => {
  const env = { DB: database() };
  const patient = (await post(env, "/plan/create")).body.secret;
  const invite = await post(env, "/plan/invite", {}, patient);
  const caregiver = (await post(env, "/pair", {
    code: invite.body.code,
    pushToken: "ExpoPushToken[bbbbbbbbbbbb]",
    language: "en",
  })).body.secret;
  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ data: [{ status: "ok" }] }), { status: 200 });
  };
  try {
    assert.equal((await post(env, "/caregiver/test", {}, caregiver)).status, 200);
    assert.equal(sent.length, 1);
    assert.match(sent[0].title, /test alert/);
    assert.equal(sent[0].body.includes("medication"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
