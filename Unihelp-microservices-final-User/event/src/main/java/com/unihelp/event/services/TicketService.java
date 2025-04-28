package com.unihelp.event.services;

import com.unihelp.event.Repository.TicketRepository;
import com.unihelp.event.Repository.EventRepository;
import com.unihelp.event.clients.UserRestClient;
import com.unihelp.event.entities.Ticket;
import com.unihelp.event.entities.Event;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketService {
    private final TicketRepository ticketRepository;
    private final EventRepository eventRepository;
    private final UserRestClient userRestClient;

    public Ticket createTicket(Ticket ticket) {
        if (ticket.getEvent() == null || ticket.getEvent().getEventId() == null) {
            throw new IllegalArgumentException("Event ID is required to create a ticket");
        }
        Event event = eventRepository.findById(ticket.getEvent().getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found with ID: " + ticket.getEvent().getEventId()));
        if (event.getUserId() != 0) {
            try {
                System.out.println("Fetching user for eventId: " + event.getEventId() + ", userId: " + event.getUserId());
                event.setUser(userRestClient.findUserById(event.getUserId()));
                System.out.println("User fetched for eventId: " + event.getEventId() + ": " + (event.getUser() != null ? event.getUser().getEmail() : "null"));
            } catch (Exception e) {
                System.out.println("Error fetching user for eventId: " + event.getEventId() + ": " + e.getMessage());
                event.setUser(null);
            }
        }
        ticket.setEvent(event);
        return ticketRepository.save(ticket);
    }

    public List<Ticket> getAllTickets() {
        List<Ticket> tickets = ticketRepository.findAll();
        tickets.forEach(ticket -> {
            if (ticket.getEvent().getUserId() != 0) {
                try {
                    System.out.println("Fetching user for ticketId: " + ticket.getTicketId() + ", eventId: " + ticket.getEvent().getEventId() + ", userId: " + ticket.getEvent().getUserId());
                    ticket.getEvent().setUser(userRestClient.findUserById(ticket.getEvent().getUserId()));
                    System.out.println("User fetched for ticketId: " + ticket.getTicketId() + ": " + (ticket.getEvent().getUser() != null ? ticket.getEvent().getUser().getEmail() : "null"));
                } catch (Exception e) {
                    System.out.println("Error fetching user for ticketId: " + ticket.getTicketId() + ": " + e.getMessage());
                    ticket.getEvent().setUser(null);
                }
            }
        });
        return tickets;
    }

    public List<Ticket> getTicketsByUserId(Long userId) {
        // Fetch all tickets and filter by userId
        List<Ticket> tickets = ticketRepository.findAll()
                .stream()
                .filter(ticket -> ticket.getUserId() != null && ticket.getUserId().equals(userId))
                .collect(Collectors.toList());

        // Enrich tickets with user details for the associated event
        tickets.forEach(ticket -> {
            if (ticket.getEvent().getUserId() != null && ticket.getEvent().getUserId() != 0) {
                try {
                    System.out.println("Fetching user for ticketId: " + ticket.getTicketId() + ", eventId: " + ticket.getEvent().getEventId() + ", userId: " + ticket.getEvent().getUserId());
                    ticket.getEvent().setUser(userRestClient.findUserById(ticket.getEvent().getUserId()));
                    System.out.println("User fetched for ticketId: " + ticket.getTicketId() + ": " + (ticket.getEvent().getUser() != null ? ticket.getEvent().getUser().getEmail() : "null"));
                } catch (Exception e) {
                    System.out.println("Error fetching user for ticketId: " + ticket.getTicketId() + ": " + e.getMessage());
                    ticket.getEvent().setUser(null);
                }
            }
        });

        return tickets;
    }

    public Ticket getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found"));
        if (ticket.getEvent().getUserId() != 0) {
            try {
                System.out.println("Fetching user for ticketId: " + ticket.getTicketId() + ", eventId: " + ticket.getEvent().getEventId() + ", userId: " + ticket.getEvent().getUserId());
                ticket.getEvent().setUser(userRestClient.findUserById(ticket.getEvent().getUserId()));
                System.out.println("User fetched for ticketId: " + ticket.getTicketId() + ": " + (ticket.getEvent().getUser() != null ? ticket.getEvent().getUser().getEmail() : "null"));
            } catch (Exception e) {
                System.out.println("Error fetching user for ticketId: " + ticket.getTicketId() + ": " + e.getMessage());
                ticket.getEvent().setUser(null);
            }
        }
        return ticket;
    }

    public Ticket updateTicket(Long id, Ticket updatedTicket) {
        Ticket existingTicket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        existingTicket.setDiscount(updatedTicket.getDiscount());
        existingTicket.setDateAchat(updatedTicket.getDateAchat());
        return ticketRepository.save(existingTicket);
    }

    public void deleteTicket(Long id) {
        ticketRepository.deleteById(id);
    }

    public List<Ticket> getTicketsByEventId(Long eventId) {
        List<Ticket> tickets = ticketRepository.findByEventEventId(eventId);
        tickets.forEach(ticket -> {
            if (ticket.getEvent().getUserId() != 0) {
                try {
                    System.out.println("Fetching user for ticketId: " + ticket.getTicketId() + ", eventId: " + ticket.getEvent().getEventId() + ", userId: " + ticket.getEvent().getUserId());
                    ticket.getEvent().setUser(userRestClient.findUserById(ticket.getEvent().getUserId()));
                    System.out.println("User fetched for ticketId: " + ticket.getTicketId() + ": " + (ticket.getEvent().getUser() != null ? ticket.getEvent().getUser().getEmail() : "null"));
                } catch (Exception e) {
                    System.out.println("Error fetching user for ticketId: " + ticket.getTicketId() + ": " + e.getMessage());
                    ticket.getEvent().setUser(null);
                }
            }
        });
        return tickets;
    }

    public List<Ticket> getTicketsByEvent(Long eventId) {
        return ticketRepository.findByEventEventId(eventId);
    }
}