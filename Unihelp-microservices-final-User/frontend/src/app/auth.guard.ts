import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    const userData = localStorage.getItem('user');
    if (!userData || !this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    const { id } = JSON.parse(userData);
    return this.authService.getUserById(id).pipe(
      map(() => true),
      catchError(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.clear();
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
