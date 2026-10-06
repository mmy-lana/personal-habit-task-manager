# UI Primitives & Design System Specification

### 1. Modern Corporate Deep Blue Design Tokens

```css
@theme {
  --breakpoint-sm: 430px;

  --color-surface-bg: #070d1e;
  --color-surface-card: #0c1836;
  --color-surface-card-hover: #11224d;
  --color-surface-elevated: #152b63;
  --color-surface-border: #1e3570;

  --color-brand-primary: #0077b6;
  --color-brand-primary-light: #0096c7;
  --color-brand-secondary: #034078;
  --color-brand-accent: #00b4d8;

  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-text-inverse: #070d1e;

  --color-state-success: #10b981;
  --color-state-warning: #f59e0b;
  --color-state-danger: #ef4444;
  --color-state-info: #0284c7;

  --font-family-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: "JetBrains Mono", monospace;
}
```

### 2. Viewport Breakpoint Directives

- **360px**: Full-width button stacking, 12px padding, min 44px touch targets.
- **390px**: Standard mobile portrait width, 16px lateral padding.
- **430px**: High-resolution mobile milestone, `sm:` scaling triggered.
- **768px**: Tablet portrait, 2-column card layouts, 24px container padding.
- **1024px+**: Desktop dashboard layout, persistent side rail, data density focus.

### 3. Atomic UI Components Specification

#### 3.1 Button Primitive (app-button)

```typescript
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
      class="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#070d1e] focus:ring-[#0077b6] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto"
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
```

#### 3.2 Card Primitive (app-card)

```typescript
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
```

#### 3.3 Metric Tile Primitive (app-metric-tile)

```typescript
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
```

#### 3.4 Badge Primitive (app-badge)

```typescript
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
```

#### 3.5 Input Primitive (app-input)

```typescript
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      <label *ngIf="label" class="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{{ label }}</label>
      <input
        [type]="type"
        [value]="value"
        [placeholder]="placeholder"
        [disabled]="disabled"
        (input)="handleInput($event)"
        (blur)="onTouched()"
        class="h-11 w-full rounded-lg bg-[#070d1e] border border-[#1e3570] px-3.5 text-sm text-[#f8fafc] placeholder-[#64748b] transition-colors focus:border-[#0077b6] focus:outline-none focus:ring-1 focus:ring-[#0077b6] disabled:opacity-50"
      />
      <span *ngIf="error" class="text-xs text-[#ef4444] mt-0.5">{{ error }}</span>
    </div>
  `
})
export class InputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() error?: string;

  value: string = '';
  disabled: boolean = false;

  onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: string): void {
    this.value = val || '';
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
  }
}
```

#### 3.6 Modal Primitive (app-modal)

```typescript
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusTrapFactory, FocusTrap } from '@angular/cdk/a11y';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isOpen"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="title ? 'modal-title' : null"
      (keydown.escape)="handleEscape()"
      tabindex="-1"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 md:items-center md:p-4"
    >
      <div
        (click)="handleBackdropClick($event)"
        class="absolute inset-0"
        aria-hidden="true"
      ></div>
      <div
        #modalContainer
        class="relative w-full rounded-t-2xl border-t border-[#1e3570] bg-[#0c1836] p-4 text-[#f8fafc] shadow-2xl transition-all max-h-[85vh] overflow-y-auto sm:max-w-lg md:rounded-xl md:border md:max-h-[90vh] md:p-6"
      >
        <div class="flex items-center justify-between pb-3 border-b border-[#1e3570]">
          <h2 *ngIf="title" id="modal-title" class="text-lg font-semibold tracking-tight text-white">{{ title }}</h2>
          <button
            type="button"
            (click)="close()"
            aria-label="Close dialog"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#152b63] focus:outline-none focus:ring-2 focus:ring-[#0077b6]"
          >
            <span class="text-xl leading-none">&times;</span>
          </button>
        </div>
        <div class="mt-4">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `
})
export class ModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() title?: string;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('modalContainer') modalContainer?: ElementRef<HTMLElement>;

  private focusTrapFactory = inject(FocusTrapFactory);
  private focusTrap?: FocusTrap;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        setTimeout(() => {
          if (this.modalContainer) {
            this.focusTrap = this.focusTrapFactory.create(this.modalContainer.nativeElement);
            this.focusTrap.focusInitialElementWhenReady();
          }
        }, 0);
      } else {
        this.focusTrap?.destroy();
      }
    }
  }

  ngOnDestroy(): void {
    this.focusTrap?.destroy();
  }

  close(): void {
    this.closed.emit();
  }

  handleEscape(): void {
    this.close();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
```
