import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import { FingerprintService } from './fingerprint.service';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
declare const google: any;

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  type: string;
  id: number;
  email: string;
  role: string;
  profileCompleted: boolean;
  newUser: boolean;
}

interface EmailRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  skills?: string;
  profileImage?: string;
  role: string;
  banned: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient, private fingerprintService: FingerprintService) {}

  register(formData: FormData): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/register`, formData, { responseType: 'json' })
      .pipe(catchError(this.handleError));
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((response) => {
        if (response.role !== 'ADMIN') {
          localStorage.setItem('token', response.token);
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: response.id,
              email: response.email,
              role: response.role,
            })
          );
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): Observable<string> {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    let userId = 0;

    if (user) {
      try {
        const userData = JSON.parse(user);
        userId = userData.id;
      } catch (e) {
        console.error('Error parsing user data during logout:', e);
      }
    }

    if (!token) {
      console.log('No token found in localStorage during logout');
      localStorage.clear();
      return of('Logout successful (no token present)');
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // Record the logout activity
    if (userId > 0) {
      this.fingerprintService.recordLogout(userId)
        .catch(err => console.error('Error recording logout activity:', err));
    }

    return this.http.post<string>(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      tap(() => {
        console.log('Logout successful, clearing localStorage');
        localStorage.clear();
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Logout request failed:', error.message);
        localStorage.clear();
        return this.handleError(error);
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getUserRole(): string | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).role : null;
  }

  getUserEmail(): string | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).email : null;
  }

  forgotPassword(email: string): Observable<string> {
    const request: EmailRequest = { email };
    return this.http
      .post(`${this.apiUrl}/forgot-password`, request, { responseType: 'text' })
      .pipe(catchError(this.handleError));
  }

  verifyResetToken(token: string): Observable<string> {
    return this.http
      .get<string>(`${this.apiUrl}/reset-password`, { params: { token } })
      .pipe(catchError(this.handleError));
  }

  resetPassword(request: ResetPasswordRequest): Observable<string> {
    return this.http
      .post<string>(`${this.apiUrl}/reset-password`, request)
      .pipe(catchError(this.handleError));
  }

  resetPasswordWithToken(token: string, newPassword: string): Observable<any> {
    const request: ResetPasswordRequest = { token, newPassword };
    return this.http
      .post(`${this.apiUrl}/reset-password`, request, { responseType: 'text' })
      .pipe(catchError(this.handleError));
  }

  loginWithGoogle(token: string): Observable<LoginResponse> {
    console.log('AuthService: Sending Google token to backend');
    return this.http.post<LoginResponse>(`${this.apiUrl}/google-login`, { token }, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    })
      .pipe(
        tap((response) => {
          console.log('AuthService: Received successful response from Google login');
          if (response.role !== 'ADMIN') {
            localStorage.setItem('token', response.token);
            localStorage.setItem(
              'user',
              JSON.stringify({
                id: response.id,
                email: response.email,
                role: response.role,
                profileCompleted: response.profileCompleted,
                newUser: response.newUser
              })
            );
          }
        }),
        catchError((error) => {
          console.error('AuthService: Error in Google login', error);
          return this.handleError(error);
        })
      );
  }

  completeProfile(userId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/complete-profile`, formData)
      .pipe(
        tap((response: any) => {
          // Update the user in localStorage with completed profile
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          user.profileCompleted = true;
          localStorage.setItem('user', JSON.stringify(user));
        }),
        catchError(this.handleError)
      );
  }

  getAllUsers(): Observable<User[]> {
    return this.http
      .get<User[]>(`${this.apiUrl}/admin/users`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Admin only: fetch user by ID
   */
  getUserById(id: number): Observable<User> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http
      .get<User>(`${this.apiUrl}/admin/users/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }



  banUser(id: number): Observable<string> {
    return this.http
      .post<string>(`${this.apiUrl}/admin/users/${id}/ban`, {})
      .pipe(catchError(this.handleError));
  }

  unbanUser(id: number): Observable<string> {
    return this.http
      .post<string>(`${this.apiUrl}/admin/users/${id}/unban`, {})
      .pipe(catchError(this.handleError));
  }

  updateUser(id: number, user: User): Observable<string> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    console.log('[AuthService.updateUser] Token:', token);
    console.log('[AuthService.updateUser] Authorization header:', headers.get('Authorization'));
    // Always use /admin/users/{id} for update
    return this.http
      .put<string>(`${this.apiUrl}/admin/users/${id}`, user, { headers })
      .pipe(catchError(this.handleError));
  }

  updateOwnProfile(id: number, user: User): Observable<string> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http
      .put<string>(`${this.apiUrl}/users/${id}`, user, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteUser(id: number): Observable<string> {
    return this.http
      .delete<string>(`${this.apiUrl}/admin/users/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Helper method to get auth headers with token
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getCurrentUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((user: User) => {
        // Store full name in localStorage for use in notifications
        if (user && user.firstName && user.lastName) {
          localStorage.setItem('fullName', `${user.firstName} ${user.lastName}`);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Get current user from local storage or fetch it from server if needed
  getUser(): Observable<User> {
    const user = localStorage.getItem('user');
    if (user) {
      return of(JSON.parse(user) as User);
    }
    return this.getCurrentUserProfile();
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage =
          'Network error: Could not connect to the server. Please check if the backend is running.';
      } else if (error.status === 413) {
        errorMessage =
          'Payload too large: The uploaded image is too big. Please upload a smaller image.';
      } else if (error.status === 500) {
        errorMessage = `Server error: ${
          error.error || 'Internal Server Error. Please check the backend logs.'
        }`;
      } else if (error.status === 400) {
        errorMessage = error.error || 'Invalid input. Please check your details.';
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${
          error.error || error.message
        }`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}
