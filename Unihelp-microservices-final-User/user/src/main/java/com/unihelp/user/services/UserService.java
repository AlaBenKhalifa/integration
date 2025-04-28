package com.unihelp.user.services;

import com.unihelp.user.entities.Token;
import com.unihelp.user.repositories.TokenRepository;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.unihelp.user.dto.RegisterRequest;
import com.unihelp.user.entities.User;
import com.unihelp.user.entities.UserRole;
import com.unihelp.user.repositories.UserRepository;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenRepository tokenRepository;
    private final JavaMailSender javaMailSender;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, TokenRepository tokenRepository, JavaMailSender javaMailSender) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRepository = tokenRepository;
        this.javaMailSender = javaMailSender;
    }

    public User registerUser(String firstName, String lastName, String email, String password,
                             String bio, String skills, UserRole role, MultipartFile profileImage) {

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email déjà utilisé !");
        }

        // Traitement de l'image (optionnel : enregistrer en base de données ou dans un dossier)
        byte[] imageData = null;
        try {
            imageData = profileImage.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors du traitement de l'image : " + e.getMessage());
        }

        User user = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .password(passwordEncoder.encode(password))
                .bio(bio)
                .skills(skills)
                .role(role)
                .profileImage(imageData) // ⚠️ profileImage doit être un tableau de bytes dans ton entité !
                .isActive(true)
                .isBanned(false)
                .build();

        return userRepository.save(user);
    }


    public void generateAndSendEmailRestToken(String email) throws MessagingException {
        Optional<User> userByEmail = userRepository.findByEmail(email);

        if (userByEmail.isPresent()) {
            String generatedToken = generateActivationCode();
            var token = Token.builder()
                    .token(generatedToken)
                    .createdAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusMinutes(15))
                    .user(userByEmail.get())
                    .build();
            tokenRepository.save(token);

            String resetLink = "http://localhost:4200/login?token=" + token.getToken();
            System.out.println(resetLink);
                        try {
    System.out.println("[DEBUG] About to send reset email to: " + email);
    MimeMessage mimeMessage = javaMailSender.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "utf-8");
    helper.setTo(email);
    helper.setSubject("Password Change Request");
    String htmlMsg = "<div style=\"font-family:sans-serif;background:#fff;padding:40px 0;text-align:center;\">" +
        "  <img src=\"C:/Users/RAOUF/Desktop/PI_Cloud/Unihelp-microservices-final/frontend/src/assets/img/Unihelp-Icon.png\" alt=\"UniHelp Logo\" style=\"width:70px;margin-bottom:30px;\">" +
        "  <h1 style=\"font-size:2.2em;margin-bottom:0.3em;\">Password Change Request</h1>" +
        "  <p style=\"font-size:1.1em;margin-bottom:2em;\">You have submitted a password change request.</p>" +
        "  <p style=\"max-width:500px;margin:0 auto 2em auto;font-size:1em;\">If it wasn't you please disregard this email and make sure you can still login to your account. If it was you, then <b>confirm the password change</b> <a href=\"" + resetLink + "\" style=\"color:#1976d2;text-decoration:underline;font-weight:bold;\">click here</a>.</p>" +
        "  <br><p style=\"margin-top:2em;\">Thanks!<br><span style=\"display:inline-block;background:#000;color:#fff;padding:4px 16px;border-radius:4px;margin-top:10px;\">UniHelp Team</span></p>" +
        "  <hr style=\"margin:40px 0 20px 0;border:none;border-top:1px solid #eee;\">" +
        "  <div style=\"color:#b0b0b0;font-size:0.95em;\">If you did not make this request, please contact us by replying to this mail.</div>" +
        "</div>";
    helper.setText(htmlMsg, true);
    javaMailSender.send(mimeMessage);
    System.out.println("[DEBUG] Reset email sent successfully to: " + email);
} catch (Exception e) {
                System.out.println("[ERROR] Failed to send reset email to: " + email);
                e.printStackTrace();
            }

        }
    }

    private String generateActivationCode() {
        return UUID.randomUUID().toString();
    }
}