package com.unihelp.user.controllers;

import com.unihelp.user.dto.MessageDTO;
import com.unihelp.user.services.FriendshipService;
import com.unihelp.user.services.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final FriendshipService friendshipService;
    
    /**
     * Send a message to another user
     */
    @PostMapping("/send/{recipientId}")
    public ResponseEntity<MessageDTO> sendMessage(
            @PathVariable Long recipientId,
            @RequestBody Map<String, String> payload) {
        
        Long currentUserId = getCurrentUserId();
        String content = payload.get("content");
        
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        MessageDTO message = messageService.sendMessage(currentUserId, recipientId, content);
        return ResponseEntity.ok(message);
    }
    
    /**
     * Get conversation with another user (paginated)
     */
    @GetMapping("/conversation/{userId}")
    public ResponseEntity<Page<MessageDTO>> getConversation(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Long currentUserId = getCurrentUserId();
        Page<MessageDTO> messages = messageService.getConversation(currentUserId, userId, page, size);
        return ResponseEntity.ok(messages);
    }
    
    /**
     * Get simple conversation history (not paginated)
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<MessageDTO>> getMessageHistory(@PathVariable Long userId) {
        Long currentUserId = getCurrentUserId();
        List<MessageDTO> messages = messageService.getMessagesBetweenUsers(currentUserId, userId);
        return ResponseEntity.ok(messages);
    }
    
    /**
     * Get all conversations for the current user
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<MessageDTO>> getConversations() {
        Long currentUserId = getCurrentUserId();
        List<MessageDTO> conversations = messageService.getConversationPreviews(currentUserId);
        return ResponseEntity.ok(conversations);
    }
    
    /**
     * Mark a message as read
     */
    @PutMapping("/{messageId}/read")
    public ResponseEntity<MessageDTO> markAsRead(@PathVariable Long messageId) {
        Long currentUserId = getCurrentUserId();
        MessageDTO message = messageService.markMessageAsRead(messageId, currentUserId);
        return ResponseEntity.ok(message);
    }
    
    /**
     * Mark all messages in a conversation as read
     */
    @PutMapping("/conversation/{userId}/read")
    public ResponseEntity<Void> markConversationAsRead(@PathVariable Long userId) {
        Long currentUserId = getCurrentUserId();
        messageService.markConversationAsRead(currentUserId, userId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Get unread messages count
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Long currentUserId = getCurrentUserId();
        long count = messageService.getUnreadMessagesCount(currentUserId);
        return ResponseEntity.ok(Map.of("count", count));
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
