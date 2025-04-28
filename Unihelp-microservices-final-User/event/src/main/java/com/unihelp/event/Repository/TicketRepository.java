package com.unihelp.event.Repository;

import com.unihelp.event.entities.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    //List<Ticket> findByUserId(Long UserId);
    List<Ticket> findByEventEventId(Long eventId);
    void deleteByEventEventId(Long eventId);
}
