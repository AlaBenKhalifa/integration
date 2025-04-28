import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Blog } from './blog.service'; // Adjust the import path as necessary
import { User } from './auth.service'; // Adjust the import path as necessary

export interface Comment {
  idComment: number | null;
  content: string;
  blog: Blog | null;
  user: User | null;
  userId: number;
}

@Injectable({
  providedIn: 'root'
})



export class CommentService {
  private API_URL = 'http://localhost:8888/BLOG/api/comment'; // Adjust base URL to match your backend

  constructor(private http: HttpClient) {}

  createComment(comment: Comment, blogId: number, userId: number): Observable<Comment> {
    const payload = {
      content: comment.content,
      blog: { idBlog: blogId }
    };
    console.log('Sending comment:', payload, 'to:', `${this.API_URL}/addcomment/${blogId}/${userId}`);
    return this.http.post<Comment>(`${this.API_URL}/addcomment/${userId}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  getAllComments(): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.API_URL}`).pipe(
      catchError(this.handleError)
    );
  }

  getComment(commentId: number): Observable<Comment> {
    return this.http.get<Comment>(`${this.API_URL}/${commentId}`).pipe(
      catchError(this.handleError)
    );
  }

  updateComment(commentId: number, comment: Comment): Observable<Comment> {
    const payload = {
      content: comment.content,
      blog: comment.blog ? { idBlog: comment.blog.idBlog } : null,
      userId: comment.userId
    };
    return this.http.put<Comment>(`${this.API_URL}/${commentId}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${commentId}`).pipe(
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
        errorMessage += `\nDetails: ${error.error.message}`;
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