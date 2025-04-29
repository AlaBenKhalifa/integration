package com.unihelp.user.services;

import com.unihelp.user.dto.MessageDTO;
import com.unihelp.user.dto.UserDTO;
import com.unihelp.user.entities.Message;
import com.unihelp.user.entities.User;
import com.unihelp.user.repositories.MessageRepository;
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
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final FriendshipService friendshipService;

    /**
     * Send a message from one user to another
     */
    @Transactional
    public MessageDTO sendMessage(Long senderId, Long recipientId, String content) {
        // Validate input
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }

        // Cannot send message to self
        if (senderId.equals(recipientId)) {
            throw new IllegalArgumentException("Cannot send message to yourself");
        }

        // Check if users exist
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new RuntimeException("Recipient not found"));

        // Check if users are friends or if they have any previous communication
        boolean areFriends = friendshipService.areFriends(senderId, recipientId);
        boolean havePreviousMessages = !messageRepository.findMessagesBetweenUsers(senderId, recipientId).isEmpty();

        // Only friends or users with previous communication can message each other
        if (!areFriends && !havePreviousMessages) {
            throw new IllegalStateException("Cannot send message to a non-friend with no previous communication");
        }

        // Create and save the message
        Message message = Message.builder()
                .sender(sender)
                .recipient(recipient)
                .content(content)
                .sentAt(LocalDateTime.now())
                .read(false)
                .build();

        Message savedMessage = messageRepository.save(message);

        // Create notification for recipient
        notificationService.createNotification(
                recipientId,
                "New message from " + sender.getFirstName() + " " + sender.getLastName(),
                "MESSAGE",
                savedMessage.getId()
        );

        return mapToDTO(savedMessage);
    }

    /**
     * Get conversation between two users (paginated)
     */
    @Transactional
    public Page<MessageDTO> getConversation(Long userId1, Long userId2, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("sentAt").descending());
        Page<Message> messages = messageRepository.findConversation(userId1, userId2, pageable);

        // Mark messages as read if the current user is the recipient
        messages.getContent().stream()
                .filter(m -> m.getRecipient().getId().equals(userId1) && !m.isRead())
                .forEach(m -> {
                    m.setRead(true);
                    messageRepository.save(m);
                });

        return messages.map(this::mapToDTO);
    }

    /**
     * Get all conversations for a user (preview of latest message for each conversation)
     */
    public List<MessageDTO> getConversationPreviews(Long userId) {
        List<Message> latestMessages = messageRepository.findLatestMessagesForUser(userId);
        return latestMessages.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Mark a message as read
     */
    @Transactional
    public MessageDTO markMessageAsRead(Long messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify that the user is the recipient
        if (!message.getRecipient().getId().equals(userId)) {
            throw new IllegalStateException("Only the recipient can mark a message as read");
        }

        // Mark as read
        message.setRead(true);
        Message updatedMessage = messageRepository.save(message);

        return mapToDTO(updatedMessage);
    }

    /**
     * Mark all messages in a conversation as read
     */
    @Transactional
    public void markConversationAsRead(Long userId, Long otherUserId) {
        List<Message> unreadMessages = messageRepository.findBySenderIdAndRecipientIdAndReadFalse(otherUserId, userId);

        unreadMessages.forEach(message -> {
            message.setRead(true);
            messageRepository.save(message);
        });
    }

    /**
     * Get unread messages count for a user
     */
    public long getUnreadMessagesCount(Long userId) {
        return messageRepository.countByRecipientIdAndReadFalse(userId);
    }

    /**
     * Get conversation with specific user
     */
    public List<MessageDTO> getMessagesBetweenUsers(Long userId1, Long userId2) {
        List<Message> messages = messageRepository.findMessagesBetweenUsers(userId1, userId2);
        return messages.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Map message entity to DTO
     */
    private MessageDTO mapToDTO(Message message) {
        return MessageDTO.builder()
                .id(message.getId())
                .sender(mapUserToDTO(message.getSender()))
                .recipient(mapUserToDTO(message.getRecipient()))
                .content(message.getContent())
                .sentAt(message.getSentAt())
                .read(message.isRead())
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
                .build(); // Only include necessary fields for message display
    }
}
