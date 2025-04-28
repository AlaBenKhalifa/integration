package com.unihelp.Blog.services;

import com.unihelp.Blog.clients.UserRestClientt;
import com.unihelp.Blog.entities.Blog;
import com.unihelp.Blog.entities.Comment;
import com.unihelp.Blog.exceptions.BlogNotFoundException;
import com.unihelp.Blog.model.User;
import com.unihelp.Blog.repositories.BlogRepository;
import com.unihelp.Blog.repositories.CommentRepository;
import jakarta.mail.MessagingException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final BlogRepository blogRepository;
    private final CommentRepository commentRepository;
    private final UserRestClientt userRestClient;
    private final BlogService blogService;
    private final EmailService emailService;
    public Comment addComment(Comment comment, long id) {
        // Check if course exists
        Blog blog = blogRepository.findById(comment.getBlog().getIdBlog())
                .orElseThrow(() -> new BlogNotFoundException("Blog not found"));


        // Set course and save the module
        comment.setBlog(blog);

        User user;

        user = userRestClient.findUserById(id);

        comment.setUser(user);

        comment.setUserId(user.getId());

        // Send email to blog creator
        try {
            User commenter = userRestClient.findUserById(comment.getUserId());
            User blogCreator = userRestClient.findUserById(blog.getUserId());
            emailService.sendCommentNotificationEmail(
                    blogCreator.getEmail(),
                    blog.getTitle(),
                    commenter.getFirstName() != null ? commenter.getFirstName() : "Anonymous",
                    comment.getContent()
            );
        } catch (MessagingException e) {
            // Log the error, but don't fail the comment creation
            System.err.println("Failed to send email: " + e.getMessage());
        }

        return commentRepository.save(comment);
    }

    public List<Comment> getAllComments() {
        List<Comment> comments = commentRepository.findAll();
        for (Comment comment : comments) {
            User u = userRestClient.findUserById(comment.getUserId());
            comment.setUser(u);
        }
        return comments;
    }

    public Comment getCommentWithId(Long commentId) {
        Comment com = commentRepository.findById(commentId)
            .orElseThrow(() -> new BlogNotFoundException("Comment not found"));

        User user = userRestClient.findUserById(com.getUserId());
        com.setUser(user);
        return com;
    }

    public Comment updateComment(Long commentId, Comment updatedComment) {
        Comment existing = commentRepository.findById(commentId)
                .orElseThrow(() -> new BlogNotFoundException("Comment with ID " + commentId + " not found"));

        existing.setContent(updatedComment.getContent());
        User user = userRestClient.findUserById(updatedComment.getUserId());
        existing.setUser(user);
        return commentRepository.save(existing);
    }

    @Transactional
    public void deleteComment(Long id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BlogNotFoundException("Comment not found with id: " + id));

        // Remove the comment from the Blog's comments list (if necessary)
        Blog blog = comment.getBlog();
        if (blog != null && blog.getComments() != null) {
            blog.getComments().remove(comment);
            blogRepository.save(blog);
        }

        // Delete the comment
        commentRepository.delete(comment);
    }

}
