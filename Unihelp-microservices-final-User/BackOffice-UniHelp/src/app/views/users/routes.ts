import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    loadComponent: () => import('./users-list/users-list.component').then(m => m.UsersListComponent)
  },
  {
    path: 'banned',
    loadComponent: () => import('./banned-users/banned-users.component').then(m => m.BannedUsersComponent)
  },
  {
    path: 'active',
    loadComponent: () => import('./active-users/active-users.component').then(m => m.ActiveUsersComponent)
  }
];
