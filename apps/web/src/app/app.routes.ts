import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/components/nav-shell.component.js').then((m) => m.NavShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page.component.js').then(
            (m) => m.DashboardPageComponent,
          ),
      },
      {
        path: 'habits',
        loadComponent: () =>
          import('./features/habits/pages/habits-page.component.js').then(
            (m) => m.HabitsPageComponent,
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/pages/tasks-page.component.js').then(
            (m) => m.TasksPageComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
