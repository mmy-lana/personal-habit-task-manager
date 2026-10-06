import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="buttonClick.emit($event)"
      [class]="computedClasses"
      class="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#070d1e] focus:ring-[#0077b6] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto cursor-pointer"
    >
      <span *ngIf="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'destructive' | 'ghost' = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  get computedClasses(): string {
    switch (this.variant) {
      case 'primary':
        return 'bg-[#0077b6] text-white hover:bg-[#0096c7] active:bg-[#034078]';
      case 'secondary':
        return 'bg-[#0c1836] text-[#f8fafc] border border-[#1e3570] hover:bg-[#11224d]';
      case 'destructive':
        return 'bg-[#ef4444] text-white hover:bg-[#dc2626]';
      case 'ghost':
        return 'bg-transparent text-[#94a3b8] hover:text-white hover:bg-[#0c1836]';
    }
  }
}
