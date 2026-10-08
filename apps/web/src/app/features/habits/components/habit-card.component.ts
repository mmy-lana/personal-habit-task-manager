import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { HabitWithStreakDetail } from '@repo/shared-dto';
import { BadgeComponent } from '@repo/ui/badge';
import { HabitSignalStore } from '../state/habit-signal.store.js';

@Component({
  selector: 'app-habit-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div
      class="bg-[#0c1836] border border-[#1e3570] rounded-xl p-4 flex items-start gap-3 transition-colors hover:bg-[#11224d] min-h-[72px]"
    >
      <div
        class="w-3 h-3 rounded-full mt-1.5 shrink-0"
        [style.backgroundColor]="habit.colorHex"
      ></div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h4 class="text-sm font-semibold text-[#f8fafc] truncate">{{ habit.title }}</h4>
          <app-badge
            [variant]="habit.completedToday ? 'success' : 'neutral'"
          >
            {{ habit.frequency }}
          </app-badge>
        </div>

        <p
          *ngIf="habit.description"
          class="text-xs text-[#94a3b8] line-clamp-2 mb-2"
        >
          {{ habit.description }}
        </p>

        <div class="flex items-center gap-3 text-xs text-[#64748b]">
          <span class="font-mono font-semibold text-[#00b4d8]">
            🔥 {{ habit.streak.currentStreak }}d
          </span>
          <span>Best: {{ habit.streak.longestStreak }}d</span>
          <span class="hidden sm:inline">
            {{ habit.targetCountPerPeriod }}/{{ habit.targetPeriodDays }}d
          </span>
        </div>
      </div>

      <button
        type="button"
        (click)="toggle()"
        [class]="habit.completedToday
          ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]'
          : 'bg-transparent border-[#1e3570] text-[#94a3b8] hover:border-[#0077b6] hover:text-white'"
        class="shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0077b6]"
        [attr.aria-label]="habit.completedToday ? 'Undo check-in for ' + habit.title : 'Check in ' + habit.title"
      >
        <svg *ngIf="habit.completedToday" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  `,
})
export class HabitCardComponent {
  @Input({ required: true }) habit!: HabitWithStreakDetail;

  private store = inject(HabitSignalStore);

  toggle(): void {
    void this.store.toggleCompletion(this.habit.id, this.store.selectedDate());
  }
}