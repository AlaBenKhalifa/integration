package com.unihelp.event.services;

import com.unihelp.event.Repository.EventRepository;
import com.unihelp.event.clients.UserRestClient;
import com.unihelp.event.entities.Event;
import com.unihelp.event.entities.Ticket;
import com.unihelp.event.model.Role;
import com.unihelp.event.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {
    private final EventRepository eventRepository;
    private final TicketService ticketService;
    private final UserRestClient userRestClient;
    private final JavaMailSender mailSender;

    public Event createEvent(Event event) {
        System.out.println("CREATE EVENT CALLED");

        if (event.getUserId() == null) {
            throw new IllegalArgumentException("User ID is required to create an event");
        }
        User instructor = userRestClient.findUserById(event.getUserId());
        System.out.println("Fetched user: " + instructor.getEmail() + " with role: " + instructor.getRole());
        if (instructor == null) {
            throw new IllegalArgumentException("User not found with ID: " + event.getUserId());
        }
        if (instructor.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only instructors with the role 'MENTOR' can create event");
        }
        event.setUser(instructor);
        return eventRepository.save(event);
    }

    public List<Event> getAllEvents() {
        List<Event> events = eventRepository.findAll();
        events.forEach(event -> {
            if (event.getUserId() != 0) { // Assuming 0 means no user
                try {
                    event.setUser(userRestClient.findUserById(event.getUserId()));
                } catch (Exception e) {
                    event.setUser(null); // Fallback in case of error
                }
            }
        });
        return events;
    }

    public Event getEventById(Long id) {
        Event event = eventRepository.findById(id).orElseThrow(() -> new RuntimeException("Event not found"));
        // Populate user field
        if (event.getUserId() != 0) {
            try {
                event.setUser(userRestClient.findUserById(event.getUserId()));
            } catch (Exception e) {
                event.setUser(null);
            }
        }
        return event;
    }

    public Event updateEvent(Long id, Event updatedEvent) throws MessagingException {
        Event existingEvent = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Update event fields
        existingEvent.setTitre(updatedEvent.getTitre());
        existingEvent.setDate(updatedEvent.getDate());
        existingEvent.setDescription(updatedEvent.getDescription());
        existingEvent.setLieu(updatedEvent.getLieu());
        existingEvent.setUserId(updatedEvent.getUserId());

        // Save the updated event
        Event savedEvent = eventRepository.save(existingEvent);

        // Fetch all tickets for this event
        List<Ticket> tickets = ticketService.getTicketsByEventId(id);
        if (!tickets.isEmpty()) {
            // Send email to each student who booked the event
            for (Ticket ticket : tickets) {
                Long studentId = ticket.getUserId();
                User student = userRestClient.findUserById(studentId);
                if (student != null && student.getEmail() != null && !student.getEmail().equals("<EMAIL>")) {
                    sendEventUpdateEmail(student.getEmail(), savedEvent);
                }
            }
        }

        return savedEvent;
    }

    public void deleteEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        if (!event.getTickets().isEmpty()) {
            throw new IllegalStateException("Cannot delete event with booked tickets");
        }
        eventRepository.delete(event); // orphanRemoval will handle ticket deletion if allowed
    }

    public List<Ticket> getTicketsByEventId(Long eventId) {
        return ticketService.getTicketsByEventId(eventId);
    }

    private void sendEventUpdateEmail(String studentEmail, Event event) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        helper.setTo(studentEmail);
        helper.setSubject("Event Update Notification: " + event.getTitre());
        helper.setText(
                "<h3>Event Updated</h3>" +
                        "<p>Dear Student,</p>" +
                        "<p>The event <strong>" + event.getTitre() + "</strong> you booked has been updated by the admin.</p>" +
                        "<p><strong>Details:</strong></p>" +
                        "<ul>" +
                        "<li><strong>Title:</strong> " + event.getTitre() + "</li>" +
                        "<li><strong>Description:</strong> " + event.getDescription() + "</li>" +
                        "<li><strong>Date:</strong> " + event.getDate() + "</li>" +
                        "<li><strong>Location:</strong> " + event.getLieu() + "</li>" +
                        "</ul>" +
                        "<p>Please contact us if you have any questions.</p>" +
                        "<p>Best regards,<br>UniHelp Team</p>",
                true // Enable HTML content
        );

        mailSender.send(message);
    }
}