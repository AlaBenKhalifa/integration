import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Observable for unread notifications count
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('NotificationService initialized with base API URL:', environment.apiUrl);
    // Initialize unread count
    this.refreshUnreadCount();
  }

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
    console.error('NotificationService Error: ', error);
    
    // If it's a 404 Not Found, return an empty array or default value
    if (error.status === 404) {
      console.log('NotificationService: Resource not found, returning empty result');
      // For methods returning observables of arrays, we return empty array
      if (error.url?.includes('/api/notifications')) {
        return of([]) as any;
      }
      // For methods returning count, return 0
      if (error.url?.includes('/unread/count')) {
        return of({ count: 0 }) as any;
      }
    }
    
    // For status codes that indicate success but are reported as errors
    if (error.status >= 200 && error.status < 300) {
      console.log('NotificationService: Treating error as success based on status code:', error.status);
      return of({}) as any;
    }
    
    throw error;
  }

  // Get all notifications
  getNotifications(): Observable<any[]> {
    const notificationsUrl = `${environment.apiUrl}/api/notifications`;
    console.log('Getting notifications from:', notificationsUrl);
    
    return this.http.get<any[]>(
      notificationsUrl,
      { headers: this.getHeaders() }
    ).pipe(
      catchError((error) => {
        console.error('Error getting notifications:', error);
        return this.handleError(error);
      }),
      tap(notifications => {
        // Update the unread count whenever we fetch notifications
        const unreadCount = notifications.filter(n => !n.read).length;
        this.unreadCountSubject.next(unreadCount);
      })
    );
  }

  // Get paginated notifications
  getNotificationsPaginated(page: number = 0, size: number = 10): Observable<any> {
    const paginatedUrl = `${environment.apiUrl}/api/notifications/paginated`;
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get(
      paginatedUrl,
      { headers: this.getHeaders(), params }
    ).pipe(catchError(this.handleError));
  }

  // Mark a notification as read
  markAsRead(notificationId: number): Observable<any> {
    const readUrl = `${environment.apiUrl}/api/notifications/${notificationId}/read`;
    
    return this.http.put(
      readUrl,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => this.refreshUnreadCount()),
      catchError((error) => {
        console.error('Error marking notification as read:', error);
        return this.handleError(error);
      })
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<any> {
    const readAllUrl = `${environment.apiUrl}/api/notifications/read-all`;
    
    return this.http.put(
      readAllUrl,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        // Update local unread count immediately for better UI responsiveness
        this.unreadCountSubject.next(0);
        // Then refresh from server to ensure accuracy
        this.refreshUnreadCount();
      }),
      catchError((error) => {
        console.error('Error marking all notifications as read:', error);
        return this.handleError(error);
      })
    );
  }

  // Get unread notifications count
  getUnreadCount(): Observable<{ count: number }> {
    const countUrl = `${environment.apiUrl}/api/notifications/unread/count`;
    
    return this.http.get<{ count: number }>(
      countUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error getting unread notifications count:', error);
      return this.handleError(error);
    }));
  }

  // Refresh the unread count from the server
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCountSubject.next(response.count);
      },
      error: (error) => {
        console.error('Error fetching unread count:', error);
      }
    });
  }

  // Delete a notification
  deleteNotification(notificationId: number): Observable<any> {
    const deleteUrl = `${environment.apiUrl}/api/notifications/${notificationId}`;
    
    return this.http.delete(
      deleteUrl,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => this.refreshUnreadCount()),
      catchError((error) => {
        console.error('Error deleting notification:', error);
        return this.handleError(error);
      })
    );
  }

  // Process new notification (called when receiving a WebSocket notification)
  processNewNotification(notification: any): void {
    // Update unread count
    const currentCount = this.unreadCountSubject.value;
    this.unreadCountSubject.next(currentCount + 1);
  }
}
