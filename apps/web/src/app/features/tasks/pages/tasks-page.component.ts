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
        <p class="text-sm text-[#94a3b8] mt-0.5">
          {{ store.filteredTasks().length }} tasks &middot; {{ store.projects().length }} projects
        </p>
      </div>

      <app-task-filter-toolbar />

      @if (store.isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (store.errorMessage()) {
        <div class="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-4 text-sm text-[#ef4444]">
          {{ store.errorMessage() }}
        </div>
      } @else if (store.filteredTasks().length === 0) {
        <div class="text-center py-12 text-[#64748b] text-sm">
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
            <div class="bg-[#070d1e] border border-[#1e3570] rounded-xl p-3 min-h-[200px]">
              <h3 class="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3 flex items-center gap-2">
                {{ col.label }}
                <span class="bg-[#1e3570] text-[#f8fafc] text-[10px] px-1.5 py-0.5 rounded-full font-mono">
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