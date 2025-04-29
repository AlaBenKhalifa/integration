import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { Client, Frame, Message } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/api/messages`;
  private stompClient: Client | null = null;
  private messageSubject = new Subject<any>();
  private readReceiptSubject = new Subject<any>();
  private isConnected = false;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('MessageService Error: ', error);
    if (error.status === 404) {
      if (error.url?.includes('/conversation/') || error.url?.includes('/history/') || error.url?.includes('/conversations')) {
        return of([]) as any;
      }
      if (error.url?.includes('/api/users/')) {
        return of({ id: parseInt(error.url.split('/').pop()!), firstName: 'Unknown', lastName: 'User' }) as any;
      }
      if (error.url?.includes('/unread/count')) {
        return of({ count: 0 }) as any;
      }
    }
    if (error.status >= 200 && error.status < 300) {
      return of({}) as any;
    }
    throw error;
  }

  connect() {
    if (this.isConnected) {
      console.log('Already connected');
      return;
    }

    const token = localStorage.getItem('token');
    // ⚡ IMPORTANT: use HTTP URL for SockJS, not ws://
    const socket = new SockJS(`${environment.apiUrl}/ws?token=${token || 'anonymous'}`);
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
    });

    this.stompClient.onConnect = (frame: Frame) => {
      console.log('Connected: ', frame);
      this.isConnected = true;

      this.stompClient?.subscribe('/user/queue/messages', (message: Message) => {
        const payload = JSON.parse(message.body);
        this.messageSubject.next(payload);
      });

      this.stompClient?.subscribe('/user/queue/errors', (message: Message) => {
        const payload = JSON.parse(message.body);
        console.error('WebSocket error received:', payload);
      });

      this.stompClient?.subscribe('/user/queue/read-receipts', (message: Message) => {
        const payload = JSON.parse(message.body);
        this.readReceiptSubject.next(payload);
      });
    };

    this.stompClient.onStompError = (frame: Frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.stompClient.activate();
  }

  disconnect() {
    if (this.stompClient && this.isConnected) {
      this.stompClient.deactivate();
      this.isConnected = false;
    }
  }

  onNewMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  onReadReceipts(): Observable<any> {
    return this.readReceiptSubject.asObservable();
  }

  sendMessageViaWebSocket(senderId: number, recipientId: number, content: string) {
    if (!this.stompClient || !this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    const payload = { senderId, recipientId, content };
    this.stompClient.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(payload)
    });
  }

  markAsReadViaWebSocket(messageId: number) {
    if (!this.stompClient || !this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    const payload = { messageId };
    this.stompClient.publish({
      destination: '/app/chat.markAsRead',
      body: JSON.stringify(payload)
    });
  }

  sendMessage(recipientId: number, content: string): Observable<any> {
    const sendUrl = `${this.apiUrl}/send/${recipientId}`;
    const payload = { content };
    return this.http.post(sendUrl, payload, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  getConversation(userId: number, page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    const url = `${this.apiUrl}/conversation/${userId}`;
    return this.http.get(url, { headers: this.getHeaders(), params })
      .pipe(catchError(error => this.handleError(error)));
  }

  getMessageHistory(userId: number): Observable<any[]> {
    const url = `${this.apiUrl}/history/${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversations`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  markAsRead(messageId: number): Observable<any> {
    const url = `${this.apiUrl}/${messageId}/read`;
    return this.http.put(url, {}, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  markConversationAsRead(userId: number): Observable<any> {
    const url = `${this.apiUrl}/conversation/${userId}/read`;
    return this.http.put(url, {}, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  getUnreadCount(): Observable<{ count: number }> {
    const url = `${this.apiUrl}/unread/count`;
    return this.http.get<{ count: number }>(url, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  getUserById(userId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/auth/users/${userId}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError(error)));
  }

  getProfileImageUrl(user: any): string {
    if (!user) return 'assets/img/default-avatar.png';
    if (typeof user === 'string') {
      if (/^[A-Za-z0-9+/=]+$/.test(user) && !user.startsWith('data:')) {
        return `data:image/jpeg;base64,${user}`;
      }
      return user;
    }
    if (user.profileImage) {
      const profileImage = user.profileImage;
      if (profileImage.startsWith('data:') || profileImage.startsWith('assets/') || profileImage.startsWith('http')) {
        return profileImage;
      }
      if (/^[A-Za-z0-9+/=]+$/.test(profileImage)) {
        return `data:image/jpeg;base64,${profileImage}`;
      }
      return `${environment.apiUrl}/${profileImage}`;
    }
    return 'assets/img/default-avatar.png';
  }
}
