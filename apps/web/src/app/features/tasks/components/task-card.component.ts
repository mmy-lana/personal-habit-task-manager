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
    <div class="bg-[#0c1836] border border-[#1e3570] rounded-xl p-4 transition-colors hover:bg-[#11224d] min-h-[72px]">
      <!-- Full-width title/description block: never squeezed by the status select -->
      <div class="w-full">
        <h4 class="text-sm font-semibold text-[#f8fafc] break-words line-clamp-2">{{ task.title }}</h4>
        <p *ngIf="task.description" class="text-xs text-[#94a3b8] mt-1 line-clamp-2">{{ task.description }}</p>
      </div>

      <!-- Dedicated bottom action row -->
      <div class="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#1e3570]/40">
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <app-badge [variant]="priorityBadge">{{ task.priority }}</app-badge>
          <app-badge variant="info">{{ task.status }}</app-badge>
          <span *ngIf="task.project" class="text-xs text-[#64748b] flex items-center gap-1 min-w-0">
            <span class="w-2 h-2 rounded-full inline-block shrink-0" [style.backgroundColor]="task.project.colorHex"></span>
            <span class="truncate">{{ task.project.name }}</span>
          </span>
        </div>

        <div class="flex items-center gap-2 shrink-0 ml-auto">
          <span *ngIf="task.dueDate" class="text-xs text-[#64748b] font-mono hidden sm:inline">
            {{ task.dueDate | date:'mediumDate' }}
          </span>

          <!-- Mobile action sheet trigger / Desktop inline select -->
          <select
            [value]="task.status"
            (change)="onStatusChange($event)"
            aria-label="Change task status"
            class="shrink-0 h-11 min-h-[44px] min-w-[44px] rounded-lg bg-[#070d1e] border border-[#1e3570] px-2 text-xs text-[#f8fafc] focus:border-[#0077b6] focus:outline-none focus:ring-1 focus:ring-[#0077b6] cursor-pointer appearance-none"
          >
            <option *ngFor="let s of statusOptions" [value]="s" [selected]="s === task.status">{{ s }}</option>
          </select>
        </div>
      </div>
    </div>
  `,
})
export class TaskCardComponent {
  @Input({ required: true }) task!: TaskWithProjectDetail;

  readonly statusOptions = STATUS_OPTIONS;
  private store = inject(TaskSignalStore);

  get priorityBadge(): 'info' | 'warning' | 'danger' | 'neutral' {
    return PRIORITY_BADGE[this.task.priority] ?? 'neutral';
  }

  onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as TaskStatus;
    if (newStatus !== this.task.status) {
      void this.store.updateTaskStatus(this.task.id, newStatus);
    }
  }
}