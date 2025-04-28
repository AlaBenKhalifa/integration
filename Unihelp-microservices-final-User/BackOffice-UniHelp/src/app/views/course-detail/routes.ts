import { Routes } from '@angular/router';
import { CourseDetailComponent } from './course-detail.component'; // Adjust the import path

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
        path: 'courses/:id',
        component: CourseDetailComponent,
        data: {
          title: 'Course Detail'
        }
      }
    ]
  }
];
