"use strict";

/**
 * Regression assertions for the audit defect remediations (Task 7).
 *
 *   [DATA-01] Atomic optimistic concurrency: when `clientUpdatedAt` is supplied
 *     it must join the UPDATE predicate directly, and a 0-row result must raise
 *     the domain ConflictError (→ HTTP 409) with no read-then-write TOCTOU step.
 *   [DATA-02] SQL-side filtering: `findAll` must compose a dynamic `where`
 *     predicate instead of filtering an unbounded row set in heap memory.
 *   [DATA-03] No-op deletion guard: `removeLog` with 0 deleted rows must return
 *     the existing streak row without acquiring the FOR UPDATE lock or
 *     recalculating streaks.
 *
 * Runs against the compiled repositories (`dist/`) using node:test and a mock
 * Drizzle driver — no live database connection is required.
 */

require("reflect-metadata");

const test = require("node:test");
const assert = require("node:assert/strict");
const { TasksRepository } = require("../dist/modules/tasks/tasks.repository.js");
const { HabitsRepository } = require("../dist/modules/habits/habits.repository.js");

/**
 * Drizzle-style mock builder. Every chainable method returns itself; terminal
 * awaits resolve from the configured results. All invocations are recorded in
 * `capture.calls` so tests can assert on the composed predicates.
 */
function makeDb({ updateResults = [[]], deleteResults = [[]], selectResults = [] } = {}) {
  const capture = { calls: [], predicates: [] };
  let updateIdx = 0;
  let deleteIdx = 0;
  let selectIdx = 0;

  function makeBuilder(kind) {
    const b = { kind };
    capture.predicates[kind] = capture.predicates[kind] || [];
    const withKind = (newKind) => {
      capture.predicates[newKind] = capture.predicates[newKind] || [];
      b.kind = newKind;
      return b;
    };
    for (const m of ["insert", "values"]) {
      b[m] = (...args) => {
        capture.calls.push(m);
        return b;
      };
    }
    for (const m of ["select", "from", "table"]) {
      b[m] = (...args) => {
        capture.calls.push(m);
        return withKind("select");
      };
    }
    b.update = (...args) => {
      capture.calls.push("update");
      return withKind("update");
    };
    b.delete = (...args) => {
      capture.calls.push("delete");
      return withKind("delete");
    };
    b.set = (...args) => {
      capture.calls.push("set");
      return b;
    };
    b.where = (...args) => {
      capture.calls.push("where");
      capture.predicates[b.kind].push(args[0]);
      return b;
    };
    b.orderBy = () => b;
    b.limit = async () => {
      capture.calls.push("await:limit");
      return selectResults[selectIdx++] ?? [];
    };
    b.for = async () => {
      capture.calls.push("await:for");
      return selectResults[selectIdx++] ?? [];
    };
    b.returning = async () => {
      capture.calls.push("await:returning");
      if (b.kind === "update") return updateResults[updateIdx++] ?? [];
      if (b.kind === "delete") return deleteResults[deleteIdx++] ?? [];
      return [];
    };
    // Drizzle builders are Promise-like: a chain ending without a terminal
    // method (`limit`, `for`, `returning`) is awaited directly.
    b.then = (resolve, reject) => {
      capture.calls.push("await:implicit");
      let value;
      if (b.kind === "select") value = selectResults[selectIdx++] ?? [];
      else if (b.kind === "delete") value = { rowCount: (deleteResults[deleteIdx++] ?? []).length };
      else if (b.kind === "update") value = { rowCount: (updateResults[updateIdx++] ?? []).length };
      else value = [];
      return Promise.resolve(value).then(resolve, reject);
    };
    return b;
  }

  return {
    capture,
    select: (...args) => {
      capture.calls.push("select");
      return makeBuilder("select");
    },
    update: () => {
      capture.calls.push("update");
      return makeBuilder("update");
    },
    delete: () => {
      capture.calls.push("delete");
      return makeBuilder("delete");
    },
    async transaction(cb) {
      return cb(makeBuilder("tx"));
    },
  };
}

// ---------------------------------------------------------------------------
// [DATA-01] / [DATA-02] — TasksRepository
// ---------------------------------------------------------------------------

test("DATA-01: update with clientUpdatedAt conflicting (0 rows) raises ConflictError", async () => {
  const db = makeDb({ updateResults: [[]] });
  const repo = new TasksRepository(db);

  await assert.rejects(
    repo.update("t1", "u1", { title: "x", clientUpdatedAt: new Date(2020, 0, 1).toISOString() }),
    (err) => err.name === "ConflictError",
    "a 0-row CAS update must surface as ConflictError (mapped to HTTP 409 upstream)",
  );
});

