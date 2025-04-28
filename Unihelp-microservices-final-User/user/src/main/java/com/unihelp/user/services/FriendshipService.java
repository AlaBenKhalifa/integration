package com.unihelp.user.services;

import com.unihelp.user.dto.FriendshipDTO;
import com.unihelp.user.dto.UserDTO;
import com.unihelp.user.entities.Friendship;
import com.unihelp.user.entities.FriendshipStatus;
import com.unihelp.user.entities.User;
import com.unihelp.user.repositories.FriendshipRepository;
import com.unihelp.user.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SkillMatchingService skillMatchingService;
    
    /**
     * Send a friend request from one user to another
     */
    public FriendshipDTO sendFriendRequest(Long requesterId, Long recipientId) {
        // Cannot send friend request to self
        if (requesterId.equals(recipientId)) {
            throw new IllegalArgumentException("Cannot send friend request to yourself");
        }
        
        // Check if users exist
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Requester not found"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new RuntimeException("Recipient not found"));
                
        // Check if friendship already exists
        Optional<Friendship> existingFriendship = friendshipRepository.findByRequesterIdAndRecipientId(requesterId, recipientId);
        if (existingFriendship.isPresent()) {
            FriendshipStatus status = existingFriendship.get().getStatus();
            if (status == FriendshipStatus.PENDING) {
                throw new IllegalStateException("Friend request already pending");
            } else if (status == FriendshipStatus.ACCEPTED) {
                throw new IllegalStateException("Users are already friends");
            } else if (status == FriendshipStatus.BLOCKED) {
                throw new IllegalStateException("Cannot send friend request to this user");
            }
            // If DECLINED, allow sending a new request
        }
        
        // Check for reverse friendship (if recipient already sent a request)
        Optional<Friendship> reverseFriendship = friendshipRepository.findByRequesterIdAndRecipientId(recipientId, requesterId);
        if (reverseFriendship.isPresent()) {
            FriendshipStatus status = reverseFriendship.get().getStatus();
            if (status == FriendshipStatus.PENDING) {
                // Auto-accept the pending request
                Friendship friendship = reverseFriendship.get();
                friendship.setStatus(FriendshipStatus.ACCEPTED);
                friendship.setAcceptedDate(LocalDateTime.now());
                Friendship savedFriendship = friendshipRepository.save(friendship);
                
                // Create notification for original requester that their request was accepted
                notificationService.createNotification(
                    recipientId, 
                    "Friend request accepted by " + requester.getFirstName() + " " + requester.getLastName(),
                    "FRIEND_REQUEST_ACCEPTED", 
                    savedFriendship.getId()
                );
                
                return mapToDTO(savedFriendship);
            }
        }
        
        // Create a new friendship
        Friendship friendship = Friendship.builder()
                .requester(requester)
                .recipient(recipient)
                .status(FriendshipStatus.PENDING)
                .requestDate(LocalDateTime.now())
                .build();
        
        Friendship savedFriendship = friendshipRepository.save(friendship);
        
        // Create notification for recipient
        notificationService.createNotification(
            recipientId, 
            requester.getFirstName() + " " + requester.getLastName() + " sent you a friend request",
            "FRIEND_REQUEST", 
            savedFriendship.getId()
        );
        
        return mapToDTO(savedFriendship);
    }
    
    /**
     * Accept a friend request
     */
    public FriendshipDTO acceptFriendRequest(Long friendshipId, Long userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friendship not found"));
        
        // Verify that the user is the recipient of the request
        if (!friendship.getRecipient().getId().equals(userId)) {
            throw new IllegalStateException("Only the recipient can accept a friend request");
        }
        
        // Verify that the status is PENDING
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Friend request is not pending");
        }
        
        // Accept the request
        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendship.setAcceptedDate(LocalDateTime.now());
        Friendship savedFriendship = friendshipRepository.save(friendship);
        
        // Create notification for requester
        notificationService.createNotification(
            friendship.getRequester().getId(), 
            friendship.getRecipient().getFirstName() + " " + friendship.getRecipient().getLastName() + " accepted your friend request",
            "FRIEND_REQUEST_ACCEPTED", 
            savedFriendship.getId()
        );
        
        return mapToDTO(savedFriendship);
    }
    
    /**
     * Decline a friend request
     */
    public FriendshipDTO declineFriendRequest(Long friendshipId, Long userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friendship not found"));
        
        // Verify that the user is the recipient of the request
        if (!friendship.getRecipient().getId().equals(userId)) {
            throw new IllegalStateException("Only the recipient can decline a friend request");
        }
        
        // Verify that the status is PENDING
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Friend request is not pending");
        }
        
        // Decline the request
        friendship.setStatus(FriendshipStatus.DECLINED);
        Friendship savedFriendship = friendshipRepository.save(friendship);
        
        return mapToDTO(savedFriendship);
    }
    
    /**
     * Cancel a friend request
     */
    public void cancelFriendRequest(Long friendshipId, Long userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friendship not found"));
        
        // Verify that the user is the requester of the request
        if (!friendship.getRequester().getId().equals(userId)) {
            throw new IllegalStateException("Only the requester can cancel a friend request");
        }
        
        // Verify that the status is PENDING
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Friend request is not pending");
        }
        
        // Delete the request
        friendshipRepository.delete(friendship);
    }
    
    /**
     * Remove a friend
     */
    public void removeFriend(Long friendshipId, Long userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friendship not found"));
        
        // Verify that the user is part of the friendship
        if (!friendship.getRequester().getId().equals(userId) && !friendship.getRecipient().getId().equals(userId)) {
            throw new IllegalStateException("User is not part of this friendship");
        }
        
        // Verify that the status is ACCEPTED
        if (friendship.getStatus() != FriendshipStatus.ACCEPTED) {
            throw new IllegalStateException("Users are not friends");
        }
        
        // Delete the friendship
        friendshipRepository.delete(friendship);
    }
    
    /**
     * Get all friends of a user
     */
    public List<UserDTO> getFriends(Long userId) {
        List<User> friends = friendshipRepository.findAllFriendsOfUser(userId);
        return friends.stream()
                .map(this::mapUserToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all pending friend requests sent to a user
     */
    public List<FriendshipDTO> getPendingFriendRequests(Long userId) {
        List<Friendship> pendingRequests = friendshipRepository.findByRecipientIdAndStatus(userId, FriendshipStatus.PENDING);
        return pendingRequests.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all pending friend requests sent by a user
     */
    public List<FriendshipDTO> getSentFriendRequests(Long userId) {
        List<Friendship> sentRequests = friendshipRepository.findByRequesterIdAndStatus(userId, FriendshipStatus.PENDING);
        return sentRequests.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Check if users are friends
     */
    public boolean areFriends(Long userId1, Long userId2) {
        List<Friendship> friendships = friendshipRepository.findFriendshipsBetweenUsers(userId1, userId2);
        return friendships.stream()
                .anyMatch(f -> f.getStatus() == FriendshipStatus.ACCEPTED);
    }
    
    /**
     * Get friendship status between users
     */
    public String getFriendshipStatus(Long userId1, Long userId2) {
        List<Friendship> friendships = friendshipRepository.findFriendshipsBetweenUsers(userId1, userId2);
        
        if (friendships.isEmpty()) {
            return "NOT_FRIENDS";
        }
        
        // Return the status of the most recent friendship
        return friendships.stream()
                .sorted((f1, f2) -> f2.getRequestDate().compareTo(f1.getRequestDate()))
                .findFirst()
                .map(f -> f.getStatus().toString())
                .orElse("NOT_FRIENDS");
    }
    
    /**
     * Get friend suggestions based on skills
     */
    public List<UserDTO> getFriendSuggestions(Long userId) {
        return skillMatchingService.findUsersWithMatchingSkills(userId).stream()
                .map(this::mapUserToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Map friendship entity to DTO
     */
    private FriendshipDTO mapToDTO(Friendship friendship) {
        return FriendshipDTO.builder()
                .id(friendship.getId())
                .requester(mapUserToDTO(friendship.getRequester()))
                .recipient(mapUserToDTO(friendship.getRecipient()))
                .requestDate(friendship.getRequestDate())
                .acceptedDate(friendship.getAcceptedDate())
                .status(friendship.getStatus())
                .build();
    }
    
    /**
     * Map user entity to DTO
     */
    private UserDTO mapUserToDTO(User user) {
        if (user == null) return null;
        
        return UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .bio(user.getBio())
                .skills(user.getSkills())
                .role(user.getRole().name())
                .build();
    }
    
    /**
     * Get a user's ID by their email address
     */
    public Long getUserIdByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        return user.getId();
    }
}
