import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#0c1836] border border-[#1e3570] rounded-xl p-4 flex flex-col justify-between min-h-[96px] md:p-5">
      <span class="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{{ label }}</span>
      <div class="mt-2 flex items-baseline justify-between">
        <span class="text-2xl font-bold tracking-tight text-white md:text-3xl font-mono">{{ value }}</span>
        <span *ngIf="trend" [class]="trendClass" class="text-xs font-semibold px-2 py-0.5 rounded-full">
          {{ trend }}
        </span>
      </div>
    </div>
  `
})
export class MetricTileComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() trend?: string;
  @Input() trendPositive: boolean = true;

  get trendClass(): string {
    return this.trendPositive
      ? 'bg-[#10b981]/20 text-[#10b981]'
      : 'bg-[#ef4444]/20 text-[#ef4444]';
  }
}
