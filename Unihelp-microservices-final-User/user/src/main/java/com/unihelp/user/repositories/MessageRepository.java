package com.unihelp.user.repositories;

import com.unihelp.user.entities.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    // Get conversation between two users (paginated)
    @Query("SELECT m FROM Message m WHERE " +
            "(m.sender.id = ?1 AND m.recipient.id = ?2) OR " +
            "(m.sender.id = ?2 AND m.recipient.id = ?1) " +
            "ORDER BY m.sentAt DESC")
    Page<Message> findConversation(Long userId1, Long userId2, Pageable pageable);

    // Get latest message for each conversation involving a user
    @Query(value = "SELECT * FROM messages m1 WHERE m1.id = (" +
            "SELECT m2.id FROM messages m2 WHERE " +
            "((m2.sender_id = ?1 AND m2.recipient_id = m1.sender_id) OR " +
            "(m2.sender_id = m1.sender_id AND m2.recipient_id = ?1)) " +
            "ORDER BY m2.sent_at DESC LIMIT 1) " +
            "AND (m1.sender_id = ?1 OR m1.recipient_id = ?1)",
            nativeQuery = true)
    List<Message> findLatestMessagesForUser(Long userId);

    // Get unread messages count for a user
    long countByRecipientIdAndReadFalse(Long recipientId);

    // Get unread messages from a specific sender
    List<Message> findBySenderIdAndRecipientIdAndReadFalse(Long senderId, Long recipientId);

    // Get conversation with user (simplified, non-paginated)
    @Query("SELECT m FROM Message m WHERE " +
            "(m.sender.id = ?1 AND m.recipient.id = ?2) OR " +
            "(m.sender.id = ?2 AND m.recipient.id = ?1) " +
            "ORDER BY m.sentAt ASC")
    List<Message> findMessagesBetweenUsers(Long userId1, Long userId2);
}
