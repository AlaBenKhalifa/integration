package com.unihelp.user.repositories;

import com.unihelp.user.entities.Friendship;
import com.unihelp.user.entities.FriendshipStatus;
import com.unihelp.user.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    // Find friendship by IDs of both users
    Optional<Friendship> findByRequesterIdAndRecipientId(Long requesterId, Long recipientId);

    // Find all friendships between two users
    @Query("SELECT f FROM Friendship f WHERE " +
            "(f.requester.id = ?1 AND f.recipient.id = ?2) OR " +
            "(f.requester.id = ?2 AND f.recipient.id = ?1)")
    List<Friendship> findFriendshipsBetweenUsers(Long userId1, Long userId2);

    // Find all friend requests by status
    List<Friendship> findByRequesterIdAndStatus(Long requesterId, FriendshipStatus status);
    List<Friendship> findByRecipientIdAndStatus(Long recipientId, FriendshipStatus status);

    // Find all friendships (for a user)
    @Query("SELECT f FROM Friendship f WHERE " +
            "(f.requester.id = ?1 OR f.recipient.id = ?1) AND " +
            "f.status = 'ACCEPTED'")
    List<Friendship> findAllFriendshipsForUser(Long userId);

    // Find all friends of a user
    @Query("SELECT f.recipient FROM Friendship f WHERE f.requester.id = ?1 AND f.status = 'ACCEPTED'" +
            " UNION " +
            "SELECT f.requester FROM Friendship f WHERE f.recipient.id = ?1 AND f.status = 'ACCEPTED'")
    List<User> findAllFriendsOfUser(Long userId);

    // Count pending friend requests for a user
    long countByRecipientIdAndStatus(Long recipientId, FriendshipStatus status);

    // Find friendships where user is requester OR recipient with a specific status
    @Query("SELECT f FROM Friendship f WHERE "
            + "(f.requester.id = :userId AND f.status = :status) OR "
            + "(f.recipient.id = :userId AND f.status = :status)")
    List<Friendship> findFriendshipsByUserIdAndStatus(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("status") FriendshipStatus status);
}
