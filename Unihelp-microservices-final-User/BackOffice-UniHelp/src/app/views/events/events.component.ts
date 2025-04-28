import { Component, OnInit } from '@angular/core';
import { EventService } from '../../services/event.service';
import { TicketService } from '../../services/ticket.service';
import { UserService } from '../../services/user.service';
import { Event } from '../../models/event.model';
import { Ticket } from '../../models/ticket.model';
import { User } from '../../models/user.model';
import { Observable, forkJoin, of } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-events',
  standalone: true,
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  imports: [
    DatePipe,
    NgClass,
    NgForOf,
    NgClass,
    FormsModule,
    NgIf,
    ReactiveFormsModule
  ],
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0, transform: 'translateY(20px)' })),
      transition(':enter', [
        animate('500ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class EventsComponent implements OnInit {
  events: Event[] = [];
  filteredEvents: Event[] = [];
  displayEvents: Event[] = [];
  isAdmin$: Observable<boolean>;
  expandedEvents: { [eventId: number]: boolean } = {};
  showModal: boolean = false;
  modalTickets: Ticket[] = [];
  modalEventTitle: string = '';
  notification: { message: string; type: string } | null = null;
  eventForm: FormGroup;
  showForm: boolean = false;
  isEditing: boolean = false;
  editingEventId: number | null = null;
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  currentUserId: number | null = null;

  constructor(
    private eventService: EventService,
    private ticketService: TicketService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    // Initialize form
    this.eventForm = this.fb.group({
      titre: ['', Validators.required],
      date: ['', Validators.required],
      lieu: ['', Validators.required],
      description: [''],
      userId: [null]
    });

    // Determine if user is admin
    this.isAdmin$ = this.getCurrentUser().pipe(
      map(user => user?.role === 'ADMIN'),
      catchError(() => of(false))
    );
  }

  ngOnInit(): void {
    this.loadEvents();
    this.setUserId();
  }

  getCurrentUser(): Observable<User | null> {
    // Assuming user ID is stored or retrievable; here we assume ID 1 for demo purposes
    // In a real app, you might get this from a token or session
    const userId = this.currentUserId || 1; // Replace with actual logic to get current user ID
    return this.userService.getUserById(userId).pipe(
      catchError(() => of(null))
    );
  }

  setUserId(): void {
    this.getCurrentUser().subscribe({
      next: (user) => {
        if (user && user.id) {
          this.currentUserId = user.id;
          this.eventForm.patchValue({ userId: user.id });
        }
      },
      error: (err) => {
        this.showNotification('Failed to load current user: ' + err.message, 'danger');
      }
    });
  }

  loadEvents(): void {
    this.eventService.getAllEvents().subscribe({
      next: (events: Event[]) => {
        this.events = events || [];
        this.filteredEvents = [...this.events];
        this.currentPage = 1;
        this.updatePagination();
        this.events.forEach(event => {
          if (event.eventId) {
            this.expandedEvents[event.eventId] = false;
          }
        });
      },
      error: (err: any) => {
        this.showNotification('Failed to load events: ' + err.message, 'danger');
        this.events = [];
        this.filteredEvents = [];
        this.displayEvents = [];
        this.updatePagination();
      }
    });
  }

  searchEvents(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      this.filteredEvents = this.events.filter(event =>
        (event.titre?.toLowerCase().includes(term) || event.lieu?.toLowerCase().includes(term))
      );
    } else {
      this.filteredEvents = [...this.events];
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredEvents.length / this.pageSize) || 1;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayEvents = this.filteredEvents.slice(startIndex, endIndex) || [];
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  toggleEventDetails(eventId?: number): void {
    if (eventId !== undefined) {
      this.expandedEvents[eventId] = !this.expandedEvents[eventId];
    }
  }

  deleteEvent(eventId?: number): void {
    if (eventId === undefined) {
      this.showNotification('Event ID is missing.', 'danger');
      return;
    }
    if (confirm('Are you sure you want to delete this event?')) {
      this.eventService.deleteEvent(eventId).subscribe({
        next: () => {
          this.events = this.events.filter(event => event.eventId !== eventId);
          this.searchEvents();
          this.showNotification('Event deleted successfully!', 'success');
        },
        error: (err: any) => {
          this.showNotification('Failed to delete event: ' + (err.error?.message || err.message), 'danger');
        }
      });
    }
  }

  viewBookings(eventId?: number): void {
    if (eventId === undefined) {
      this.showNotification('Event ID is missing.', 'danger');
      return;
    }

    const event = this.events.find(e => e.eventId === eventId);
    this.modalEventTitle = event?.titre || 'Event';

    this.ticketService.getTicketsByEvent(eventId).subscribe({
      next: (tickets: Ticket[]) => {
        if (tickets.length === 0) {
          this.modalTickets = tickets;
          this.showModal = true;
          return;
        }

        const validTickets = tickets.filter(ticket => ticket.userId != null && ticket.userId !== undefined);
        if (validTickets.length === 0) {
          this.showNotification('No valid user IDs found for bookings.', 'warning');
          this.modalTickets = tickets;
          this.showModal = true;
          return;
        }

        const userObservables = validTickets.map(ticket => this.userService.getUserById(ticket.userId));
        forkJoin(userObservables).subscribe({
          next: (users: User[]) => {
            const enrichedTickets: Ticket[] = tickets.map((ticket, index) => {
              const userIndex = validTickets.findIndex(t => t.userId === ticket.userId);
              return {
                ...ticket,
                user: userIndex !== -1 ? users[userIndex] : undefined
              };
            });
            this.modalTickets = enrichedTickets;
            this.showModal = true;
          },
          error: (err: any) => {
            this.showNotification('Failed to load user details: ' + (err.error?.message || err.message), 'danger');
            this.modalTickets = tickets;
            this.showModal = true;
          }
        });
      },
      error: (err: any) => {
        this.showNotification('Failed to load bookings: ' + (err.error?.message || err.message), 'danger');
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.modalTickets = [];
    this.modalEventTitle = '';
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
    if (this.showForm) {
      this.scrollToForm();
    }
  }

  editEvent(eventId?: number): void {
    if (eventId === undefined) {
      this.showNotification('Event ID is missing.', 'danger');
      return;
    }
    const event = this.events.find(e => e.eventId === eventId);
    if (event) {
      this.isEditing = true;
      this.editingEventId = eventId;
      this.eventForm.patchValue({
        titre: event.titre,
        date: event.date,
        lieu: event.lieu,
        description: event.description,
        userId: event.userId
      });
      this.showForm = true;
      this.scrollToForm();
    }
  }

  scrollToForm(): void {
    setTimeout(() => {
      const formElement = document.getElementById('event-form-section');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.showNotification('Please fill in all required fields.', 'danger');
      return;
    }

    const event: Event = this.eventForm.value;

    if (this.isEditing && this.editingEventId !== null) {
      this.eventService.updateEvent(this.editingEventId, event).subscribe({
        next: () => {
          this.showNotification('Event updated successfully!', 'success');
          this.loadEvents();
          this.resetForm();
          this.showForm = false;
        },
        error: (err: any) => {
          this.showNotification('Failed to update event: ' + (err.error?.message || err.message), 'danger');
        }
      });
    } else {
      this.eventService.createEvent(event).subscribe({
        next: () => {
          this.showNotification('Event added successfully!', 'success');
          this.loadEvents();
          this.resetForm();
          this.showForm = false;
        },
        error: (err: any) => {
          this.showNotification('Failed to add event: ' + (err.error?.message || err.message), 'danger');
        }
      });
    }
  }

  resetForm(): void {
    this.eventForm.reset();
    this.setUserId();
    this.isEditing = false;
    this.editingEventId = null;
  }

  showNotification(message: string, type: string): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 3000);
  }
}
