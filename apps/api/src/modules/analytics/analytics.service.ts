import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, gte, count } from '@repo/database';
import {
  type DatabaseClient,
  habitLogs as habitLogsTable,
  tasks as tasksTable,
} from '@repo/database';
import { DATABASE_CLIENT } from '../habits/habits.repository.js';

export interface DailyMetrics {
  date: string;
  habitsCompleted: number;
  tasksCompleted: number;
}

export interface AnalyticsSummary {
  totalHabitsCompleted7d: number;
  totalTasksCompleted7d: number;
  dailyMetrics: DailyMetrics[];
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async getSummary(userId: string): Promise<AnalyticsSummary> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    // Aggregate habit completions over last 7 days
    const habitRows = await this.db
      .select({
        date: habitLogsTable.loggedDate,
        total: count(),
      })
      .from(habitLogsTable)
      .where(
        sql`${habitLogsTable.userId} = ${userId} AND ${habitLogsTable.loggedDate} >= ${cutoff}`,
      )
      .groupBy(habitLogsTable.loggedDate)
      .orderBy(habitLogsTable.loggedDate);

    // Aggregate task completions over last 7 days
    const taskRows = await this.db
      .select({
        date: sql<string>`DATE(${tasksTable.completedAt})`.as('date'),
        total: count(),
      })
      .from(tasksTable)
      .where(
        sql`${tasksTable.userId} = ${userId} AND ${tasksTable.status} = 'COMPLETED' AND DATE(${tasksTable.completedAt}) >= ${cutoff}`,
      )
      .groupBy(sql`DATE(${tasksTable.completedAt})`)
      .orderBy(sql`DATE(${tasksTable.completedAt})`);

    const habitMap = new Map(habitRows.map((r) => [r.date, r.total]));
    const taskMap = new Map(taskRows.map((r) => [r.date, r.total]));

    const allDates = new Set([...habitMap.keys(), ...taskMap.keys()]);
    const sortedDates = Array.from(allDates).sort();

    let totalHabitsCompleted7d = 0;
    let totalTasksCompleted7d = 0;
    const dailyMetrics: DailyMetrics[] = [];

    for (const date of sortedDates) {
      const h = habitMap.get(date) ?? 0;
      const t = taskMap.get(date) ?? 0;
      totalHabitsCompleted7d += h;
      totalTasksCompleted7d += t;
      dailyMetrics.push({ date, habitsCompleted: h, tasksCompleted: t });
    }

    return { totalHabitsCompleted7d, totalTasksCompleted7d, dailyMetrics };
  }
}