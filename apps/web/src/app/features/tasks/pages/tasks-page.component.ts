import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskSignalStore } from '../state/task-signal.store.js';
import { TaskCardComponent } from '../components/task-card.component.js';
import { TaskFilterToolbarComponent } from '../components/task-filter-toolbar.component.js';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [CommonModule, TaskCardComponent, TaskFilterToolbarComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white tracking-tight">Task Pipeline</h2>
        <p class="text-sm text-text-secondary mt-0.5">
          {{ store.filteredTasks().length }} tasks &middot; {{ store.projects().length }} projects
        </p>
      </div>

      <app-task-filter-toolbar />

      <div
        *ngIf="store.errorMessage()"
        class="bg-state-danger/10 border border-state-danger/30 rounded-xl p-4 text-sm text-state-danger flex items-center justify-between gap-3 transition-opacity"
      >
        <span>{{ store.errorMessage() }}</span>
        <button
          type="button"
          (click)="store.clearError()"
          class="shrink-0 text-xs px-2.5 py-1 rounded border border-state-danger/40 hover:bg-state-danger/20 min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
        >
          Dismiss
        </button>
      </div>

      @if (store.isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (store.filteredTasks().length === 0) {
        <div class="text-center py-12 text-text-muted text-sm">
          No tasks match the current filters.
        </div>
      } @else {
        <!-- Mobile: single column list -->
        <div class="grid grid-cols-1 md:hidden gap-3">
          @for (task of store.filteredTasks(); track task.id) {
            <app-task-card [task]="task" />
          }
        </div>

        <!-- Desktop: Kanban-style columns by status -->
        <div class="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          @for (col of columns; track col.key) {
            <div class="bg-[#070d1e] border border-surface-border rounded-xl p-3 min-h-50">
              <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                {{ col.label }}
                <span class="bg-surface-border text-text-primary text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {{ col.tasks.length }}
                </span>
              </h3>
              <div class="space-y-2">
                @for (task of col.tasks; track task.id) {
                  <app-task-card [task]="task" />
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TasksPageComponent implements OnInit {
  readonly store = inject(TaskSignalStore);

  get columns() {
    const grouped = this.store.tasksByStatus();
    return [
      { key: 'backlog', label: 'Backlog', tasks: grouped.backlog },
      { key: 'todo', label: 'To Do', tasks: grouped.todo },
      { key: 'inProgress', label: 'In Progress', tasks: grouped.inProgress },
      { key: 'inReview', label: 'In Review', tasks: grouped.inReview },
      { key: 'completed', label: 'Completed', tasks: grouped.completed },
    ];
  }

  ngOnInit(): void {
    // Spec requirement: fetchProjects alongside fetchTasks during route init
    void Promise.all([this.store.fetchProjects(), this.store.fetchTasks()]);
  }
}