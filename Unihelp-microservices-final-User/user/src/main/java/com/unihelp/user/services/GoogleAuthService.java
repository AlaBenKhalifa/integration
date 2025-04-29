package com.unihelp.user.services;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.unihelp.user.entities.User;
import com.unihelp.user.entities.UserRole;
import com.unihelp.user.repositories.UserRepository;
import com.unihelp.user.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    public Map<String, Object> authenticateGoogleUser(String idTokenString) throws GeneralSecurityException, IOException {
        System.out.println("GoogleAuthService: Attempting to verify token");

        if (idTokenString == null || idTokenString.isEmpty()) {
            System.err.println("GoogleAuthService: Received null or empty token");
            throw new IllegalArgumentException("Google ID token cannot be null or empty");
        }

        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new JacksonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            System.out.println("GoogleAuthService: Verifying token with client ID: " + googleClientId);
            GoogleIdToken idToken = verifier.verify(idTokenString);

            if (idToken == null) {
                System.err.println("GoogleAuthService: Token verification failed - null token returned");
                throw new RuntimeException("Invalid Google ID token");
            }

            System.out.println("GoogleAuthService: Token successfully verified");
            Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String firstName = (String) payload.get("given_name");
            String lastName = (String) payload.get("family_name");

            System.out.println("GoogleAuthService: Extracted user info - Email: " + email + ", Google ID: " + googleId);
            Map<String, Object> result = new HashMap<>();

            // Check if user exists with this Google ID
            System.out.println("GoogleAuthService: Checking if user exists with Google ID: " + googleId);
            Optional<User> existingUserByGoogleId = userRepository.findByGoogleId(googleId);
            if (existingUserByGoogleId.isPresent()) {
                User user = existingUserByGoogleId.get();
                System.out.println("GoogleAuthService: User found with Google ID: " + user.getEmail());

                if (user.isBanned()) {
                    System.err.println("GoogleAuthService: User is banned: " + user.getEmail());
                    throw new RuntimeException("User account is banned");
                }

                String token = generateJwtToken(user);
                result.put("token", token);
                result.put("profileCompleted", user.isProfileCompleted());
                result.put("userId", user.getId());
                System.out.println("GoogleAuthService: Returning existing user with Google ID");
                return result;
            }

            // Check if user exists with this email
            System.out.println("GoogleAuthService: Checking if user exists with email: " + email);
            Optional<User> existingUserByEmail = userRepository.findByEmail(email);
            if (existingUserByEmail.isPresent()) {
                User user = existingUserByEmail.get();
                System.out.println("GoogleAuthService: User found with email: " + email);

                if (user.isBanned()) {
                    System.err.println("GoogleAuthService: User is banned: " + user.getEmail());
                    throw new RuntimeException("User account is banned");
                }

                // Update the user with Google ID
                System.out.println("GoogleAuthService: Updating existing user with Google ID");
                user.setGoogleId(googleId);
                userRepository.save(user);

                String token = generateJwtToken(user);
                result.put("token", token);
                result.put("profileCompleted", user.isProfileCompleted());
                result.put("userId", user.getId());
                System.out.println("GoogleAuthService: Returning existing user updated with Google ID");
                return result;
            }

            // Create a new user with minimal information
            System.out.println("GoogleAuthService: Creating new user with email: " + email);
            User newUser = User.builder()
                    .firstName(firstName)
                    .lastName(lastName)
                    .email(email)
                    .googleId(googleId)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString())) // Random password as it won't be used
                    .role(UserRole.STUDENT) // Default role
                    .isActive(true)
                    .isBanned(false)
                    .profileCompleted(false) // Profile is not complete yet
                    .build();

            User savedUser = userRepository.save(newUser);
            System.out.println("GoogleAuthService: New user created with ID: " + savedUser.getId());

            String token = generateJwtToken(savedUser);
            result.put("token", token);
            result.put("profileCompleted", false);
            result.put("userId", savedUser.getId());
            result.put("isNewUser", true);
            System.out.println("GoogleAuthService: Returning new user data");
            return result;
        } catch (Exception e) {
            System.err.println("GoogleAuthService: Error processing user: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    private String generateJwtToken(User user) {
        UserDetails userDetails = user;
        return jwtUtils.generateToken(userDetails);
    }

    public User completeUserProfile(Long userId, String bio, String skills, UserRole role, MultipartFile profileImage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (bio != null && !bio.isEmpty()) {
            user.setBio(bio);
        }

        if (skills != null && !skills.isEmpty()) {
            user.setSkills(skills);
        }

        if (role != null) {
            user.setRole(role);
        }

        if (profileImage != null && !profileImage.isEmpty()) {
            try {
                user.setProfileImage(profileImage.getBytes());
            } catch (IOException e) {
                throw new RuntimeException("Error processing profile image", e);
            }
        }

        user.setProfileCompleted(true);
        return userRepository.save(user);
    }
}
