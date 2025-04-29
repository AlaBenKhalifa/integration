package com.unihelp.user.services;

import com.unihelp.user.dto.NotificationDTO;
import com.unihelp.user.entities.Notification;
import com.unihelp.user.entities.User;
import com.unihelp.user.repositories.NotificationRepository;
import com.unihelp.user.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Create a notification for a user
     */
    @Transactional
    public NotificationDTO createNotification(Long userId, String content, String type, Long referenceId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification = Notification.builder()
                .user(user)
                .content(content)
                .type(type)
                .referenceId(referenceId)
                .createdAt(LocalDateTime.now())
                .read(false)
                .build();

        Notification savedNotification = notificationRepository.save(notification);

        return mapToDTO(savedNotification);
    }

    /**
     * Get all notifications for a user
     */
    public List<NotificationDTO> getNotifications(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return notifications.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get paginated notifications for a user
     */
    public Page<NotificationDTO> getNotificationsPaginated(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return notifications.map(this::mapToDTO);
    }

    /**
     * Mark a notification as read
     */
    @Transactional
    public NotificationDTO markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        // Verify that the notification belongs to the user
        if (!notification.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Notification does not belong to the user");
        }

        notification.setRead(true);
        Notification updatedNotification = notificationRepository.save(notification);

        return mapToDTO(updatedNotification);
    }

    /**
     * Mark all notifications as read for a user
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unreadNotifications = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);

        unreadNotifications.forEach(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    /**
     * Get unread notifications count
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    /**
     * Delete a notification
     */
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        // Verify that the notification belongs to the user
        if (!notification.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Notification does not belong to the user");
        }

        notificationRepository.delete(notification);
    }

    /**
     * Map notification entity to DTO with user information for display
     */
    private NotificationDTO mapToDTO(Notification notification) {
        User user = notification.getUser();
        String userName = null;
        String userProfileImage = null;

        // Get user information if available
        if (user != null) {
            // Build user full name
            if (user.getFirstName() != null || user.getLastName() != null) {
                userName = (user.getFirstName() != null ? user.getFirstName() : "") + " " +
                        (user.getLastName() != null ? user.getLastName() : "");
                userName = userName.trim(); // Trim any extra spaces
            }

            // Convert profile image if available
            if (user.getProfileImage() != null && user.getProfileImage().length > 0) {
                userProfileImage = java.util.Base64.getEncoder().encodeToString(user.getProfileImage());
            }
        }

        return NotificationDTO.builder()
                .id(notification.getId())
                .userId(notification.getUser().getId())
                .userName(userName)
                .userProfileImage(userProfileImage)
                .content(notification.getContent())
                .type(notification.getType())
                .referenceId(notification.getReferenceId())
                .createdAt(notification.getCreatedAt())
                .read(notification.isRead())
                .build();
    }
}
