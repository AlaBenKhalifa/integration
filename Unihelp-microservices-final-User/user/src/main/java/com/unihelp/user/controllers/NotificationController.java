package com.unihelp.user.controllers;

import com.unihelp.user.dto.NotificationDTO;
import com.unihelp.user.services.FriendshipService;
import com.unihelp.user.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final FriendshipService friendshipService;
    
    /**
     * Get all notifications for the current user
     */
    @GetMapping
    public ResponseEntity<List<NotificationDTO>> getNotifications() {
        Long currentUserId = getCurrentUserId();
        List<NotificationDTO> notifications = notificationService.getNotifications(currentUserId);
        return ResponseEntity.ok(notifications);
    }
    
    /**
     * Get paginated notifications for the current user
     */
    @GetMapping("/paginated")
    public ResponseEntity<Page<NotificationDTO>> getNotificationsPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Long currentUserId = getCurrentUserId();
        Page<NotificationDTO> notifications = notificationService.getNotificationsPaginated(currentUserId, page, size);
        return ResponseEntity.ok(notifications);
    }
    
    /**
     * Mark a notification as read
     */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<NotificationDTO> markAsRead(@PathVariable Long notificationId) {
        Long currentUserId = getCurrentUserId();
        NotificationDTO notification = notificationService.markAsRead(notificationId, currentUserId);
        return ResponseEntity.ok(notification);
    }
    
    /**
     * Mark all notifications as read
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        Long currentUserId = getCurrentUserId();
        notificationService.markAllAsRead(currentUserId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Get unread notifications count
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Long currentUserId = getCurrentUserId();
        long count = notificationService.getUnreadCount(currentUserId);
        return ResponseEntity.ok(Map.of("count", count));
    }
    
    /**
     * Delete a notification
     */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long notificationId) {
        Long currentUserId = getCurrentUserId();
        notificationService.deleteNotification(notificationId, currentUserId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Get the current user's ID from the security context
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();
        
        return friendshipService.getUserIdByEmail(userEmail);
    }
}
