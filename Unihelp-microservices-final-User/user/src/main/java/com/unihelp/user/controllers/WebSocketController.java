package com.unihelp.user.controllers;

import com.unihelp.user.dto.MessageDTO;
import com.unihelp.user.dto.NotificationDTO;
import com.unihelp.user.services.MessageService;
import com.unihelp.user.services.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final FriendshipService friendshipService;

    /**
     * Handle sending messages through WebSocket
     * Users send messages to /app/chat.sendMessage
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload Map<String, Object> payload) {
        Long senderId = ((Number) payload.get("senderId")).longValue();
        Long recipientId = ((Number) payload.get("recipientId")).longValue();
        String content = (String) payload.get("content");

        // Verify that the authenticated user is the sender
        Long currentUserId = getCurrentUserId();
        if (!currentUserId.equals(senderId)) {
            // Send error message back to sender
            messagingTemplate.convertAndSendToUser(
                    currentUserId.toString(),
                    "/queue/errors",
                    Map.of("error", "Unauthorized to send messages as another user")
            );
            return;
        }

        // Process and save the message
        MessageDTO message = messageService.sendMessage(senderId, recipientId, content);

        // Send to the specific recipient
        messagingTemplate.convertAndSendToUser(
                recipientId.toString(),
                "/queue/messages",
                message
        );

        // Send confirmation back to sender
        messagingTemplate.convertAndSendToUser(
                senderId.toString(),
                "/queue/messages",
                message
        );
    }

    /**
     * Handle read receipt notifications
     * Users send read receipts to /app/chat.markAsRead
     */
    @MessageMapping("/chat.markAsRead")
    public void markMessageAsRead(@Payload Map<String, Object> payload) {
        Long messageId = ((Number) payload.get("messageId")).longValue();
        Long userId = getCurrentUserId();

        // Mark the message as read
        MessageDTO message = messageService.markMessageAsRead(messageId, userId);

        // Notify the original sender that their message was read
        messagingTemplate.convertAndSendToUser(
                message.getSender().getId().toString(),
                "/queue/read-receipts",
                Map.of("messageId", messageId, "readAt", message.getSentAt())
        );
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
