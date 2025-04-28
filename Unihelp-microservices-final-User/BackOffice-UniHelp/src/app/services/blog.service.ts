import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from './user.service';

export interface Blog {
  idBlog: number | null;
  title: string;
  category: string;
  content: string;
  user: User | null;
  userId: number;
  imagepath: string;
  isVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private API_URL = 'http://localhost:8888/BLOG/api/blog';

  constructor(private http: HttpClient) {}

  uploadImage(formData: FormData): Observable<string> {
    return this.http.post<string>(`${this.API_URL}/upload-image`, formData, { responseType: 'text' as 'json' }).pipe(
      catchError(this.handleError)
    );
  }

  createBlog(blog: Blog): Observable<Blog> {
    return this.http.post<Blog>(`${this.API_URL}/addblog`, blog).pipe(
      catchError(this.handleError)
    );
  }

  updateBlog(blogId: number, blog: Blog): Observable<Blog> {
    return this.http.put<Blog>(`${this.API_URL}/${blogId}`, blog).pipe(
      catchError(this.handleError)
    );
  }

  verifyBlog(blogId: number): Observable<Blog> {
    return this.http.put<Blog>(`${this.API_URL}/verify/${blogId}`, {}).pipe(
      catchError(this.handleError)
    );
  }

  getAllBlogs(): Observable<Blog[]> {
    return this.http.get<Blog[]>(`${this.API_URL}`).pipe(
      catchError(this.handleError)
    );
  }

  getBlog(blogId: number): Observable<Blog> {
    return this.http.get<Blog>(`${this.API_URL}/${blogId}`).pipe(
      catchError(this.handleError)
    );
  }

  deleteBlog(blogId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${blogId}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error && error.error.message) {
        errorMessage += `\nDetails: ${error.error.message}`; // Include backend error details
      }
      if (error.status === 400) {
        errorMessage = `Bad Request: Invalid data sent to the server. ${error.error.message || ''}`;
      } else if (error.status === 403) {
        errorMessage = 'Forbidden: You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'Not Found: The requested resource was not found.';
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}
