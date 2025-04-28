package com.unihelp.event.controller;

import com.unihelp.event.clients.UserRestClient;
import com.unihelp.event.entities.Event;
import com.unihelp.event.entities.Ticket;
import com.unihelp.event.model.Role;
import com.unihelp.event.model.User;
import com.unihelp.event.services.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {
    private final TicketService ticketService;
    private final UserRestClient userRestClient;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Ticket createTicket(@RequestBody Ticket ticket) {
        return ticketService.createTicket(ticket);
    }

    @GetMapping
    public List<Ticket> getAllTickets(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return ticketService.getTicketsByUserId(userId);
        }
        return ticketService.getAllTickets();
    }

    @GetMapping("/{id}")
    public Ticket getTicketById(@PathVariable Long id) {
        return ticketService.getTicketById(id);
    }

    @PutMapping("/{id}")
    public Ticket updateTicket(@PathVariable Long id, @RequestBody Ticket ticket) {
        return ticketService.updateTicket(id, ticket);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<Ticket>> getTicketsByEvent(@PathVariable Long eventId) {
        List<Ticket> tickets = ticketService.getTicketsByEvent(eventId);
        return ResponseEntity.ok(tickets);
    }

    @PostMapping("/book")
    @ResponseStatus(HttpStatus.CREATED)
    public Ticket bookTicket(@RequestBody BookTicketRequest request) {
        System.out.println("Starting bookTicket for eventId: " + request.getEventId() + ", userId: " + request.getUserId());
        User user = userRestClient.findUserById(request.getUserId());
        System.out.println("Fetched user: " + (user != null ? user.getEmail() + ", role: " + user.getRole() : "null"));
        if (user == null) {
            System.out.println("User not found, throwing IllegalArgumentException");
            throw new IllegalArgumentException("User not found with ID: " + request.getUserId());
        }
        if (user.getRole() != Role.STUDENT) {
            System.out.println("User role is not STUDENT, throwing IllegalStateException");
            throw new IllegalStateException("Only users with the role 'STUDENT' can book tickets");
        }

        System.out.println("User validated, proceeding to create ticket");
        Ticket ticket = new Ticket();
        Event event = new Event();
        event.setEventId(request.getEventId());
        ticket.setEvent(event);
        ticket.setDateAchat(new Date());
        ticket.setDiscount(0.0);
        ticket.setUserId(request.getUserId());
        System.out.println("Calling ticketService.createTicket");
        return ticketService.createTicket(ticket);
    }

    @DeleteMapping("/cancel/{ticketId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelTicket(@PathVariable Long ticketId, @RequestParam Long userId) {
        System.out.println("Starting cancelTicket for ticketId: " + ticketId + ", userId: " + userId);
        // Validate user role
        User user = userRestClient.findUserById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found with ID: " + userId);
        }
        if (user.getRole() != Role.STUDENT) {
            throw new IllegalStateException("Only users with the role 'STUDENT' can cancel tickets");
        }

        // Fetch ticket and validate ownership
        Ticket ticket = ticketService.getTicketById(ticketId);
        if (ticket == null) {
            throw new IllegalArgumentException("Ticket not found with ID: " + ticketId);
        }
        if (!ticket.getUserId().equals(userId)) {
            throw new IllegalStateException("You can only cancel tickets that you booked");
        }

        // Delete the ticket
        ticketService.deleteTicket(ticketId);
    }

    public static class BookTicketRequest {
        private Long eventId;
        private Long userId;

        public Long getEventId() { return eventId; }
        public void setEventId(Long eventId) { this.eventId = eventId; }
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
    }
}