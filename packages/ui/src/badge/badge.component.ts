import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="computedBadgeClasses" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border">
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  @Input() variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info' = 'neutral';

  get computedBadgeClasses(): string {
    switch (this.variant) {
      case 'success':
        return 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30';
      case 'warning':
        return 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30';
      case 'danger':
        return 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30';
      case 'info':
        return 'bg-[#0077b6]/15 text-[#00b4d8] border-[#0077b6]/30';
      case 'neutral':
      default:
        return 'bg-[#1e3570]/30 text-[#94a3b8] border-[#1e3570]';
    }
  }
}
