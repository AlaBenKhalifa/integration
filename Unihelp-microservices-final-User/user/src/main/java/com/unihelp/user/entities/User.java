package com.unihelp.user.entities;

import jakarta.persistence.*;
import jakarta.persistence.CascadeType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class User implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;
    
    @Column(name = "google_id")
    private String googleId;
    
    @Builder.Default
    private boolean profileCompleted = false;

    @Column(length = 1000)
    private String bio;

    @Column(length = 500)
    private String skills;

    @Lob
    @Column(name = "profile_image", columnDefinition = "LONGBLOB")
    private byte[] profileImage;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserRole role = UserRole.STUDENT;

    @Builder.Default
    private boolean isActive = true;

    @Builder.Default
    private boolean isBanned = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<UserActivity> activities = new ArrayList<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<Token> tokens = new ArrayList<>();
    
    // NLP analysis results
    @ElementCollection
    @CollectionTable(name = "user_extracted_skills", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "skill")
    @Builder.Default
    private List<String> extractedSkills = new ArrayList<>();
    
    @ElementCollection
    @CollectionTable(name = "user_extracted_interests", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "interest")
    @Builder.Default
    private List<String> extractedInterests = new ArrayList<>();
    
    @ElementCollection
    @CollectionTable(name = "user_personality_traits", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "trait")
    @Column(name = "score")
    @Builder.Default
    private Map<String, Double> personalityTraits = new HashMap<>();
    
    private String dominantTrait;
    
    // Friendship relationships
    @OneToMany(mappedBy = "requester", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Friendship> sentFriendRequests = new HashSet<>();
    
    @OneToMany(mappedBy = "recipient", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Friendship> receivedFriendRequests = new HashSet<>();
    
    // Message relationships
    @OneToMany(mappedBy = "sender", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Message> sentMessages = new HashSet<>();
    
    @OneToMany(mappedBy = "recipient", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private Set<Message> receivedMessages = new HashSet<>();
    
    // Notification relationship
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    private Set<Notification> notifications = new HashSet<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !isBanned;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
