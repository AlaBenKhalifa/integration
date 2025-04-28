import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Event'
    },
    children: [
      {
        path: '',
        redirectTo: 'events',
        pathMatch: 'full'
      },
      {
        path: 'events',
        loadComponent: () => import('./events.component').then(m => m.EventsComponent),
        data: {
          title: 'Events'
        }
      }
    ]
  }
];
