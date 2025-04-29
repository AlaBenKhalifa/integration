import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { FingerprintService } from '../services/fingerprint.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private fingerprintService: FingerprintService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get the token from localStorage
    const token = localStorage.getItem('auth_token');
    // Get current user from localStorage if available
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    const userId = currentUser?.id;

    // Clone the request and add the token if it exists
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Pass the request on to the next handler
    return next.handle(request).pipe(
      // Record successful API responses that might be of interest
      tap(event => {
        // Could add specific response tracking here if needed
      }),

      // Handle errors, particularly authentication errors
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          // Record logout if the user was previously authenticated
          if (userId) {
            this.fingerprintService.recordLogout(userId).then(() => {
              console.log('Logout recorded due to auth error');
            });
          }

          // Redirect to login page
          this.authService.logout();
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }
}
