package com.unihelp.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private Long userId;
    private String userName;       // Nom de l'utilisateur pour l'affichage
    private String userProfileImage; // Image de profil pour l'affichage dans les notifications
    private String content;
    private String type;
    private Long referenceId;
    private LocalDateTime createdAt;
    private boolean read;
}