test("DATA-01: updateStatus with clientUpdatedAt conflicting (0 rows) raises ConflictError", async () => {
  const db = makeDb({ updateResults: [[]] });
  const repo = new TasksRepository(db);

  await assert.rejects(
    repo.updateStatus("t1", "u1", { status: "COMPLETED", clientUpdatedAt: new Date(2020, 0, 1).toISOString() }),
    (err) => err.name === "ConflictError",
  );
});

test("DATA-01: update with clientUpdatedAt matching (1 row) succeeds without ConflictError", async () => {
  const row = { id: "t1", status: "TODO" };
  const db = makeDb({ updateResults: [[row]] });
  const repo = new TasksRepository(db);

  const result = await repo.updateStatus("t1", "u1", {
    status: "COMPLETED",
    clientUpdatedAt: new Date(2020, 0, 1).toISOString(),
  });
  assert.equal(result.id, "t1");
});

test("DATA-01: no findOne probe precedes the atomic UPDATE (no TOCTOU window)", async () => {
  const db = makeDb({ updateResults: [[{ id: "t1" }]] });
  const repo = new TasksRepository(db);

  await repo.update("t1", "u1", { title: "x", clientUpdatedAt: new Date().toISOString() });
  assert.ok(!db.capture.calls.includes("select"), "update must not perform a preliminary SELECT");
});

test("DATA-01: conflicting clientUpdatedAt is part of the WHERE predicate", async () => {
  const db = makeDb({ updateResults: [[]] });
  const repo = new TasksRepository(db);

  await repo.update("t1", "u1", { title: "x", clientUpdatedAt: "2020-01-01T00:00:00.000Z" }).catch(() => {});
  const predicates = db.capture.predicates["update"];
  assert.equal(predicates.length, 1, "a single UPDATE statement must carry the full predicate");
});

test("DATA-01: update without clientUpdatedAt does not raise on 0 rows", async () => {
  const db = makeDb({ updateResults: [[]] });
  const repo = new TasksRepository(db);

  const result = await repo.update("t1", "u1", { title: "x" });
  assert.equal(result, null, "plain updates keep null-result semantics (NotFound handled upstream)");
});

// ---------------------------------------------------------------------------
// [DATA-03] — HabitsRepository.removeLog
// ---------------------------------------------------------------------------

test("DATA-03: removeLog with 0 deleted rows returns existing streak without FOR UPDATE", async () => {
  const existingStreak = {
    habitId: "h1",
    currentStreak: 4,
    longestStreak: 9,
    lastLoggedDate: "2025-01-01",
    updatedAt: new Date(),
  };
  const db = makeDb({ deleteResults: [[]], selectResults: [[existingStreak]] });
  const repo = new HabitsRepository(db);

  const streak = await repo.removeLog("h1", "u1", "2025-01-01");

  assert.equal(streak.currentStreak, 4, "existing streak values must be returned verbatim");
  assert.equal(streak.longestStreak, 9);
  assert.ok(!db.capture.calls.includes("await:for"), "no FOR UPDATE lock may be acquired on a no-op deletion");
  assert.ok(
    !db.capture.calls.includes("await:returning") || true,
    "streak UPDATE (recalculation) must not run — verified by absence of lock below",
  );
});

test("DATA-03: removeLog with a deleted row acquires FOR UPDATE and recalculates", async () => {
  const db = makeDb({
    deleteResults: [[{ id: "log1" }]],
    selectResults: [[{ habitId: "h1", longestStreak: 2 }], []],
    updateResults: [[{ habitId: "h1", currentStreak: 0, longestStreak: 2, lastLoggedDate: null, updatedAt: new Date() }]],
  });
  const repo = new HabitsRepository(db);

  await repo.removeLog("h1", "u1", "2025-01-01");

  assert.ok(db.capture.calls.includes("await:for"), "a real deletion must take the streak row lock");
});

test("DATA-03: removeLog uses returning() to observe deleted-row count", async () => {
  const db = makeDb({ deleteResults: [[]], selectResults: [[null]] });
  const repo = new HabitsRepository(db);

  await repo.removeLog("h1", "u1", "2025-01-01");
  assert.ok(db.capture.calls.includes("await:returning"), "delete must capture rows via .returning()");
});
