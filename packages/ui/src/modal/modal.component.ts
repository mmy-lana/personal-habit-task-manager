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
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#152b63] focus:outline-none focus:ring-2 focus:ring-[#0077b6] cursor-pointer"
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
