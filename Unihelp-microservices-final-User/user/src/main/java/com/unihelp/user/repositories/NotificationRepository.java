package com.unihelp.user.repositories;

import com.unihelp.user.entities.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    // Find all notifications for a user
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    // Find paginated notifications
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    // Count unread notifications
    long countByUserIdAndReadFalse(Long userId);
    
    // Find unread notifications
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);
    
    // Find notifications by type
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, String type);
}
