import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    console.debug('[AdminGuard] token:', token);
    console.debug('[AdminGuard] userData:', userData);
    if (!token || !userData) {
      console.debug('[AdminGuard] Missing token or userData, redirecting to 404');
      return this.router.parseUrl('/404');
    }
    try {
      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // ms
      console.debug('[AdminGuard] token payload:', payload);
      console.debug('[AdminGuard] token exp:', exp, 'now:', Date.now());
      if (exp < Date.now()) {
        console.debug('[AdminGuard] Token expired, clearing localStorage and redirecting to 404');
        localStorage.clear();
        return this.router.parseUrl('/404');
      }
      const { role } = JSON.parse(userData);
      console.debug('[AdminGuard] user role:', role);
      if (role === 'ADMIN') {
        console.debug('[AdminGuard] Admin access granted');
        return true;
      } else {
        console.debug('[AdminGuard] User is not admin, redirecting to 404');
        return this.router.parseUrl('/404');
      }
    } catch (e) {
      console.debug('[AdminGuard] Exception:', e, 'Clearing localStorage and redirecting to 404');
      localStorage.clear();
      return this.router.parseUrl('/404');
    }
  }
}
