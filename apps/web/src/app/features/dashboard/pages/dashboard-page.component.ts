import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardSignalStore } from '../state/dashboard-signal.store.js';
import { MetricTileComponent } from '@repo/ui/metric-tile';
import { CardComponent } from '@repo/ui/card';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, MetricTileComponent, CardComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white tracking-tight">Dashboard</h2>
        <p class="text-sm text-[#94a3b8] mt-0.5">Performance overview and aggregated analytics</p>
      </div>

      @if (store.isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else {
        <!-- Metric tiles -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-metric-tile
            label="Habit Completion Rate"
            [value]="store.completionRatio() + '%'"
            trend="+today"
            [trendPositive]="store.completionRatio() >= 50"
          />
          <app-metric-tile
            label="Active Habits"
            [value]="store.activeHabits().length"
            trend="tracking"
            [trendPositive]="true"
          />
          <app-metric-tile
            label="Pending Tasks"
            [value]="store.pendingTasks().length"
            trend="open pipeline"
            [trendPositive]="store.pendingTasks().length < 10"
          />
          <app-metric-tile
            label="Completed (7d)"
            [value]="store.summary().totalTasksCompleted7d + store.summary().totalHabitsCompleted7d"
            trend="last 7 days"
            [trendPositive]="true"
          />
        </section>

        <!-- Detail cards -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-card title="Streak Counters">
            <div class="space-y-2">
              @for (habit of store.activeHabits(); track habit.id) {
                <div class="flex items-center justify-between py-1.5 border-b border-[#1e3570] last:border-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.backgroundColor]="habit.colorHex"></span>
                    <span class="text-sm text-[#f8fafc] truncate">{{ habit.title }}</span>
                  </div>
                  <span class="text-xs font-mono font-semibold text-[#00b4d8] shrink-0 ml-2">
                    {{ habit.streak.currentStreak }}d
                  </span>
                </div>
              }
              @if (store.activeHabits().length === 0) {
                <p class="text-sm text-[#64748b]">No active habits yet.</p>
              }
            </div>
          </app-card>

          <app-card title="Pending Task Matrix">
            <div class="space-y-2">
              @for (task of store.pendingTasks().slice(0, 8); track task.id) {
                <div class="flex items-center justify-between py-1.5 border-b border-[#1e3570] last:border-0">
                  <span class="text-sm text-[#f8fafc] truncate flex-1">{{ task.title }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full shrink-0 ml-2"
                    [class]="priorityClass(task.priority)">
                    {{ task.priority }}
                  </span>
                </div>
              }
              @if (store.pendingTasks().length === 0) {
                <p class="text-sm text-[#64748b]">All tasks completed!</p>
              }
            </div>
          </app-card>
        </section>

        <!-- Daily metrics chart placeholder -->
        <app-card title="Daily Activity (7 Days)">
          <div class="flex items-end gap-2 h-32 pt-4">
            @for (day of store.summary().dailyMetrics; track day.date) {
              <div class="flex-1 flex flex-col items-center gap-1">
                <div
                  class="w-full bg-[#0077b6] rounded-t transition-all"
                  [class.min-h-[6px]]="(day.habitsCompleted + day.tasksCompleted) > 0"
                  [style.height.%]="barHeight(day.habitsCompleted + day.tasksCompleted)"
                ></div>
                <span class="text-[10px] text-[#64748b] font-mono">{{ day.date | slice:-5 }}</span>
              </div>
            }
            @if (store.summary().dailyMetrics.length === 0) {
              <p class="text-sm text-[#64748b] w-full text-center">No activity data yet.</p>
            }
          </div>
        </app-card>
      }
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
  readonly store = inject(DashboardSignalStore);

  ngOnInit(): void {
    void this.store.fetchAll();
  }

  priorityClass(priority: string): string {
    switch (priority) {
      case 'CRITICAL': return 'bg-[#ef4444]/15 text-[#ef4444]';
      case 'HIGH': return 'bg-[#f59e0b]/15 text-[#f59e0b]';
      case 'MEDIUM': return 'bg-[#0077b6]/15 text-[#00b4d8]';
      default: return 'bg-[#1e3570]/30 text-[#94a3b8]';
    }
  }

  barHeight(value: number): number {
    const max = Math.max(...this.store.summary().dailyMetrics.map((d) => d.habitsCompleted + d.tasksCompleted), 1);
    if (value > 0) {
      // Enforce a minimum visible baseline (8%) so low-activity days stay visible.
      return Math.max(Math.round((value / max) * 100), 8);
    }
    return 0;
  }
}