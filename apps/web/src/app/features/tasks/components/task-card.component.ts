import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TaskWithProjectDetail, TaskStatus } from '@repo/shared-dto';
import { BadgeComponent } from '@repo/ui/badge';
import { TaskSignalStore } from '../state/task-signal.store.js';

const PRIORITY_BADGE: Record<string, 'info' | 'warning' | 'danger' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

const STATUS_OPTIONS: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div class="bg-surface-card border border-surface-border rounded-xl p-4 transition-colors hover:bg-surface-card-hover min-h-18">
      <!-- Full-width title/description block: never squeezed by the status select -->
      <div class="w-full">
        <h4 class="text-sm font-semibold text-text-primary wrap-break-word line-clamp-2">{{ task.title }}</h4>
        <p *ngIf="task.description" class="text-xs text-text-secondary mt-1 line-clamp-2">{{ task.description }}</p>
      </div>

      <!-- Dedicated bottom action row -->
      <div class="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-surface-border/40">
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <app-badge [variant]="priorityBadge">{{ task.priority }}</app-badge>
          <app-badge variant="info">{{ task.status }}</app-badge>
          <span *ngIf="task.project" class="text-xs text-text-muted flex items-center gap-1 min-w-0">
            <span class="w-2 h-2 rounded-full inline-block shrink-0" [style.backgroundColor]="task.project.colorHex"></span>
            <span class="truncate">{{ task.project.name }}</span>
          </span>
        </div>

        <div class="flex items-center gap-2 shrink-0 ml-auto">
          <span *ngIf="task.dueDate" class="text-xs text-text-muted font-mono hidden sm:inline">
            {{ task.dueDate | date:'mediumDate' }}
          </span>

          <!-- Mobile action sheet trigger / Desktop inline select -->
          <select
            [value]="task.status"
            [disabled]="isUpdating()"
            (change)="onStatusChange($event)"
            aria-label="Change task status"
            class="shrink-0 h-11 min-h-11 min-w-11 rounded-lg bg-[#070d1e] border border-surface-border px-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option *ngFor="let s of statusOptions" [value]="s" [selected]="s === task.status">{{ s }}</option>
          </select>
        </div>
      </div>
    </div>
  `,
})
import { signal } from '@angular/core';

export class TaskCardComponent {
  @Input({ required: true }) task!: TaskWithProjectDetail;

  readonly statusOptions = STATUS_OPTIONS;
  readonly isUpdating = signal(false);
  private store = inject(TaskSignalStore);

  get priorityBadge(): 'info' | 'warning' | 'danger' | 'neutral' {
    return PRIORITY_BADGE[this.task.priority] ?? 'neutral';
  }

  async onStatusChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as TaskStatus;
    if (newStatus !== this.task.status && !this.isUpdating()) {
      this.isUpdating.set(true);
      try {
        await this.store.updateTaskStatus(this.task.id, newStatus);
      } finally {
        this.isUpdating.set(false);
      }
    }
  }
}