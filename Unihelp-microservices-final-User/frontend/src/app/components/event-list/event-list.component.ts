import { Component, OnInit, Inject } from '@angular/core';
import { EventService } from '../../services/event.service';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Event } from '../../models/event.model';
import { Ticket } from '../../models/ticket.model';
import { User } from '../../models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import * as QRCode from 'qrcode';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

interface AuthUser {
  userId: number;
  role: string;
}

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css'],
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0, transform: 'translateY(20px)' })),
      transition(':enter', [
        animate('400ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class EventListComponent implements OnInit {
  events: Event[] = [];
  filteredEvents: Event[] = [];
  isStudent$: Observable<boolean>;
  userId?: number;
  currentUser: AuthUser | null = null;
  userTickets: Ticket[] = [];
  hasBooked: { [eventId: number]: boolean } = {};
  expandedEvents: { [eventId: number]: boolean } = {};
  qrCodes: { [eventId: number]: string | null } = {};
  showQrCode: { [eventId: number]: boolean } = {};
  viewMode: 'list' | 'calendar' = 'list';

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    events: [],
    eventClick: this.handleEventClick.bind(this)
  };

  constructor(
    private eventService: EventService,
    private ticketService: TicketService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    // Define isStudent$ using getUserRole from AuthService
    this.isStudent$ = of(this.authService.getUserRole()).pipe(
      map(role => role === 'STUDENT') // Matches backend role
    );
  }

  ngOnInit(): void {
    // Fetch current user using getUser from AuthService
    this.authService.getUser().subscribe({
      next: (user) => {
        this.currentUser = user ? { userId: user.id, role: user.role } : null;
        this.userId = user?.id;
        if (this.userId) {
          this.loadUserTickets();
        }
        this.loadEvents();
      },
      error: (error) => {
        this.snackBar.open('Failed to load user profile', 'Close', { duration: 3000 });
        console.error(error);
      }
    });
  }

  loadUserTickets(): void {
    if (!this.userId) return;
    this.ticketService.getUserTickets(this.userId).subscribe({
      next: (tickets: Ticket[]) => {
        this.userTickets = tickets;
        this.updateHasBooked();
        this.updateFilteredEvents();
        this.updateCalendarEvents();
      },
      error: () => this.snackBar.open('Failed to load tickets', 'Close', { duration: 3000 })
    });
  }

  loadEvents(): void {
    this.eventService.getAllEvents().subscribe({
      next: (events: Event[]) => {
        this.events = events;
        this.events.forEach(event => {
          if (event.eventId) this.expandedEvents[event.eventId] = false;
        });
        this.updateHasBooked();
        this.updateFilteredEvents();
        this.updateCalendarEvents();
      },
      error: () => this.snackBar.open('Failed to load events', 'Close', { duration: 3000 })
    });
  }

  updateFilteredEvents(): void {
    this.filteredEvents = this.events.filter(event =>
      event.eventId && !this.hasBooked[event.eventId]
    );
  }

  updateHasBooked(): void {
    this.events.forEach(event => {
      if (event.eventId) {
        const ticket = this.userTickets.find(t => t.event && t.event.eventId === event.eventId);
        this.hasBooked[event.eventId] = !!ticket;
        if (ticket) this.generateQrCode(event, ticket);
      }
    });
    this.updateFilteredEvents();
  }

  updateCalendarEvents(): void {
    const calendarEvents: EventInput[] = [];
    this.userTickets.forEach(ticket => {
      const event = ticket.event;
      if (event && event.eventId && event.date) {
        calendarEvents.push({
          id: `booked-${event.eventId}`,
          title: event.titre,
          start: event.date,
          backgroundColor: '#3b5998',
          borderColor: '#3b5998',
          extendedProps: { type: 'booked', description: event.description, lieu: event.lieu }
        });
      }
    });
    this.filteredEvents.forEach(event => {
      if (event.eventId && event.date) {
        calendarEvents.push({
          id: `upcoming-${event.eventId}`,
          title: event.titre,
          start: event.date,
          backgroundColor: '#28a745',
          borderColor: '#28a745',
          extendedProps: { type: 'upcoming', description: event.description, lieu: event.lieu }
        });
      }
    });
    this.calendarOptions.events = calendarEvents;
  }

  toggleView(): void {
    console.log('Before toggle, viewMode:', this.viewMode);
    this.viewMode = this.viewMode === 'list' ? 'calendar' : 'list';
    console.log('After toggle, viewMode:', this.viewMode);
  }

  handleEventClick(arg: EventClickArg): void {
    const event = arg.event;
    this.dialog.open(EventDetailsDialogComponent, {
      data: {
        title: event.title,
        date: event.start ? event.start.toISOString() : '',
        description: event.extendedProps['description'],
        lieu: event.extendedProps['lieu'],
        type: event.extendedProps['type']
      },
      width: '300px'
    });
  }

  toggleEventDetails(eventId?: number): void {
    if (eventId !== undefined) this.expandedEvents[eventId] = !this.expandedEvents[eventId];
  }

  generateQrCode(event: Event, ticket: Ticket): void {
    if (!event.eventId) return;
    this.authService.getUser().subscribe({
      next: (user: any) => {
        // Cast to align with User model (skills: string[] | undefined)
        const castedUser: User = {
          ...user,
          skills: user.skills ? user.skills.split(',') : undefined // Convert string to string[] if present
        };
        const qrContent = `Event: ${event.titre}\nStudent: ${castedUser.firstName} ${castedUser.lastName}\nEvent Date: ${event.date}\nStatus: Confirmed`;
        QRCode.toDataURL(qrContent, { width: 200 }, (err, url) => {
          if (err) {
            console.error('QR code generation failed:', err);
            this.snackBar.open('Failed to generate QR code', 'Close', { duration: 3000 });
            return;
          }
          this.qrCodes[event.eventId!] = url;
        });
      },
      error: (err) => {
        console.error('Failed to fetch user for QR code:', err);
        this.snackBar.open('Failed to generate QR code', 'Close', { duration: 3000 });
      }
    });
  }

  toggleQrCode(eventId?: number): void {
    if (eventId !== undefined) this.showQrCode[eventId] = !this.showQrCode[eventId];
  }

  bookTicket(eventId?: number): void {
    if (!eventId || !this.userId) return;
    this.ticketService.bookTicket(eventId, this.userId).subscribe({
      next: () => {
        this.snackBar.open('Registration successful!', 'Close', { duration: 3000 });
        this.loadUserTickets();
      },
      error: () => this.snackBar.open('Failed to register', 'Close', { duration: 3000 })
    });
  }

  cancelBooking(eventId?: number): void {
    if (!eventId || !this.userId) return;
    const ticket = this.userTickets.find(t => t.event && t.event.eventId === eventId);
    if (!ticket || !ticket.ticketId) return;
    if (confirm('Are you sure you want to cancel?')) {
      this.ticketService.cancelTicket(ticket.ticketId!, this.userId!).subscribe({
        next: () => {
          this.snackBar.open('Registration canceled!', 'Close', { duration: 3000 });
          this.loadUserTickets();
          this.loadEvents();
          this.hasBooked[eventId] = false;
          this.qrCodes[eventId] = null;
          this.showQrCode[eventId] = false;
        },
        error: () => this.snackBar.open('Failed to cancel', 'Close', { duration: 3000 })
      });
    }
  }

  descriptionExceedsLimit(description: string): boolean {
    return description.length > 130;
  }
}

@Component({
  selector: 'app-event-details-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p><strong>Type:</strong> {{ data.type === 'booked' ? 'Booked' : 'Upcoming' }}</p>
      <p><strong>Date:</strong> {{ data.date | date:'medium' }}</p>
      <p><strong>Location:</strong> {{ data.lieu }}</p>
      <p><strong>Description:</strong> {{ data.description }}</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `
})
export class EventDetailsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
