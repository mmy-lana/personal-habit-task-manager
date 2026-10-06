import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="computedClasses">
      <div *ngIf="title" class="mb-3 flex items-center justify-between">
        <h3 class="text-base font-semibold tracking-tight text-[#f8fafc] md:text-lg">{{ title }}</h3>
        <ng-content select="[card-action]"></ng-content>
      </div>
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() title?: string;
  @Input() compact: boolean = false;

  get computedClasses(): string {
    const base = 'bg-[#0c1836] border border-[#1e3570] rounded-xl text-[#f8fafc] transition-colors';
    const padding = this.compact ? 'p-3.5 md:p-4' : 'p-4 md:p-6';
    return `${base} ${padding}`;
  }
}
