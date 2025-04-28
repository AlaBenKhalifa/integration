import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private apiUrl = 'http://localhost:8888/EVENTS/api/tickets'; // Use proxy to route to http://localhost:8888/EVENTS/api/tickets

  constructor(private http: HttpClient) {}

  bookTicket(eventId: number, userId: number): Observable<any> {
    const body = { eventId, userId };
    return this.http.post(`${this.apiUrl}/book`, body);
  }

  getUserTickets(userId: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}?userId=${userId}`);
  }

  cancelTicket(ticketId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cancel/${ticketId}?userId=${userId}`);
  }

  getTicketsByEvent(eventId: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/event/${eventId}`);
  }
}
