import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./widgets/widgets.component').then(m => m.WidgetsComponent),
    data: {
      title: 'Widgets'
    }
  },
  {
    path: 'user-tracking',
    loadComponent: () => import('./user-tracking/user-tracking.component').then(m => m.UserTrackingComponent),
    data: {
      title: 'User Tracking'
    }
  }
];
