import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      <label *ngIf="label" class="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{{ label }}</label>
      <select
        [value]="value"
        [disabled]="disabled"
        (change)="handleChange($event)"
        (blur)="onTouched()"
        class="h-11 w-full rounded-lg bg-[#070d1e] border border-[#1e3570] px-3.5 text-sm text-[#f8fafc] transition-colors focus:border-[#0077b6] focus:outline-none focus:ring-1 focus:ring-[#0077b6] disabled:opacity-50 appearance-none cursor-pointer"
      >
        <option *ngIf="placeholder" value="" disabled selected>{{ placeholder }}</option>
        <option *ngFor="let opt of options" [value]="opt.value">{{ opt.label }}</option>
      </select>
      <span *ngIf="error" class="text-xs text-[#ef4444] mt-0.5">{{ error }}</span>
    </div>
  `
})
export class SelectComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder: string = '';
  @Input() options: SelectOption[] = [];
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

  handleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.value = select.value;
    this.onChange(this.value);
  }
}