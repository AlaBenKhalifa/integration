package com.unihelp.user.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "user_activity")
public class UserActivity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonBackReference
    private User user;
    
    @Column(nullable = false)
    private String activityType; // LOGIN, LOGOUT, etc.
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    @Column(nullable = false)
    private String ipAddress;
    
    @Column(nullable = false)
    private String deviceType; // Mobile, Desktop, Tablet
    
    @Column(nullable = false)
    private String browserName;
    
    @Column(nullable = false)
    private String osName;
    
    private String screenResolution;
    
    private String timezone;
    
    private String language;
    
    @Column(nullable = false)
    private String visitorId;
    
    // Additional fields for tracking
    private String userAgent;
    
    private String referrer;
    
    // Geolocation data (if available)
    private String country;
    
    private String city;
    
    // Session related data
    private String sessionId;
    
    // Flags
    @Builder.Default
    private boolean successful = true;
    
    // Failure reason (if activity failed)
    private String failureReason;
}
