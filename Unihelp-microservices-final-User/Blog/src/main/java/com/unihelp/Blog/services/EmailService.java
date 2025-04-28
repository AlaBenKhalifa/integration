package com.unihelp.Blog.services;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
@Service
@RequiredArgsConstructor
public class EmailService {
    @Autowired
    private JavaMailSender mailSender;

    public void sendCommentNotificationEmail(String to, String blogTitle, String commenterName, String commentContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        helper.setTo(to);
        helper.setSubject("New Comment on Your Blog: " + blogTitle);
        helper.setText(
                "<h3>New Comment Notification</h3>" +
                        "<p>Dear User,</p>" +
                        "<p>A new comment has been added to your blog <b>" + blogTitle + "</b>.</p>" +
                        "<p><b>Commenter:</b> " + commenterName + "</p>" +
                        "<p><b>Comment:</b> " + commentContent + "</p>" +
                        "<p>Visit your blog to view and respond to the comment.</p>" +
                        "<p>Best regards,<br>Unihelp Team</p>",
                true
        );

        try {
            mailSender.send(message);
            System.out.println("Email sent successfully to " + to);
        } catch (Exception e) {
            System.err.println("Email sending failed: " + e.getMessage());
            e.printStackTrace();
        }

    }
}
