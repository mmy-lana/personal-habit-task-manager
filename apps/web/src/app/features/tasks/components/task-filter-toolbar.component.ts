import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TaskStatus, TaskPriority } from '@repo/shared-dto';
import { TaskSignalStore } from '../state/task-signal.store.js';

interface SelectOption {
  label: string;
  value: string;
}

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Backlog', value: 'BACKLOG' },
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { label: 'All Priorities', value: 'ALL' },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

@Component({
  selector: 'app-task-filter-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
      <div class="flex-1">
        <label class="text-xs font-medium text-[#94a3b8] uppercase tracking-wider block mb-1.5">Search</label>
        <input
          type="text"
          placeholder="Filter tasks by title..."
          [value]="store.currentFilter().searchQuery"
          (input)="onSearch($event)"
          class="h-11 w-full rounded-lg bg-[#070d1e] border border-[#1e3570] px-3.5 text-sm text-[#f8fafc] placeholder-[#64748b] focus:border-[#0077b6] focus:outline-none focus:ring-1 focus:ring-[#0077b6]"
        />
      </div>

      <div class="w-full sm:w-40">
        <label class="text-xs font-medium text-[#94a3b8] uppercase tracking-wider block mb-1.5">Status</label>
        <select
          [value]="store.currentFilter().status"
          (change)="onStatusChange($event)"
          class="h-11 w-full rounded-lg bg-[#070d1e] border border-[#1e3570] px-3.5 text-sm text-[#f8fafc] focus:border-[#0077b6] focus:outline-none focus:ring-1 focus:ring-[#0077b6] cursor-pointer appearance-none"
        >
          <option *ngFor="let opt of statusOptions" [value]="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div class="w-full sm:w-40">
        <label class="text-xs font-medium text-[#94a3b8] uppercase tracking-wider block mb-1.5">Priority</label>
        <select
          [value]="store.currentFilter().priority"
          (change)="onPriorityChange($event)"
          class="h-11 w-full rounded-lg bg-[#070d1e] border border-[#1e3570] px-3.5 text-sm text-[#f8fafc] focus:border-[#0077b6] focus:outline-none focus:ring-1 focus:ring-[#0077b6] cursor-pointer appearance-none"
        >
          <option *ngFor="let opt of priorityOptions" [value]="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>
  `,
})
export class TaskFilterToolbarComponent {
  readonly store = inject(TaskSignalStore);
  readonly statusOptions = STATUS_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.setFilter({ searchQuery: input.value });
  }

  onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setFilter({ status: select.value as TaskStatus | 'ALL' });
  }

  onPriorityChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setFilter({ priority: select.value as TaskPriority | 'ALL' });
  }
}