package com.unihelp.user.dto;

import com.unihelp.user.entities.UserActivity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserActivityDto {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userRole;
    private String activityType;
    private LocalDateTime timestamp;
    private String ipAddress;
    private String deviceType;
    private String browserName;
    private String osName;
    private String screenResolution;
    private String timezone;
    private String language;
    private String visitorId;
    private String userAgent;
    private String referrer;
    private String country;
    private String city;
    private String sessionId;
    private boolean successful;
    private String failureReason;

    public static UserActivityDto fromEntity(UserActivity entity) {
        return UserActivityDto.builder()
                .id(entity.getId())
                .userId(entity.getUser() != null ? entity.getUser().getId() : null)
                .userName(entity.getUser() != null ? entity.getUser().getFirstName() + " " + entity.getUser().getLastName() : null)
                .userEmail(entity.getUser() != null ? entity.getUser().getEmail() : null)
                .userRole(entity.getUser() != null ? entity.getUser().getRole().name() : null)
                .activityType(entity.getActivityType())
                .timestamp(entity.getTimestamp())
                .ipAddress(entity.getIpAddress())
                .deviceType(entity.getDeviceType())
                .browserName(entity.getBrowserName())
                .osName(entity.getOsName())
                .screenResolution(entity.getScreenResolution())
                .timezone(entity.getTimezone())
                .language(entity.getLanguage())
                .visitorId(entity.getVisitorId())
                .userAgent(entity.getUserAgent())
                .referrer(entity.getReferrer())
                .country(entity.getCountry())
                .city(entity.getCity())
                .sessionId(entity.getSessionId())
                .successful(entity.isSuccessful())
                .failureReason(entity.getFailureReason())
                .build();
    }
}
