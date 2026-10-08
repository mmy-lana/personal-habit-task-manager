import { Injectable, Inject } from '@nestjs/common';
import {
  type DatabaseClient,
  eq,
  and,
  sql,
  desc,
  habits as habitsTable,
  habitLogs as habitLogsTable,
  habitStreaks as habitStreaksTable,
} from '@repo/database';
import type { CreateHabitDto, UpdateHabitDto, LogHabitDto } from '@repo/shared-dto';

export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');

@Injectable()
export class HabitsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async create(userId: string, dto: CreateHabitDto) {
    return this.db.transaction(async (tx) => {
      const [habit] = await tx
        .insert(habitsTable)
        .values({
          userId,
          title: dto.title,
          description: dto.description ?? null,
          frequency: dto.frequency,
          targetCountPerPeriod: dto.targetCountPerPeriod,
          targetPeriodDays: dto.targetPeriodDays,
          colorHex: dto.colorHex,
        })
        .returning();

      if (!habit) throw new Error('Habit insert returned no row');

      // Atomic companion insert per transaction standard: zero-value streak row
      await tx.insert(habitStreaksTable).values({
        habitId: habit.id,
        currentStreak: 0,
        longestStreak: 0,
        lastLoggedDate: null,
      });

      return habit;
    });
  }

  async findAll(userId: string, includeArchived: boolean) {
    const conditions = [eq(habitsTable.userId, userId)];
    if (!includeArchived) {
      conditions.push(eq(habitsTable.isArchived, false));
    }

    const rows = await this.db
      .select({
        habit: habitsTable,
        streak: habitStreaksTable,
      })
      .from(habitsTable)
      .leftJoin(habitStreaksTable, eq(habitsTable.id, habitStreaksTable.habitId))
      .where(and(...conditions))
      .orderBy(desc(habitsTable.createdAt));

    const today = new Date().toISOString().split('T')[0];

    const results = await Promise.all(
      rows.map(async (row) => {
        const logsThisPeriod = await this.getLogsThisPeriod(row.habit.id, row.habit.targetPeriodDays);
        const completedToday = await this.hasLogForDate(row.habit.id, today!);

        return {
          id: row.habit.id,
          userId: row.habit.userId,
          title: row.habit.title,
          description: row.habit.description,
          frequency: row.habit.frequency,
          targetCountPerPeriod: row.habit.targetCountPerPeriod,
          targetPeriodDays: row.habit.targetPeriodDays,
          colorHex: row.habit.colorHex,
          isArchived: row.habit.isArchived,
          createdAt: row.habit.createdAt.toISOString(),
          updatedAt: row.habit.updatedAt.toISOString(),
          streak: row.streak
            ? {
                habitId: row.streak.habitId,
                currentStreak: row.streak.currentStreak,
                longestStreak: row.streak.longestStreak,
                lastLoggedDate: row.streak.lastLoggedDate,
                updatedAt: row.streak.updatedAt.toISOString(),
              }
            : {
                habitId: row.habit.id,
                currentStreak: 0,
                longestStreak: 0,
                lastLoggedDate: null,
                updatedAt: new Date().toISOString(),
              },
          completedToday,
          totalLogsThisPeriod: logsThisPeriod,
        };
      }),
    );

    return results;
  }

  async findOne(id: string, userId: string) {
    const [row] = await this.db
      .select({
        habit: habitsTable,
        streak: habitStreaksTable,
      })
      .from(habitsTable)
      .leftJoin(habitStreaksTable, eq(habitsTable.id, habitStreaksTable.habitId))
      .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, userId)))
      .limit(1);

    if (!row) return null;

    const today = new Date().toISOString().split('T')[0];
    const logsThisPeriod = await this.getLogsThisPeriod(row.habit.id, row.habit.targetPeriodDays);
    const completedToday = await this.hasLogForDate(row.habit.id, today!);

    return {
      id: row.habit.id,
      userId: row.habit.userId,
      title: row.habit.title,
      description: row.habit.description,
      frequency: row.habit.frequency,
      targetCountPerPeriod: row.habit.targetCountPerPeriod,
      targetPeriodDays: row.habit.targetPeriodDays,
      colorHex: row.habit.colorHex,
      isArchived: row.habit.isArchived,
      createdAt: row.habit.createdAt.toISOString(),
      updatedAt: row.habit.updatedAt.toISOString(),
      streak: row.streak
        ? {
            habitId: row.streak.habitId,
            currentStreak: row.streak.currentStreak,
            longestStreak: row.streak.longestStreak,
            lastLoggedDate: row.streak.lastLoggedDate,
            updatedAt: row.streak.updatedAt.toISOString(),
          }
        : {
            habitId: row.habit.id,
            currentStreak: 0,
            longestStreak: 0,
            lastLoggedDate: null,
            updatedAt: new Date().toISOString(),
          },
      completedToday,
      totalLogsThisPeriod: logsThisPeriod,
    };
  }

  async update(id: string, userId: string, dto: UpdateHabitDto) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) updateData['title'] = dto.title;
    if (dto.description !== undefined) updateData['description'] = dto.description;
    if (dto.frequency !== undefined) updateData['frequency'] = dto.frequency;
    if (dto.targetCountPerPeriod !== undefined) updateData['targetCountPerPeriod'] = dto.targetCountPerPeriod;
    if (dto.colorHex !== undefined) updateData['colorHex'] = dto.colorHex;
    if (dto.isArchived !== undefined) updateData['isArchived'] = dto.isArchived;

    const [updated] = await this.db
      .update(habitsTable)
      .set(updateData)
      .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, userId)))
      .returning();

    return updated ?? null;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(habitsTable)
      .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, userId)));

    return (result.rowCount ?? 0) > 0;
  }

  async logHabit(habitId: string, userId: string, dto: LogHabitDto) {
    return this.db.transaction(async (tx) => {
      // Row-level lock on streak first per transaction standard
      const [lockedStreak] = await tx
        .select()
        .from(habitStreaksTable)
        .where(eq(habitStreaksTable.habitId, habitId))
        .for('update');

      try {
        await tx.insert(habitLogsTable).values({
          habitId,
          userId,
          loggedDate: dto.date,
          count: dto.count,
          notes: dto.notes ?? null,
        });
      } catch (err: unknown) {
        // PostgreSQL unique constraint violation: duplicate check-in
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
          const conflictError = new Error('DUPLICATE_CHECK_IN');
          conflictError.name = 'ConflictError';
          throw conflictError;
        }
        throw err;
      }

      // Recalculate streak
      const newStreak = await this.recalculateStreak(tx, habitId, lockedStreak?.longestStreak ?? 0);

      return newStreak;
    });
  }

  async removeLog(habitId: string, userId: string, date: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(habitLogsTable)
        .where(
          and(
            eq(habitLogsTable.habitId, habitId),
            eq(habitLogsTable.loggedDate, date),
          ),
        );

      // Row-level lock for recalculation
      const [lockedStreak] = await tx
        .select()
        .from(habitStreaksTable)
        .where(eq(habitStreaksTable.habitId, habitId))
        .for('update');

      const newStreak = await this.recalculateStreak(tx, habitId, lockedStreak?.longestStreak ?? 0);

      return newStreak;
    });
  }

  private async recalculateStreak(tx: any, habitId: string, previousLongest: number) {
    // Get all logs ordered by date descending for past 365 days
    const logs = await tx
      .select({ loggedDate: habitLogsTable.loggedDate })
      .from(habitLogsTable)
      .where(eq(habitLogsTable.habitId, habitId))
      .orderBy(desc(habitLogsTable.loggedDate))
      .limit(365);

    let currentStreak = 0;
    let longestStreak = previousLongest;
    let lastLoggedDate: string | null = null;

    if (logs.length > 0) {
      const dates = logs.map((l: { loggedDate: string }) => l.loggedDate).sort().reverse();
      lastLoggedDate = dates[0] ?? null;

      // Calculate consecutive day streak from most recent
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const checkDate = new Date(dates[0]! + 'T00:00:00Z');

      // Allow streak to start from today or yesterday
      const diffFromToday = Math.floor((today.getTime() - checkDate.getTime()) / 86400000);
      if (diffFromToday > 1) {
        currentStreak = 0;
      } else {
        currentStreak = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]! + 'T00:00:00Z');
          const curr = new Date(dates[i]! + 'T00:00:00Z');
          const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    const [updated] = await tx
      .update(habitStreaksTable)
      .set({
        currentStreak,
        longestStreak,
        lastLoggedDate,
        updatedAt: new Date(),
      })
      .where(eq(habitStreaksTable.habitId, habitId))
      .returning();

    return {
      habitId: updated.habitId,
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      lastLoggedDate: updated.lastLoggedDate,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private async getLogsThisPeriod(habitId: string, periodDays: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    const sinceStr = since.toISOString().split('T')[0];

    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(habitLogsTable)
      .where(
        and(
          eq(habitLogsTable.habitId, habitId),
          sql`${habitLogsTable.loggedDate} >= ${sinceStr}`,
        ),
      );

    return result[0]?.count ?? 0;
  }

  private async hasLogForDate(habitId: string, date: string): Promise<boolean> {
    const result = await this.db
      .select({ id: habitLogsTable.id })
      .from(habitLogsTable)
      .where(
        and(
          eq(habitLogsTable.habitId, habitId),
          eq(habitLogsTable.loggedDate, date),
        ),
      )
      .limit(1);

    return result.length > 0;
  }
}