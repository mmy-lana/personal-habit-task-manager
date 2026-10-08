# Application-Layer Transaction Standard

> **Status:** normative. Every repository in `apps/api` and `packages/database` MUST comply.
> **Scope:** Neon PostgreSQL (transaction-mode pooling) accessed through Drizzle ORM.

## 1. Zero database triggers

This schema contains **no PostgreSQL triggers** — no `CREATE TRIGGER`, no rule-based
recalculation, no PL/pgSQL function that mutates a second table as a side effect.

Why this is a hard rule:

| Concern | Why triggers are banned |
| --- | --- |
| Transaction control | A trigger body executes inside the caller's transaction but is invisible to Drizzle. Drizzle cannot reason about, isolate, or roll back implicit trigger side effects in a typed way. |
| Testability | Logic living in the database cannot be unit-tested or type-checked; it only runs in integration. |
| Portability | The specification mandates "zero DB triggers", preserving ORM transaction control. |
| Observability | Writes performed by a trigger are invisible in the application write path and in query logs. |

**Consequence:** `habit_streaks` rows are **never** created by the database. There is no
`ON INSERT` trigger on `habits`, and no default-row insert of any kind.

## 2. The `habit_streaks` zero-rows insert rule

`habits.habit_id` is declared `UNIQUE`, so a habit has **at most one** streak row — and a
newly created habit has **zero** streak rows until the creating transaction inserts one.

The zero-rows insert happens **inside the same atomic transaction** as the habit insert,
in `HabitsRepository.create()`:

```ts
await this.db.transaction(async (tx) => {
  const [habit] = await tx.insert(habitsTable).values(input).returning();
  if (!habit) throw new NotFoundException('Habit insert returned no row');

  // Atomic companion insert: the streak row does not exist before this transaction
  // commits, and can never be missing once it does.
  await tx.insert(habitStreaksTable).values({
    habitId: habit.id,
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: null,
  });

  return habit;
});
```

Rules that follow from this:

1. The `habits` insert and the `habit_streaks` insert are **one** unit of work. If the
   streak insert fails, the habit must not exist.
2. Readers MUST tolerate the row being absent. The habit read model performs a `LEFT JOIN`
   onto `habit_streaks` and coalesces to a zero-valued streak rather than assuming a row
   exists. This keeps pre-existing data and out-of-band fixes from breaking the UI.
3. Re-creating a streak row is an explicit, idempotent `INSERT ... ON CONFLICT DO NOTHING`,
   never an implicit database default.
4. Deleting a habit cascades to its streak row through the declared
   `ON DELETE CASCADE` foreign key. Cascade is a *constraint*, not a trigger, and is the
   only permitted database-side write behaviour.

## 3. Driver selection

`drizzle-orm/neon-http` **cannot run transactions** — its session throws
`"No transactions support in neon-http driver"`. It is therefore restricted to reads.

| Driver | Client factory | Transactions | Permitted use |
| --- | --- | --- | --- |
| `drizzle-orm/neon-serverless` (WebSocket `Pool`) | `createDatabaseClient` | Yes | All writes, all transactions, all reads |
| `drizzle-orm/neon-http` | `createReadOnlyClient` | No | Read-only aggregate/point reads only |

`createDatabaseClient` is the default injected into every repository. Introducing a write
through `createReadOnlyClient` is a review-blocking defect.

## 4. Transaction boundaries

- **Transactions are owned by repositories**, never by controllers and never by services.
  A service orchestrates repository calls; it does not open a transaction around them.
- **One transaction per business operation.** The habit check-in operation is
  *lock → read logs → recompute streak → write streak → write log*, all inside a single
  `db.transaction(...)` callback.
- **No network I/O inside a transaction.** Never call an external HTTP API, never write
  to Redis, never `await` an unrelated repository. Transactions hold a pooled connection
  and, under transaction-mode pooling, a backend session slot.
- **The callback must not leak the transaction handle.** A `tx` argument must never be
  stored on `this` or passed to a component outside the callback.
- **Do not nest.** Nested `db.transaction(...)` calls open a second connection and can
  deadlock. Use the `tx` handle already in scope.

## 5. Row-level locking for recalculation

Streak recalculation is a read-modify-write over `habit_streaks`, so concurrent
check-ins for the same habit must serialise.

```sql
SELECT * FROM habit_streaks WHERE habit_id = $1 FOR UPDATE;
```

- The lock is taken as the **first** statement in the transaction.
- Under transaction-mode pooling, `FOR UPDATE` requires a real session, which is another
  reason the WebSocket driver is mandatory for this path.
- Lock ordering is always `habit_streaks` then `habit_logs`, so two concurrent
  transactions can never deadlock against each other.
- The uniqueness constraint `uq_habit_log_date (habit_id, logged_date)` is the ultimate
  arbiter for duplicate check-ins: a duplicate insert raises `23505`, which the
  repository maps to a domain "already checked in" result rather than a 500.

## 6. Isolation level

The application default is `READ COMMITTED`, which is sufficient when every read that
feeds a write is protected by `FOR UPDATE`. Raise the level only with a documented
reason:

```ts
await this.db.transaction(async (tx) => { /* ... */ }, { isolationLevel: 'serializable' });
```

Neon transaction-mode pooling pins a session for the duration of a transaction, so
stronger isolation is available — but it costs latency and must be justified per call
site, not enabled globally.

## 7. What must never appear in a migration

- `CREATE TRIGGER` / `CREATE FUNCTION ... RETURNS trigger`
- Side-effecting rules (`CREATE RULE`)
- Seed data — seeding is an application/repository concern, never migration DDL

Enum creation, indexes, constraints, and cascades are expected. Generated migrations are
committed under `packages/database/src/migrations` and reviewed as code.

## 8. Checklist for a new repository

- [ ] Uses the injected `DatabaseClient` (transaction-capable), never the HTTP client, for writes
- [ ] Multi-statement writes are wrapped in a single `db.transaction(...)`
- [ ] Read-modify-write takes `FOR UPDATE` on the contended row first
- [ ] No companion row is expected to be created by the database
- [ ] No network I/O inside the transaction callback
- [ ] Unique-constraint violations (`23505`) are mapped to a domain outcome
