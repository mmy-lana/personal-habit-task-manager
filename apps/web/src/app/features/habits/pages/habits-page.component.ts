import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HabitSignalStore } from '../state/habit-signal.store.js';
import { HabitCardComponent } from '../components/habit-card.component.js';
import { ButtonComponent } from '@repo/ui/button';

@Component({
  selector: 'app-habits-page',
  standalone: true,
  imports: [CommonModule, HabitCardComponent, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-white tracking-tight">Habit Tracker</h2>
          <p class="text-sm text-[#94a3b8] mt-0.5">
            {{ store.completionRatio() }}% completed today &middot; {{ store.activeHabits().length }} active
          </p>
        </div>

        <div class="flex gap-2">
          @for (f of filters; track f) {
            <app-button
              [variant]="store.filter() === f ? 'primary' : 'ghost'"
              (buttonClick)="store.setFilter(f)"
            >
              {{ f }}
            </app-button>
          }
        </div>
      </div>

      @if (store.isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (store.error()) {
        <div class="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-4 text-sm text-[#ef4444]">
          {{ store.error() }}
        </div>
      } @else if (store.filteredHabits().length === 0) {
        <div class="text-center py-12 text-[#64748b] text-sm">
          No habits found. Create your first habit to start tracking.
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          @for (habit of store.filteredHabits(); track habit.id) {
            <app-habit-card [habit]="habit" />
          }
        </div>
      }
    </div>
  `,
})
export class HabitsPageComponent implements OnInit {
  readonly store = inject(HabitSignalStore);
  readonly filters: Array<'ALL' | 'ACTIVE' | 'ARCHIVED'> = ['ACTIVE', 'ALL', 'ARCHIVED'];

  ngOnInit(): void {
    void this.store.fetchHabits();
  }
}