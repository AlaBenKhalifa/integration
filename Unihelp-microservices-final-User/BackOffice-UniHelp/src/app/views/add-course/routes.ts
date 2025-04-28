import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Add-course'
    },
    children: [
      {
        path: '',
        redirectTo: 'add-course',
        pathMatch: 'full'
      },
      {
        path: 'add-course',
        loadComponent: () => import('./add-course.component').then(m => m.AddCourseComponent),
        data: {
          title: 'Courses'
        }
      },

    ]
  }
];

