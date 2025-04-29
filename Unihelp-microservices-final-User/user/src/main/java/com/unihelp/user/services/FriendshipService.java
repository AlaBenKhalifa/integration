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
            } else if (status == FriendshipStatus.REMOVED) {
                // Si l'amitié avait été supprimée, permettre une nouvelle demande en réinitialisant le statut
                Friendship friendship = existingFriendship.get();
                friendship.setStatus(FriendshipStatus.PENDING);
                friendship.setRequestDate(LocalDateTime.now());
                friendship.setAcceptedDate(null);
                Friendship savedFriendship = friendshipRepository.save(friendship);

                // Créer une notification pour le destinataire
                notificationService.createNotification(
                        recipientId,
                        requester.getFirstName() + " " + requester.getLastName() + " sent you a friend request",
                        "FRIEND_REQUEST",
                        savedFriendship.getId()
                );

                return mapToDTO(savedFriendship);
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
            } else if (status == FriendshipStatus.ACCEPTED) {
                throw new IllegalStateException("Users are already friends");
            } else if (status == FriendshipStatus.BLOCKED) {
                throw new IllegalStateException("Cannot send friend request to this user");
            } else if (status == FriendshipStatus.REMOVED) {
                // Si l'amitié avait été supprimée dans le sens inverse, permettre une nouvelle demande en réinitialisant le statut
                Friendship friendship = reverseFriendship.get();
                friendship.setStatus(FriendshipStatus.ACCEPTED); // Auto-accepter dans ce cas puisque c'est un renouvellement
                friendship.setAcceptedDate(LocalDateTime.now());
                Friendship savedFriendship = friendshipRepository.save(friendship);

                // Créer une notification pour l'autre utilisateur
                notificationService.createNotification(
                        recipientId,
                        requester.getFirstName() + " " + requester.getLastName() + " is now your friend again",
                        "FRIEND_ACCEPT",
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

        // Verify that the user is part of the friendship (requester or recipient)
        boolean isRequester = friendship.getRequester() != null && friendship.getRequester().getId().equals(userId);
        boolean isRecipient = friendship.getRecipient() != null && friendship.getRecipient().getId().equals(userId);

        if (!isRequester && !isRecipient) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "You are not authorized to remove this friendship"
            );
        }

        // Only allow removal if the friendship is ACCEPTED
        if (friendship.getStatus() != FriendshipStatus.ACCEPTED) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Friendship must be accepted before removing"
            );
        }

        // Instead of deleting, set the status to REMOVED
        friendship.setStatus(FriendshipStatus.REMOVED);
        friendship.setAcceptedDate(null); // Clear accepted date optionally
        friendshipRepository.save(friendship);

        System.out.println("SUCCESS - User " + userId + " removed friendship with ID: " + friendshipId);
    }
    /**
     * Get all friends of a user with their friendship IDs
     */
    public List<UserDTO> getFriends(Long userId) {
        // Get all friendships where the user is either requester or recipient and the status is ACCEPTED
        // Les amitiés avec statut REMOVED sont automatiquement exclues
        List<Friendship> friendships = friendshipRepository.findFriendshipsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED);

        // Log for debugging
        System.out.println("Found " + friendships.size() + " friendships for user " + userId);

        // Map each friendship to a UserDTO, including the friendshipId
        return friendships.stream()
                .map(friendship -> {
                    // Determine which user in the friendship is the friend (not the current user)
                    User friend = friendship.getRequester().getId().equals(userId) ?
                            friendship.getRecipient() : friendship.getRequester();

                    // Map to DTO including the friendshipId
                    UserDTO dto = mapUserToDTO(friend);
                    dto.setFriendshipId(friendship.getId()); // Set the friendship ID

                    // Log for debugging
                    System.out.println("Mapped friend: " + friend.getFirstName() + " " + friend.getLastName() +
                            " with friendshipId: " + friendship.getId());

                    return dto;
                })
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
        // Tous les utilisateurs avec matching de skills
        List<User> potentialFriends = skillMatchingService.findUsersWithMatchingSkills(userId);

        // Chercher les amis existants
        List<Friendship> existingFriendships = friendshipRepository.findFriendshipsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED);

        // Ajoute aussi les statuts PENDING et REMOVED pour éviter de reproposer immédiatement
        List<Friendship> pendingFriendships = friendshipRepository.findFriendshipsByUserIdAndStatus(userId, FriendshipStatus.PENDING);
        List<Friendship> removedFriendships = friendshipRepository.findFriendshipsByUserIdAndStatus(userId, FriendshipStatus.REMOVED);

        List<Long> alreadyConnectedIds = existingFriendships.stream()
                .map(f -> f.getRequester().getId().equals(userId) ? f.getRecipient().getId() : f.getRequester().getId())
                .collect(Collectors.toList());

        alreadyConnectedIds.addAll(pendingFriendships.stream()
                .map(f -> f.getRequester().getId().equals(userId) ? f.getRecipient().getId() : f.getRequester().getId())
                .collect(Collectors.toList()));

        alreadyConnectedIds.addAll(removedFriendships.stream()
                .map(f -> f.getRequester().getId().equals(userId) ? f.getRecipient().getId() : f.getRequester().getId())
                .collect(Collectors.toList()));

        // Ne suggérer que ceux qui ne sont pas connectés
        return potentialFriends.stream()
                .filter(u -> !alreadyConnectedIds.contains(u.getId()))
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

        UserDTO.UserDTOBuilder builder = UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .bio(user.getBio())
                .skills(user.getSkills())
                .role(user.getRole().name());

        // Convert profile image if available
        if (user.getProfileImage() != null && user.getProfileImage().length > 0) {
            builder.profileImage(java.util.Base64.getEncoder().encodeToString(user.getProfileImage()));
        }

        return builder.build();
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
