import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10' },
  { path: '/habits', label: 'Habits', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { path: '/tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
];

@Component({
  selector: 'app-nav-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-[#070d1e] text-[#f8fafc] flex flex-col lg:flex-row">
      <!-- Desktop rail (1024px+) -->
      <aside
        class="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-[#1e3570] bg-[#0c1836] min-h-screen sticky top-0 h-screen"
      >
        <div class="h-16 flex items-center gap-3 px-5 border-b border-[#1e3570]">
          <div class="h-8 w-8 rounded bg-[#0077b6] flex items-center justify-center font-bold text-white text-xs">PM</div>
          <span class="text-sm font-semibold">Habit Manager</span>
        </div>
        <nav class="flex-1 p-3 space-y-1" aria-label="Primary">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
              [class]="isActive(item.path)
                ? 'bg-[#0077b6]/20 text-[#00b4d8]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#11224d]'"
            >
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="item.icon" />
              </svg>
              {{ item.label }}
            </a>
          }
        </nav>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <!-- Top navigation (768px+) -->
        <header class="hidden md:flex lg:hidden h-16 border-b border-[#1e3570] bg-[#0c1836] items-center justify-between px-6 sticky top-0 z-40">
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 rounded bg-[#0077b6] flex items-center justify-center font-bold text-white text-xs">PM</div>
            <span class="text-sm font-semibold">Habit Manager</span>
          </div>
          <nav class="flex gap-1" aria-label="Primary">
            @for (item of navItems; track item.path) {
              <a
                [routerLink]="item.path"
                class="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center"
                [class]="isActive(item.path)
                  ? 'bg-[#0077b6]/20 text-[#00b4d8]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#11224d]'"
              >
                {{ item.label }}
              </a>
            }
          </nav>
        </header>

        <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <router-outlet />
        </main>
      </div>

      <!-- Mobile bottom drawer (< 768px) -->
      <nav
        class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0c1836] border-t border-[#1e3570] flex pb-4"
        aria-label="Primary"
        style="padding-bottom: max(env(safe-area-inset-bottom), 1rem);"
      >
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors"
            [class]="isActive(item.path) ? 'text-[#00b4d8]' : 'text-[#64748b]'"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="item.icon" />
            </svg>
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </a>
        }
      </nav>
    </div>
  `,
})
export class NavShellComponent {
  readonly navItems = NAV_ITEMS;
  private router = inject(Router);

  readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.currentUrl.set(this.router.url);
    });
  }

  isActive(path: string): boolean {
    return this.currentUrl().startsWith(path);
  }
}
