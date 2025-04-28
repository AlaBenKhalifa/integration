import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class FriendshipService {
  // Removed private apiUrl field to use explicit URLs for each endpoint
  // Log the API URL during service initialization for debugging
  constructor(private http: HttpClient) {
    console.log('FriendshipService initialized with base API URL:', environment.apiUrl);
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
    console.error('FriendshipService Error: ', error);
    
    // If it's a 404 Not Found, return an empty array or default value
    if (error.status === 404) {
      console.log('FriendshipService: Resource not found, returning empty result');
      // For methods returning observables of arrays, we return empty array
      if (error.url?.includes('/friends') || 
          error.url?.includes('/pending') || 
          error.url?.includes('/suggestions')) {
        return of([]) as any;
      }
      // For methods returning count, return 0
      if (error.url?.includes('/pending/count')) {
        return of({ count: 0 }) as any;
      }
      // For methods returning status, return not connected
      if (error.url?.includes('/status/')) {
        return of({ status: 'NOT_CONNECTED' }) as any;
      }
    }
    
    // For status codes that indicate success but are reported as errors
    if (error.status >= 200 && error.status < 300) {
      console.log('FriendshipService: Treating error as success based on status code:', error.status);
      return of({}) as any;
    }
    
    throw error;
  }

  // Send a friend request
  sendFriendRequest(recipientId: number): Observable<any> {
    const requestUrl = `${environment.apiUrl}/api/friendships/request/${recipientId}`;
    return this.http.post(
      requestUrl,
      {},
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error sending friend request:', error);
      return this.handleError(error);
    }));
  }

  // Accept a friend request
  acceptFriendRequest(friendshipId: number): Observable<any> {
    const acceptUrl = `${environment.apiUrl}/api/friendships/${friendshipId}/accept`;
    return this.http.put(
      acceptUrl,
      {},
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error accepting friend request:', error);
      return this.handleError(error);
    }));
  }

  // Decline a friend request
  declineFriendRequest(friendshipId: number): Observable<any> {
    const declineUrl = `${environment.apiUrl}/api/friendships/${friendshipId}/decline`;
    return this.http.put(
      declineUrl,
      {},
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error declining friend request:', error);
      return this.handleError(error);
    }));
  }

  // Cancel a friend request
  cancelFriendRequest(friendshipId: number): Observable<any> {
    const cancelUrl = `${environment.apiUrl}/api/friendships/${friendshipId}/cancel`;
    return this.http.delete(
      cancelUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error canceling friend request:', error);
      return this.handleError(error);
    }));
  }

  // Remove a friend
  removeFriend(friendshipId: number): Observable<any> {
    const removeUrl = `${environment.apiUrl}/api/friendships/${friendshipId}`;
    return this.http.delete(
      removeUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error removing friend:', error);
      return this.handleError(error);
    }));
  }

  // Get all friends
  getFriends(): Observable<User[]> {
    const friendsUrl = `${environment.apiUrl}/api/friendships/friends`;
    console.log('Getting friends from:', friendsUrl);
    return this.http.get<User[]>(
      friendsUrl,
      { headers: this.getHeaders() }
    ).pipe(
      map((friends: User[]) => {
        // Process the profile images to ensure they are properly formatted
        return friends.map((friend: User) => {
          // Ensure profileImage is properly formatted (if not null)
          if (friend.profileImage) {
            // If it's not already a URL or data URL, assume it's base64 and add the prefix
            if (!friend.profileImage.startsWith('http') && 
                !friend.profileImage.startsWith('data:') && 
                !friend.profileImage.startsWith('assets/')) {
              friend.profileImage = `data:image/jpeg;base64,${friend.profileImage}`;
            }
          }
          return friend;
        });
      }),
      catchError((error) => {
        console.error('Error getting friends:', error);
        return this.handleError(error);
      })
    );
  }

  // Get pending friend requests
  getPendingFriendRequests(): Observable<any[]> {
    const pendingUrl = `${environment.apiUrl}/api/friendships/pending`;
    console.log('Getting pending requests from:', pendingUrl);
    return this.http.get<any[]>(
      pendingUrl,
      { headers: this.getHeaders() }
    ).pipe(
      map((requests: any[]) => {
        // Process the profile images to ensure they are properly formatted
        return requests.map((request: any) => {
          // Ensure profileImage is properly formatted (if not null)
          if (request.profileImage) {
            // If it's not already a URL or data URL, assume it's base64 and add the prefix
            if (!request.profileImage.startsWith('http') && 
                !request.profileImage.startsWith('data:') && 
                !request.profileImage.startsWith('assets/')) {
              request.profileImage = `data:image/jpeg;base64,${request.profileImage}`;
            }
          }
          return request;
        });
      }),
      catchError((error) => {
        console.error('Error getting pending requests:', error);
        return this.handleError(error);
      })
    );
  }

  // Get sent friend requests
  getSentFriendRequests(): Observable<any[]> {
    const sentUrl = `${environment.apiUrl}/api/friendships/sent`;
    return this.http.get<any[]>(
      sentUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error getting sent friend requests:', error);
      return this.handleError(error);
    }));
  }

  // Check friendship status with another user
  getFriendshipStatus(userId: number): Observable<{ status: string }> {
    const statusUrl = `${environment.apiUrl}/api/friendships/status/${userId}`;
    return this.http.get<{ status: string }>(
      statusUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error getting friendship status:', error);
      return this.handleError(error);
    }));
  }

  // Get friend suggestions
  getFriendSuggestions(): Observable<User[]> {
    const suggestionsUrl = `${environment.apiUrl}/api/friendships/suggestions`;
    console.log('Getting friend suggestions from:', suggestionsUrl);
    return this.http.get<User[]>(
      suggestionsUrl,
      { headers: this.getHeaders() }
    ).pipe(
      map((suggestions: User[]) => {
        // Process the profile images to ensure they are properly formatted
        return suggestions.map((suggestion: User) => {
          // Ensure profileImage is properly formatted (if not null)
          if (suggestion.profileImage) {
            // If it's not already a URL or data URL, assume it's base64 and add the prefix
            if (!suggestion.profileImage.startsWith('http') && 
                !suggestion.profileImage.startsWith('data:') && 
                !suggestion.profileImage.startsWith('assets/')) {
              suggestion.profileImage = `data:image/jpeg;base64,${suggestion.profileImage}`;
            }
          }
          return suggestion;
        });
      }),
      catchError((error) => {
        console.error('Error getting friend suggestions:', error);
        // Log the complete error for debugging
        console.log('Full error object:', error);
        return this.handleError(error);
      })
    );
  }
  
  // Get count of pending friend requests
  getPendingRequestsCount(): Observable<{ count: number }> {
    const countUrl = `${environment.apiUrl}/api/friendships/pending/count`;
    return this.http.get<{ count: number }>(
      countUrl,
      { headers: this.getHeaders() }
    ).pipe(catchError((error) => {
      console.error('Error getting pending request count:', error);
      return this.handleError(error);
    }));
  }
}
