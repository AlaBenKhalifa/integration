package com.unihelp.user.controllers;

import com.unihelp.user.dto.*;
import com.unihelp.user.entities.Token;
import com.unihelp.user.entities.User;
import com.unihelp.user.entities.UserRole;
import com.unihelp.user.repositories.TokenRepository;
import com.unihelp.user.repositories.UserRepository;
import com.unihelp.user.security.JwtUtils;
import com.unihelp.user.services.UserService;
import jakarta.mail.MessagingException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.io.IOException;
import java.security.GeneralSecurityException;
import com.unihelp.user.services.GoogleAuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final TokenRepository tokenRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final GoogleAuthService googleAuthService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(
            @RequestParam("firstName") String firstName,
            @RequestParam("lastName") String lastName,
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            @RequestParam("bio") String bio,
            @RequestParam("skills") String skills,
            @RequestParam("role") UserRole role,
            @RequestParam("profileImage") MultipartFile profileImage
    ) {
        try {
            User user = userService.registerUser(
                    firstName, lastName, email, password, bio, skills, role, profileImage
            );
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur d'inscription : " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        System.out.println("Attempting login for email: " + request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    System.out.println("User not found for email: " + request.getEmail());
                    return new RuntimeException("User not found");
                });

        if (user.isBanned()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("User account is banned.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateToken((UserDetails) authentication.getPrincipal());

        System.out.println("User retrieved: " + user.getEmail());

        // Calculate expiration time and convert to LocalDateTime
        long expirationMillis = jwtUtils.getExpiration();
        LocalDateTime expiresAt = LocalDateTime.ofInstant(
                Instant.ofEpochMilli(System.currentTimeMillis() + expirationMillis),
                ZoneId.systemDefault()
        );

        // Save token to Token table (not revoked)
        Token token = Token.builder()
                .token(jwt)
                .expiresAt(expiresAt)
                .user(user)
                .revoked(false)
                .build();
        tokenRepository.save(token);

        return ResponseEntity.ok(LoginResponse.builder()
                .token(jwt)
                .type("Bearer")
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            SecurityContextHolder.clearContext();
            return ResponseEntity.ok("User logged out successfully (no token provided).");
        }

        String jwt = authHeader.substring(7);
        Optional<Token> tokenOpt = tokenRepository.findByToken(jwt);
        if (tokenOpt.isPresent()) {
            Token token = tokenOpt.get();
            token.setRevoked(true);
            tokenRepository.save(token);
        }

        SecurityContextHolder.clearContext();
        return ResponseEntity.ok("User logged out successfully.");
    }

    @GetMapping("/admin/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/admin/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        System.out.println("User fetched: " + user);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/admin/users/{id}/ban")
    public ResponseEntity<String> banUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.isBanned()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User already banned.");
        }
        user.setBanned(true);
        userRepository.save(user);
        return ResponseEntity.ok("User banned successfully.");
    }

    @PostMapping("/admin/users/{id}/unban")
    public ResponseEntity<String> unbanUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isBanned()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User is not banned.");
        }
        user.setBanned(false);
        userRepository.save(user);
        return ResponseEntity.ok("User unbanned successfully.");
    }

    @PutMapping("/admin/users/{id}")
    public ResponseEntity<String> updateUser(@PathVariable Long id, @RequestBody User updatedUser) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setFirstName(updatedUser.getFirstName());
        user.setLastName(updatedUser.getLastName());
        user.setEmail(updatedUser.getEmail());
        user.setBio(updatedUser.getBio());
        user.setSkills(updatedUser.getSkills());
        user.setProfileImage(updatedUser.getProfileImage());
        user.setRole(updatedUser.getRole());
        userRepository.save(user);
        return ResponseEntity.ok("User details updated successfully.");
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        try {
            User user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // The cascading delete will automatically handle UserActivity records
            userRepository.delete(user);
            return ResponseEntity.ok("User deleted successfully.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting user: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody EmailRequest email) throws MessagingException {
        userService.generateAndSendEmailRestToken(email.getEmail());
        return ResponseEntity.ok("Password reset link sent to your email!");
    }

    // New endpoint for users to update their own profile
    @PutMapping("/users/{id}")
    public ResponseEntity<String> updateOwnProfile(@PathVariable Long id, @RequestBody User updatedUser) {
        // Get the authenticated user's email
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication.getName();

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Allow update if the authenticated user is updating their own profile or is an admin
        if (!user.getEmail().equals(authenticatedEmail) &&
            authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to update this profile.");
        }

        // Only allow updating profile fields, not role or banned status
        user.setFirstName(updatedUser.getFirstName());
        user.setLastName(updatedUser.getLastName());
        user.setEmail(updatedUser.getEmail());
        user.setBio(updatedUser.getBio());
        user.setSkills(updatedUser.getSkills());
        user.setProfileImage(updatedUser.getProfileImage());
        // Do NOT update role or banned status here

        userRepository.save(user);
        return ResponseEntity.ok("Profile updated successfully.");
    }

    @GetMapping("/reset-password")
    public ResponseEntity<String> verifyToken(@RequestParam String token) {
        Token resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Token expired");
        }

        return ResponseEntity.ok("Token verified. Display password reset form.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        String token = request.getToken();
        String newPassword = request.getNewPassword();

        Token resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Token expired");
        }
        if (newPassword.length() < 8) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Le mot de passe doit comporter au moins 8 caractères.");
        }
        User user = resetToken.getUser();
        user.setPassword(bCryptPasswordEncoder.encode(newPassword));
        userRepository.save(user);

        tokenRepository.delete(resetToken);
        return ResponseEntity.ok("Password successfully reset!");
    }
    
    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        System.out.println("AuthController: Received Google login request");
        
        if (request == null || request.getToken() == null || request.getToken().isEmpty()) {
            System.err.println("AuthController: Google login request contains null or empty token");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Google token is required");
        }
        
        try {
            System.out.println("AuthController: Processing Google login with token length: " + request.getToken().length());
            Map<String, Object> authResult = googleAuthService.authenticateGoogleUser(request.getToken());
            
            // Get the JWT token
            String token = (String) authResult.get("token");
            if (token == null || token.isEmpty()) {
                System.err.println("AuthController: No JWT token generated from Google authentication");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to generate authentication token");
            }
            
            // Get user details from token
            String email = jwtUtils.extractUsername(token);
            System.out.println("AuthController: Extracted email from token: " + email);
            
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> {
                        System.err.println("AuthController: User not found for email: " + email);
                        return new RuntimeException("User not found");
                    });
            
            // Create response object
            LoginResponse response = new LoginResponse();
            response.setToken(token);
            response.setType("Bearer");
            response.setId(user.getId());
            response.setEmail(user.getEmail());
            response.setRole(user.getRole().name());
            
            // Add profile completion status
            boolean profileCompleted = (boolean) authResult.get("profileCompleted");
            response.setProfileCompleted(profileCompleted);
            
            // Add isNewUser flag if present
            if (authResult.containsKey("isNewUser")) {
                response.setNewUser((boolean) authResult.get("isNewUser"));
            }
            
            System.out.println("AuthController: Google login successful for user: " + email);
            return ResponseEntity.ok(response);
        } catch (GeneralSecurityException | IOException e) {
            System.err.println("AuthController: Security/IO exception in Google login: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Google token: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("AuthController: Unexpected exception in Google login: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error during Google authentication: " + e.getMessage());
        }
    }
    
    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(
            @RequestParam("userId") Long userId,
            @RequestParam("bio") String bio,
            @RequestParam("skills") String skills,
            @RequestParam("role") UserRole role,
            @RequestParam(value = "profileImage", required = false) MultipartFile profileImage
    ) {
        try {
            User updatedUser = googleAuthService.completeUserProfile(userId, bio, skills, role, profileImage);
            
            // Create response object
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Profile completed successfully");
            response.put("userId", updatedUser.getId());
            response.put("email", updatedUser.getEmail());
            response.put("role", updatedUser.getRole().name());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error completing profile: " + e.getMessage());
        }
    }
}