package com.unihelp.user.controllers;

import com.unihelp.user.dto.UserDTO;
import com.unihelp.user.entities.User;
import com.unihelp.user.services.FriendshipService;
import com.unihelp.user.services.SkillMatchingService;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/skill-matching")
@RequiredArgsConstructor
public class SkillMatchingController {

    private final SkillMatchingService skillMatchingService;
    private final FriendshipService friendshipService;

    /**
     * Find users with matching skills
     */
    @GetMapping("/matching")
    public ResponseEntity<List<UserDTO>> findUsersWithMatchingSkills() {
        Long currentUserId = getCurrentUserId();
        List<User> matchingUsers = skillMatchingService.findUsersWithMatchingSkills(currentUserId);

        // Convert User entities to UserDTOs
        List<UserDTO> matchingUserDTOs = matchingUsers.stream()
                .map(this::mapUserToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(matchingUserDTOs);
    }

    /**
     * Find users with complementary skills
     */
    @GetMapping("/complementary")
    public ResponseEntity<List<UserDTO>> findUsersWithComplementarySkills() {
        Long currentUserId = getCurrentUserId();
        List<User> complementaryUsers = skillMatchingService.findUsersWithComplementarySkills(currentUserId);

        // Convert User entities to UserDTOs
        List<UserDTO> complementaryUserDTOs = complementaryUsers.stream()
                .map(this::mapUserToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(complementaryUserDTOs);
    }

    /**
     * Find potential mentors
     */
    @GetMapping("/mentors")
    public ResponseEntity<List<UserDTO>> findPotentialMentors() {
        Long currentUserId = getCurrentUserId();
        List<User> potentialMentors = skillMatchingService.findPotentialMentors(currentUserId);

        // Convert User entities to UserDTOs
        List<UserDTO> mentorDTOs = potentialMentors.stream()
                .map(this::mapUserToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(mentorDTOs);
    }

    /**
     * Map User entity to UserDTO
     */
    private UserDTO mapUserToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .bio(user.getBio())
                .skills(user.getSkills())
                .profileImage(user.getProfileImage() != null ? Base64.getEncoder().encodeToString(user.getProfileImage()) : null)
                .build();
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
