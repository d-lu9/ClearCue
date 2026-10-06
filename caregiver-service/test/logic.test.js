import assert from "node:assert/strict";
import test from "node:test";
import { isAlertDue, localClock, validRecords, validSchedule } from "../src/index.js";

test("alerts only in the first 15 minutes of the one-hour-later window", () => {
  assert.equal(isAlertDue(8 * 60, 8 * 60), true);
  assert.equal(isAlertDue(8 * 60 + 14, 8 * 60), true);
  assert.equal(isAlertDue(8 * 60 + 15, 8 * 60), false);
  assert.equal(isAlertDue(8 * 60 - 1, 8 * 60), false);
});

test("local clock retains the prior date for a dose near midnight", () => {
  const now = new Date("2026-10-07T04:05:00.000Z");
  const dueClock = localClock(new Date(now.getTime() - 60 * 60_000), "America/New_York");
  assert.deepEqual(dueClock, { date: "2026-10-06", minuteOfDay: 23 * 60 + 5 });
  assert.equal(isAlertDue(dueClock.minuteOfDay, 23 * 60), true);
});

test("local clock follows the selected time zone", () => {
  const now = new Date("2026-10-06T12:00:00.000Z");
  assert.deepEqual(localClock(now, "America/New_York"), { date: "2026-10-06", minuteOfDay: 8 * 60 });
  assert.deepEqual(localClock(now, "Europe/Madrid"), { date: "2026-10-06", minuteOfDay: 14 * 60 });
});

test("only bounded, unique schedule IDs and numeric times are accepted", () => {
  assert.equal(validSchedule([{ id: "schedule-1-0", minuteOfDay: 480 }]), true);
  assert.equal(validSchedule([{ id: "1", minuteOfDay: 480 }, { id: "1", minuteOfDay: 900 }]), false);
  assert.equal(validSchedule([{ id: "1", minuteOfDay: "480" }]), false);
  assert.equal(validSchedule([{ id: "1", minuteOfDay: 1440 }]), false);
});

test("dose records reject invalid dates, duplicates, and unshared dose IDs", () => {
  const ids = new Set(["dose-1"]);
  const record = { doseId: "dose-1", date: "2026-10-06", status: "taken" };
  assert.equal(validRecords([record], ids), true);
  assert.equal(validRecords([record, record], ids), false);
  assert.equal(validRecords([{ ...record, date: "2026-02-30" }], ids), false);
  assert.equal(validRecords([{ ...record, doseId: "other" }], ids), false);
  assert.equal(validRecords([{ ...record, status: "proof" }], ids), false);
});
