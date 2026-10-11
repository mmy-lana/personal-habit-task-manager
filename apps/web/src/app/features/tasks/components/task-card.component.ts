import { Component, Input, inject, signal } from '@angular/core';
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

      <!-- Metadata Row: Priority Badge + Project + Due Date -->
      <div class="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-surface-border/40 text-xs">
        <div class="flex items-center gap-2 min-w-0">
          <app-badge [variant]="priorityBadge">{{ task.priority }}</app-badge>
          <span *ngIf="task.project" class="text-text-muted flex items-center gap-1 min-w-0">
            <span class="w-2 h-2 rounded-full inline-block shrink-0" [style.backgroundColor]="task.project.colorHex"></span>
            <span class="truncate">{{ task.project.name }}</span>
          </span>
        </div>
        <span *ngIf="task.dueDate" class="text-text-muted font-mono shrink-0">
          {{ task.dueDate | date:'mediumDate' }}
        </span>
      </div>

      <!-- Action Row: Full-width status dropdown -->
      <div class="relative mt-2.5">
        <select
          [value]="task.status"
          [disabled]="isUpdating()"
          (change)="onStatusChange($event)"
          aria-label="Change task status"
          class="w-full h-10 min-h-[44px] rounded-lg bg-[#070d1e] border border-surface-border pl-3 pr-8 text-xs text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option *ngFor="let s of statusOptions" [value]="s" [selected]="s === task.status">{{ s }}</option>
        </select>
        <svg
          class="w-3.5 h-3.5 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  `,
})
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