package com.unihelp.user.controllers;

import com.unihelp.user.dto.FriendshipDTO;
import com.unihelp.user.dto.UserDTO;
import com.unihelp.user.services.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friendships")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;
    
    /**
     * Send a friend request
     */
    @PostMapping("/request/{recipientId}")
    public ResponseEntity<FriendshipDTO> sendFriendRequest(@PathVariable Long recipientId) {
        Long currentUserId = getCurrentUserId();
        FriendshipDTO friendship = friendshipService.sendFriendRequest(currentUserId, recipientId);
        return ResponseEntity.ok(friendship);
    }
    
    /**
     * Accept a friend request
     */
    @PutMapping("/{friendshipId}/accept")
    public ResponseEntity<FriendshipDTO> acceptFriendRequest(@PathVariable Long friendshipId) {
        Long currentUserId = getCurrentUserId();
        FriendshipDTO friendship = friendshipService.acceptFriendRequest(friendshipId, currentUserId);
        return ResponseEntity.ok(friendship);
    }
    
    /**
     * Decline a friend request
     */
    @PutMapping("/{friendshipId}/decline")
    public ResponseEntity<FriendshipDTO> declineFriendRequest(@PathVariable Long friendshipId) {
        Long currentUserId = getCurrentUserId();
        FriendshipDTO friendship = friendshipService.declineFriendRequest(friendshipId, currentUserId);
        return ResponseEntity.ok(friendship);
    }
    
    /**
     * Cancel a friend request
     */
    @DeleteMapping("/{friendshipId}/cancel")
    public ResponseEntity<Void> cancelFriendRequest(@PathVariable Long friendshipId) {
        Long currentUserId = getCurrentUserId();
        friendshipService.cancelFriendRequest(friendshipId, currentUserId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Remove a friend
     */
    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<Void> removeFriend(@PathVariable Long friendshipId) {
        Long currentUserId = getCurrentUserId();
        friendshipService.removeFriend(friendshipId, currentUserId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Get all friends
     */
    @GetMapping("/friends")
    public ResponseEntity<List<UserDTO>> getFriends() {
        Long currentUserId = getCurrentUserId();
        List<UserDTO> friends = friendshipService.getFriends(currentUserId);
        return ResponseEntity.ok(friends);
    }
    
    /**
     * Get pending friend requests (received)
     */
    @GetMapping("/pending")
    public ResponseEntity<List<FriendshipDTO>> getPendingFriendRequests() {
        Long currentUserId = getCurrentUserId();
        List<FriendshipDTO> pendingRequests = friendshipService.getPendingFriendRequests(currentUserId);
        return ResponseEntity.ok(pendingRequests);
    }
    
    /**
     * Get sent friend requests
     */
    @GetMapping("/sent")
    public ResponseEntity<List<FriendshipDTO>> getSentFriendRequests() {
        Long currentUserId = getCurrentUserId();
        List<FriendshipDTO> sentRequests = friendshipService.getSentFriendRequests(currentUserId);
        return ResponseEntity.ok(sentRequests);
    }
    
    /**
     * Check if users are friends
     */
    @GetMapping("/status/{userId}")
    public ResponseEntity<Map<String, String>> getFriendshipStatus(@PathVariable Long userId) {
        Long currentUserId = getCurrentUserId();
        String status = friendshipService.getFriendshipStatus(currentUserId, userId);
        return ResponseEntity.ok(Map.of("status", status));
    }
    
    /**
     * Get friend suggestions based on skills
     */
    @GetMapping("/suggestions")
    public ResponseEntity<List<UserDTO>> getFriendSuggestions() {
        Long currentUserId = getCurrentUserId();
        List<UserDTO> suggestions = friendshipService.getFriendSuggestions(currentUserId);
        return ResponseEntity.ok(suggestions);
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
