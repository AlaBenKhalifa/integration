import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SkillMatchingService {
  private apiUrl = `${environment.apiUrl}/api/skill-matching`;

  constructor(private http: HttpClient) { }

  // Get authorization headers
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Error handling
  private handleError(error: any): Observable<never> {
    console.error('SkillMatchingService Error: ', error);
    throw error;
  }

  // Find users with matching skills
  findUsersWithMatchingSkills(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.apiUrl}/matching`,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  // Find users with complementary skills
  findUsersWithComplementarySkills(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.apiUrl}/complementary`,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  // Find potential mentors
  findPotentialMentors(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.apiUrl}/mentors`,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }
}
