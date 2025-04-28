import { Routes } from '@angular/router';
import { BlogComponent } from './blog.component'; // Adjust the import path

export const routes: Routes = [
  {
      path: '',
      data: {
        title: 'Blogs'
      },
      children: [
        {
          path: '',
          redirectTo: 'Blogs',
          pathMatch: 'full'
        },
  
        {
          path: 'Blogs',
          component: BlogComponent,
          data: {
            title: 'Blogs'
          }
        }
      ]
    }
];

