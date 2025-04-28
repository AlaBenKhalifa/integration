import { Routes } from '@angular/router';

import { AdminGuard } from '../../admin.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [AdminGuard],
    loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent),
    data: {
      title: $localize`Dashboard`
    }
  }
];

