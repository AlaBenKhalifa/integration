import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import * as SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/api/messages`;
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  private readReceiptSubject = new Subject<any>();
  private isConnected = false;

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
    console.error('MessageService Error: ', error);
    
    // If it's a 404 Not Found, return an empty array or default value
    if (error.status === 404) {
      console.log('MessageService: Resource not found, returning empty result');
      // For methods returning observables of arrays/objects, return empty
      if (error.url?.includes('/conversation/') || 
          error.url?.includes('/history/') ||
          error.url?.includes('/conversations')) {
        return of([]) as any;
      }
      // For methods returning user details, return minimal user object
      if (error.url?.includes('/api/users/')) {
        return of({ 
          id: parseInt(error.url.split('/').pop()), 
          firstName: 'Unknown',
          lastName: 'User' 
        }) as any;
      }
      // For methods returning count, return 0
      if (error.url?.includes('/unread/count')) {
        return of({ count: 0 }) as any;
      }
    }
    
    // For status codes that indicate success but are reported as errors
    // This implements the optimistic UI pattern mentioned in the memory
    if (error.status >= 200 && error.status < 300) {
      console.log('MessageService: Treating error as success based on status code:', error.status);
      return of({}) as any;
    }
    
    throw error;
  }

  // Simple WebSocket connection - only call explicitly when needed
  connect(userId: number) {
    console.log('MessageService.connect called with userId:', userId);
    if (this.isConnected || !userId) {
      console.log('WebSocket already connected or no userId provided');
      return;
    }
    
    // For development: Let's use a standard WebSocket connection instead
    // as SockJS can be problematic in Angular development environment
    setTimeout(() => {
      try {
        // Create a standard WebSocket connection
        // In production, you'd use SockJS like this:
        // this.socket = new SockJS(environment.wsEndpoint);
        const token = localStorage.getItem('token');
        const wsUrl = environment.wsEndpoint.replace('http', 'ws') + 
                      `?token=${token || 'anonymous'}`;  // Add authentication token as query param
        
        console.log('Connecting to WebSocket at:', wsUrl);
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log('WebSocket connection opened');
          this.isConnected = true;
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Determine type of message and dispatch accordingly
            if (data.type === 'MESSAGE') {
              this.messageSubject.next(data.payload);
            } else if (data.type === 'READ_RECEIPT') {
              this.readReceiptSubject.next(data.payload);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;
        };
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
      }
    }, 500);
  }

  // Disconnect from WebSocket
  disconnect() {
    if (this.socket && this.isConnected) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      console.log('WebSocket Disconnected');
    }
  }

  // Get observable for new messages
  onNewMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  // Get observable for read receipts
  onReadReceipts(): Observable<any> {
    return this.readReceiptSubject.asObservable();
  }

  // Send a message using WebSocket
  sendMessageViaWebSocket(senderId: number, recipientId: number, content: string) {
    if (!this.isConnected || !this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        payload: {
          senderId,
          recipientId,
          content
        }
      }));
    } catch (error) {
      console.error('Error sending message via WebSocket:', error);
    }
  }

  // Mark message as read via WebSocket
  markAsReadViaWebSocket(messageId: number) {
    if (!this.isConnected || !this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'MARK_READ',
        payload: {
          messageId
        }
      }));
    } catch (error) {
      console.error('Error marking message as read via WebSocket:', error);
    }
  }

  // Send a message using HTTP (fallback if WebSocket fails)
  sendMessage(recipientId: number, content: string): Observable<any> {
    const sendUrl = `${environment.apiUrl}/api/messages/send`;
    const payload = {
      recipientId,
      content
    };
    
    console.log(`Sending message to user ${recipientId}:`, payload);
    
    return this.http.post(
      sendUrl,
      payload,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error(`Error sending message to user ${recipientId}:`, error);
      return this.handleError(error);
    }));
  }

  // Get conversation with another user (paginated)
  getConversation(userId: number, page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const conversationUrl = `${environment.apiUrl}/api/messages/conversation/${userId}`;
    
    console.log('Getting conversation with user:', conversationUrl);
    
    return this.http.get(
      conversationUrl,
      { headers: this.getHeaders(), params }
    ).pipe(catchError((error) => {
      console.error(`Error getting conversation with user ${userId}:`, error);
      return this.handleError(error);
    }));
  }

  // Get message history for a conversation
  getMessageHistory(userId: number): Observable<any[]> {
    const historyUrl = `${environment.apiUrl}/api/messages/history/${userId}`;
    console.log('Getting message history from:', historyUrl);
    
    return this.http.get<any[]>(
      historyUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error(`Error getting message history for user ${userId}:`, error);
      return this.handleError(error);
    }));
  }

  // Get all conversations
  getConversations(): Observable<any[]> {
    const conversationsUrl = `${environment.apiUrl}/api/messages/conversations`;
    console.log('Getting conversations from:', conversationsUrl);
    
    return this.http.get<any[]>(
      conversationsUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error getting conversations:', error);
      return this.handleError(error);
    }));
  }

  // Mark a message as read
  markAsRead(messageId: number): Observable<any> {
    const readUrl = `${environment.apiUrl}/api/messages/${messageId}/read`;
    
    return this.http.put(
      readUrl,
      {},
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error(`Error marking message ${messageId} as read:`, error);
      return this.handleError(error);
    }));
  }

  // Mark a conversation as read
  markConversationAsRead(userId: number): Observable<any> {
    const readUrl = `${environment.apiUrl}/api/messages/read/${userId}`;
    
    return this.http.put(
      readUrl,
      {},
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error(`Error marking conversation with user ${userId} as read:`, error);
      return this.handleError(error);
    }));
  }

  // Get unread messages count
  getUnreadCount(): Observable<{ count: number }> {
    const countUrl = `${environment.apiUrl}/api/messages/unread/count`;
    
    return this.http.get<{ count: number }>(
      countUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error getting unread message count:', error);
      return this.handleError(error);
    }));
  }
  
  // Get user details by ID
  getUserById(userId: number): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/api/users/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }
}
