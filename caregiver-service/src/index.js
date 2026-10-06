const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const MAX_BODY_BYTES = 30_000;
const INVITE_TTL_MS = 10 * 60_000;
const ALERT_DELAY_MINUTES = 60;
const ALERT_WINDOW_MINUTES = 15;
const MAX_STALE_MS = 24 * 60 * 60_000;

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function randomHex(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearer(request) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("authorization") || "");
  return match?.[1] || null;
}

async function bodyOf(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

async function patientPlan(request, env) {
  const token = bearer(request);
  if (!token) return null;
  return env.DB.prepare("SELECT * FROM plans WHERE patient_secret_hash = ?")
    .bind(await digest(token)).first();
}

async function caregiverPlan(request, env) {
  const token = bearer(request);
  if (!token) return null;
  return env.DB.prepare("SELECT * FROM plans WHERE caregiver_secret_hash = ?")
    .bind(await digest(token)).first();
}

function validTimezone(value) {
  if (typeof value !== "string" || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function validPushToken(value) {
  return typeof value === "string" &&
    /^(Expo(nent)?PushToken)\[[A-Za-z0-9_-]{10,128}\]$/.test(value);
}

export function validSchedule(value) {
  return Array.isArray(value) && value.length <= 100 && value.every((dose) =>
    dose && typeof dose === "object" &&
    typeof dose.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(dose.id) &&
    Number.isInteger(dose.minuteOfDay) && dose.minuteOfDay >= 0 && dose.minuteOfDay < 1440,
  ) && new Set(value.map((dose) => dose.id)).size === value.length;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validRecords(value, ids) {
  return Array.isArray(value) && value.length <= 200 && value.every((record) =>
    record && typeof record === "object" &&
    ids.has(record.doseId) &&
    validDate(record.date) &&
    ["taken", "late", "skipped"].includes(record.status),
  ) && new Set(value.map((record) => `${record.doseId}:${record.date}`)).size === value.length;
}

export function localClock(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value || "00";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minuteOfDay: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function isAlertDue(targetMinute, doseMinute) {
  const difference = targetMinute - doseMinute;
  return difference >= 0 && difference < ALERT_WINDOW_MINUTES;
}

async function sendPush(token, language) {
  const spanish = language === "es";
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: token,
      title: spanish ? "Alerta de cuidado de ClearCue" : "ClearCue caregiver alert",
      body: spanish
        ? "No se ha registrado una dosis programada de gotas. Comunícate con la persona a quien ayudas."
        : "A scheduled eye-drop dose has not been recorded. Please check in with the person you support.",
      sound: "default",
      channelId: "caregiver-alerts",
      data: { kind: "caregiver-alert" },
    }),
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result?.data?.status === "ok";
}

async function withinLimit(env, request, action, limit) {
  const ipHash = await digest(`${action}:${request.headers.get("CF-Connecting-IP") || "unknown"}`);
  const hour = Math.floor(Date.now() / 3_600_000);
  await env.DB.prepare("INSERT INTO pairing_attempts (ip_hash, hour_bucket, attempts) VALUES (?, ?, 1) ON CONFLICT(ip_hash, hour_bucket) DO UPDATE SET attempts = attempts + 1")
    .bind(ipHash, hour).run();
  const row = await env.DB.prepare("SELECT attempts FROM pairing_attempts WHERE ip_hash = ? AND hour_bucket = ?")
    .bind(ipHash, hour).first();
  return row.attempts <= limit;
}

async function handleRequest(request, env) {
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && path === "/health") return reply({ ready: true });
  if (request.method !== "POST") return reply({ error: "Not found" }, 404);

  if (path === "/plan/create") {
    if (!await withinLimit(env, request, "create", 5)) return reply({ error: "Too many attempts" }, 429);
    const secret = randomHex();
    const id = randomHex(16);
    await env.DB.prepare("INSERT INTO plans (id, patient_secret_hash, created_at) VALUES (?, ?, ?)")
      .bind(id, await digest(secret), Date.now()).run();
    return reply({ secret }, 201);
  }

  if (path === "/pair") {
    const input = await bodyOf(request);
    const code = typeof input?.code === "string" ? input.code.trim().toUpperCase() : "";
    if (!/^[A-F0-9]{10}$/.test(code) || !validPushToken(input?.pushToken))
      return reply({ error: "Invalid invite or push token" }, 400);
    if (!await withinLimit(env, request, "pair", 20)) return reply({ error: "Too many attempts" }, 429);
    const plan = await env.DB.prepare("SELECT id FROM plans WHERE invite_hash = ? AND invite_expires_at > ? AND caregiver_secret_hash IS NULL")
      .bind(await digest(code), Date.now()).first();
    if (!plan) return reply({ error: "Invite expired or invalid" }, 400);
    const secret = randomHex();
    const language = input.language === "es" ? "es" : "en";
    const update = await env.DB.prepare("UPDATE plans SET caregiver_secret_hash = ?, caregiver_push_token = ?, caregiver_language = ?, invite_hash = NULL, invite_expires_at = NULL WHERE id = ? AND caregiver_secret_hash IS NULL")
      .bind(await digest(secret), input.pushToken, language, plan.id).run();
    if (!update.meta.changes) return reply({ error: "Invite already used" }, 409);
    return reply({ secret });
  }

  if (path.startsWith("/caregiver/")) {
    const plan = await caregiverPlan(request, env);
    if (!plan) return reply({ error: "Connection not found" }, 401);
    if (path === "/caregiver/status") return reply({ connected: true });
    if (path === "/caregiver/leave") {
      await env.DB.prepare("UPDATE plans SET caregiver_secret_hash = NULL, caregiver_push_token = NULL WHERE id = ?")
        .bind(plan.id).run();
      return reply({ connected: false });
    }
    if (path === "/caregiver/token") {
      const input = await bodyOf(request);
      if (!validPushToken(input?.pushToken)) return reply({ error: "Invalid push token" }, 400);
      await env.DB.prepare("UPDATE plans SET caregiver_push_token = ?, caregiver_language = ? WHERE id = ?")
        .bind(input.pushToken, input.language === "es" ? "es" : "en", plan.id).run();
      return reply({ connected: true });
    }
    return reply({ error: "Not found" }, 404);
  }

  const plan = await patientPlan(request, env);
  if (!plan) return reply({ error: "Connection not found" }, 401);
  if (path === "/plan/status") return reply({ connected: Boolean(plan.caregiver_push_token), paused: Boolean(plan.paused) });
  if (path === "/plan/delete") {
    await env.DB.prepare("DELETE FROM plans WHERE id = ?").bind(plan.id).run();
    return reply({ deleted: true });
  }
  if (path === "/plan/invite") {
    if (plan.caregiver_push_token) return reply({ error: "Already paired" }, 409);
    const day = new Date().toISOString().slice(0, 10);
    const count = plan.invite_day === day ? plan.invite_count : 0;
    if (count >= 5) return reply({ error: "Invite limit reached" }, 429);
    const code = randomHex(5).toUpperCase();
    await env.DB.prepare("UPDATE plans SET invite_hash = ?, invite_expires_at = ?, invite_day = ?, invite_count = ? WHERE id = ?")
      .bind(await digest(code), Date.now() + INVITE_TTL_MS, day, count + 1, plan.id).run();
    return reply({ code, expiresInMinutes: 10 });
  }
  if (path === "/plan/pause") {
    const input = await bodyOf(request);
    if (typeof input?.paused !== "boolean") return reply({ error: "Invalid pause value" }, 400);
    await env.DB.prepare("UPDATE plans SET paused = ? WHERE id = ?")
      .bind(input.paused ? 1 : 0, plan.id).run();
    return reply({ paused: input.paused });
  }
  if (path === "/plan/sync") {
    const input = await bodyOf(request);
    if (!validTimezone(input?.timezone) || !validSchedule(input?.doses))
      return reply({ error: "Invalid schedule" }, 400);
    const ids = new Set(input.doses.map((dose) => dose.id));
    if (!validRecords(input.records, ids)) return reply({ error: "Invalid records" }, 400);
    const statements = [
      env.DB.prepare("DELETE FROM doses WHERE plan_id = ?").bind(plan.id),
      ...input.doses.map((dose) => env.DB.prepare("INSERT INTO doses (plan_id, dose_id, minute_of_day) VALUES (?, ?, ?)").bind(plan.id, dose.id, dose.minuteOfDay)),
      env.DB.prepare("DELETE FROM dose_records WHERE plan_id = ?").bind(plan.id),
      ...input.records.map((record) => env.DB.prepare("INSERT INTO dose_records (plan_id, dose_id, local_date, status) VALUES (?, ?, ?, ?)").bind(plan.id, record.doseId, record.date, record.status)),
      env.DB.prepare("UPDATE plans SET timezone = ?, last_sync_at = ? WHERE id = ?")
        .bind(input.timezone, Date.now(), plan.id),
    ];
    await env.DB.batch(statements);
    return reply({ synced: true });
  }
  return reply({ error: "Not found" }, 404);
}

async function scanDue(env, now) {
  const plans = await env.DB.prepare("SELECT id, timezone, caregiver_push_token, caregiver_language FROM plans WHERE paused = 0 AND caregiver_push_token IS NOT NULL AND last_sync_at > ?")
    .bind(now.getTime() - MAX_STALE_MS).all();
  for (const plan of plans.results || []) {
    // Look at the local clock one hour ago, including dates spanning midnight.
    const dueClock = localClock(new Date(now.getTime() - ALERT_DELAY_MINUTES * 60_000), plan.timezone);
    const currentClock = localClock(now, plan.timezone);
    const doses = await env.DB.prepare("SELECT dose_id, minute_of_day FROM doses WHERE plan_id = ?")
      .bind(plan.id).all();
    for (const dose of doses.results || []) {
      if (!isAlertDue(dueClock.minuteOfDay, dose.minute_of_day)) continue;
      // The current app records a dose tapped just after midnight on today's date.
      const record = await env.DB.prepare("SELECT 1 FROM dose_records WHERE plan_id = ? AND dose_id = ? AND local_date IN (?, ?)")
        .bind(plan.id, dose.dose_id, dueClock.date, currentClock.date).first();
      if (record) continue;
      const claimed = await env.DB.prepare("INSERT OR IGNORE INTO alerts (plan_id, dose_id, local_date, sent_at) VALUES (?, ?, ?, ?)")
        .bind(plan.id, dose.dose_id, dueClock.date, now.getTime()).run();
      if (!claimed.meta.changes) continue;
      try {
        const sent = await sendPush(plan.caregiver_push_token, plan.caregiver_language);
        if (!sent) {
          await env.DB.prepare("DELETE FROM alerts WHERE plan_id = ? AND dose_id = ? AND local_date = ?")
            .bind(plan.id, dose.dose_id, dueClock.date).run();
        }
      } catch {
        // Unknown delivery outcome: retain the claim to prevent duplicate alerts.
      }
    }
  }
  await env.DB.prepare("DELETE FROM pairing_attempts WHERE hour_bucket < ?")
    .bind(Math.floor(now.getTime() / 3_600_000) - 24).run();
  await env.DB.prepare("DELETE FROM alerts WHERE sent_at < ?")
    .bind(now.getTime() - 45 * 24 * 60 * 60_000).run();
  await env.DB.prepare("DELETE FROM dose_records WHERE local_date < ?")
    .bind(new Date(now.getTime() - 45 * 24 * 60 * 60_000).toISOString().slice(0, 10)).run();
  await env.DB.prepare("DELETE FROM plans WHERE last_sync_at < ? AND created_at < ?")
    .bind(now.getTime() - 30 * 24 * 60 * 60_000, now.getTime() - 30 * 24 * 60 * 60_000).run();
}

export default {
  fetch(request, env) {
    return handleRequest(request, env).catch(() => reply({ error: "Service unavailable" }, 503));
  },
  scheduled(controller, env, context) {
    context.waitUntil(scanDue(env, new Date(controller.scheduledTime)));
  },
};
