import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Course'
    },
    children: [
      {
        path: '',
        redirectTo: 'courses',
        pathMatch: 'full'
      },
      {
        path: 'courses',
        loadComponent: () => import('./course.component').then(m => m.CourseComponent),
        data: {
          title: 'Courses'
        }
      }
    ]
  }
];

