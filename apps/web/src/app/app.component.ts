import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ButtonComponent } from '@repo/ui/button';
import { CardComponent } from '@repo/ui/card';
import { MetricTileComponent } from '@repo/ui/metric-tile';
import { ModalComponent } from '@repo/ui/modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ButtonComponent,
    CardComponent,
    MetricTileComponent,
    ModalComponent,
  ],
  template: `
    <div class="min-h-screen bg-[#070d1e] text-[#f8fafc] flex flex-col">
      <header class="h-16 border-b border-[#1e3570] bg-[#0c1836] px-4 flex items-center justify-between sticky top-0 z-40">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded bg-[#0077b6] flex items-center justify-center font-bold text-white tracking-wider text-xs">
            PM
          </div>
          <h1 class="text-sm font-semibold tracking-wide text-white sm:text-base">
            Personal Habit &amp; Task Manager
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <app-button variant="primary" (buttonClick)="isQuickAddOpen.set(true)">
            New Action
          </app-button>
        </div>
      </header>

      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-metric-tile label="Daily Habit Streak" [value]="14" trend="+2 days" [trendPositive]="true" />
          <app-metric-tile label="Habit Completion Rate" value="86%" trend="+4%" [trendPositive]="true" />
          <app-metric-tile label="Open Pipeline Tasks" [value]="8" trend="-3 items" [trendPositive]="true" />
          <app-metric-tile label="Critical Urgency" [value]="1" trend="Action required" [trendPositive]="false" />
        </section>

        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-card title="Habit Velocity Matrix">
            <p class="text-sm text-[#94a3b8] leading-relaxed">
              Synchronized tracking pipeline active. Micro-heatmaps and daily streak records initialized across the primary PostgreSQL store.
            </p>
          </app-card>
          <app-card title="Task Pipeline Status">
            <p class="text-sm text-[#94a3b8] leading-relaxed">
              Optimistic concurrency verification operational. Status changes are guarded with atomic row verification and local signal rollback buffers.
            </p>
          </app-card>
        </section>

        <router-outlet></router-outlet>
      </main>

      <app-modal [isOpen]="isQuickAddOpen()" title="Create Pipeline Entity" (closed)="isQuickAddOpen.set(false)">
        <div class="space-y-4">
          <p class="text-sm text-[#94a3b8]">
            Select an entity category to initiate habit tracking logs or workflow tasks.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <app-button variant="primary" (buttonClick)="isQuickAddOpen.set(false)">Create Habit</app-button>
            <app-button variant="secondary" (buttonClick)="isQuickAddOpen.set(false)">Create Task</app-button>
          </div>
        </div>
      </app-modal>
    </div>
  `,
})
export class AppComponent {
  readonly isQuickAddOpen = signal(false);
}
