import { Routes } from '@angular/router';
import { UserActivityComponent } from './user-activity.component';

export const routes: Routes = [
  {
    path: '',
    component: UserActivityComponent,
    data: {
      title: 'User Login Activity'
    }
  }
];
