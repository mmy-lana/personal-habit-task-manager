import { pgTable, uuid, varchar, text, timestamp, boolean, integer, date, pgEnum, unique } from 'drizzle-orm/pg-core';

export const habitFrequencyEnum = pgEnum('habit_frequency_type', ['DAILY', 'WEEKLY', 'CUSTOM']);
export const taskPriorityEnum = pgEnum('task_priority_type', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const taskStatusEnum = pgEnum('task_status_type', ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  colorHex: varchar('color_hex', { length: 7 }).default('#0077b6').notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  priority: taskPriorityEnum('priority').default('MEDIUM').notNull(),
  status: taskStatusEnum('status').default('TODO').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const habits = pgTable('habits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 150 }).notNull(),
  description: text('description'),
  frequency: habitFrequencyEnum('frequency').default('DAILY').notNull(),
  targetCountPerPeriod: integer('target_count_per_period').default(1).notNull(),
  targetPeriodDays: integer('target_period_days').default(1).notNull(),
  colorHex: varchar('color_hex', { length: 7 }).default('#1282a2').notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const habitLogs = pgTable('habit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  habitId: uuid('habit_id').references(() => habits.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  loggedDate: date('logged_date').notNull(),
  count: integer('count').default(1).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_habit_log_date').on(table.habitId, table.loggedDate),
]);

export const habitStreaks = pgTable('habit_streaks', {
  id: uuid('id').defaultRandom().primaryKey(),
  habitId: uuid('habit_id').references(() => habits.id, { onDelete: 'cascade' }).notNull().unique(),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastLoggedDate: date('last_logged_date'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
