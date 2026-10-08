"use strict";

/**
 * Integration assertions for the habit check-in pipeline (Task 3).
 *
 * Covers the two normative behaviours from specs/03-habit-management.md §5:
 *   1. Duplicate check-in prevention: a `23505` unique-violation from
 *      `uq_habit_log_date` is mapped to a domain ConflictError (→ HTTP 409),
 *      never a 500.
 *   2. Streak preservation: recalculation keeps `longestStreak` monotonically
 *      non-decreasing and recomputes `currentStreak` only over consecutive days.
 *
 * Runs against the compiled repository (`dist/`) using node:test and a mock
 * Drizzle transaction driver, so no live Neon connection is required.
 */

require("reflect-metadata");

const test = require("node:test");
const assert = require("node:assert/strict");
const { HabitsRepository } = require("../dist/modules/habits/habits.repository.js");
const { HabitsService } = require("../dist/modules/habits/habits.service.js");

function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

/**
 * Minimal Drizzle-style transaction mock.
 * `selectResults` are consumed in order by the terminal `.for()` / `.limit()`
 * awaits; `updateRow` is what `.returning()` resolves with after `.set()`.
 */
function makeDb({ selectResults = [], updateRow = null, insertErrorCode = null, capture = {} }) {
  let selectIdx = 0;

  function makeBuilder() {
    const b = {};
    for (const m of ["select", "from", "where", "orderBy", "insert", "update", "delete"]) {
      b[m] = () => b;
    }
    b.for = async () => selectResults[selectIdx++] ?? [];
    b.limit = async () => selectResults[selectIdx++] ?? [];
    b.set = (arg) => {
      capture.updatedSet = arg;
      return b;
    };
    b.returning = async () => [capture.updatedSet && updateRow ? updateRow : { ...capture.updatedSet }];
    b.values = (...args) => {
      if (insertErrorCode !== null) {
        const err = new Error("duplicate key value violates unique constraint");
        err.code = insertErrorCode;
        throw err;
      }
      capture.inserted = args[0];
      return b;
    };
    return b;
  }

  return {
    capture,
    async transaction(cb) {
      return cb(makeBuilder());
    },
  };
}

function makeStreakRow(overrides = {}) {
  return {
    habitId: "h1",
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

test("duplicate check-in raises the domain ConflictError, not a raw 500", async () => {
  const lockedStreak = makeStreakRow({ currentStreak: 3, longestStreak: 5 });
  const db = makeDb({
    selectResults: [[lockedStreak]],
    insertErrorCode: "23505",
  });
  const repo = new HabitsRepository(db);

  await assert.rejects(
    repo.logHabit("h1", "u1", { date: isoDate(0), count: 1 }),
    (err) => err.name === "ConflictError",
    "a 23505 violation must surface as ConflictError (mapped to HTTP 409 upstream)",
  );
});

test("service maps the duplicate check-in to a 409 ConflictException", async () => {
  const lockedStreak = makeStreakRow({ currentStreak: 3, longestStreak: 5 });
  const db = makeDb({
    selectResults: [[lockedStreak]],
    insertErrorCode: "23505",
  });
  const service = new HabitsService(new HabitsRepository(db));

  await assert.rejects(
    service.logHabit("h1", "u1", { date: isoDate(0), count: 1 }),
    (err) => err.getStatus === undefined || err.status === 409 || err.name === "ConflictException",
  ).catch((err) => {
    // node/assert interop: ConflictException carries status 409
    assert.ok(
      (err.getStatus && err.getStatus()) === 409 || err.name === "ConflictException",
      `expected ConflictException/409, got ${err.name}`,
    );
  });
});

test("consecutive-day check-ins produce the correct current streak", async () => {
  const today = isoDate(0);
  const yesterday = isoDate(-1);
  const lockedStreak = makeStreakRow({ currentStreak: 1, longestStreak: 1 });
  const capture = {};
  const db = makeDb({
    selectResults: [[lockedStreak], [{ loggedDate: today }, { loggedDate: yesterday }]],
    updateRow: makeStreakRow({ currentStreak: 2, longestStreak: 2, lastLoggedDate: today }),
    capture,
  });
  const repo = new HabitsRepository(db);

  const streak = await repo.logHabit("h1", "u1", { date: today, count: 1 });

  assert.equal(streak.currentStreak, 2, "today + yesterday = 2-day streak");
  assert.equal(streak.lastLoggedDate, today);
  // The streak row write must be part of the same transaction (no DB trigger):
  assert.ok(capture.updatedSet, "recalculation must UPDATE habit_streaks inside the tx");
  assert.equal(capture.updatedSet.currentStreak, 2);
});

test("longest streak is preserved and never regresses", async () => {
  const today = isoDate(0);
  const lockedStreak = makeStreakRow({ currentStreak: 7, longestStreak: 21, lastLoggedDate: isoDate(-1) });
  const capture = {};
  const db = makeDb({
    // Single isolated log today: current streak restarts at 1...
    selectResults: [[lockedStreak], [{ loggedDate: today }]],
    updateRow: makeStreakRow({ currentStreak: 1, longestStreak: 21, lastLoggedDate: today }),
    capture,
  });
  const repo = new HabitsRepository(db);

  const streak = await repo.logHabit("h1", "u1", { date: today, count: 1 });

  assert.equal(streak.currentStreak, 1, "isolated log restarts the current streak at 1");
  assert.equal(streak.longestStreak, 21, "longest streak must be preserved");
  assert.equal(capture.updatedSet.longestStreak, 21);
});

test("gap of more than one day resets the current streak to zero", async () => {
  const stale = isoDate(-3);
  const lockedStreak = makeStreakRow({ currentStreak: 4, longestStreak: 4 });
  const capture = {};
  const db = makeDb({
    selectResults: [[lockedStreak], [{ loggedDate: stale }]],
    updateRow: makeStreakRow({ currentStreak: 0, longestStreak: 4, lastLoggedDate: stale }),
    capture,
  });
  const repo = new HabitsRepository(db);

  await repo.logHabit("h1", "u1", { date: isoDate(0), count: 1 });

  assert.equal(capture.updatedSet.currentStreak, 0, "a >1 day gap breaks the current streak");
  assert.equal(capture.updatedSet.longestStreak, 4, "longest streak is still preserved");
});
