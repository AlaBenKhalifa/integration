package com.unihelp.Blog.services;

import com.unihelp.Blog.clients.UserRestClientt;
import com.unihelp.Blog.entities.Blog;
import com.unihelp.Blog.entities.Comment;
import com.unihelp.Blog.model.User;
import com.unihelp.Blog.repositories.BlogRepository;
import com.unihelp.Blog.exceptions.BlogNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BlogService {
    private  final BlogRepository blogRepository;
    private  final UserRestClientt userRestClient;

    public Blog createBlog(Blog blog) {
            // Fetch the user by userId
            User user;
//            if (blog.getUserId() != null)
            user = userRestClient.findUserById(blog.getUserId());
//            else {
//                throw new RuntimeException();
//            }

            // If user is found, set the user in the blog
            blog.setUser(user);
            blog.setIsVerified(false);
            // Save the blog to the repository
            return blogRepository.save(blog);// only saves persistent fields
    }

    public Blog getBlogWithId(Long blogId) {
        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException("Blog not found"));

        User user = userRestClient.findUserById(blog.getUserId());
        blog.setUser(user);
        return blog;
    }



    public List<Blog> getAllBlogs() {
        List<Blog> blogs = blogRepository.findAll();
        blogs.forEach(b -> {
            User user = userRestClient.findUserById(b.getUserId());
            b.setUser(user);
            List<Comment> c = b.getComments();
            for (Comment comment : c) {
                        User commentUser = userRestClient.findUserById(comment.getUserId());
                        comment.setUser(commentUser);
                }
        });
        return blogs;
    }

    public Blog updateBlog(Long blogId, Blog updatedBlog) {
        Blog existing = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException("Blog with ID " + blogId + " not found"));

        existing.setTitle(updatedBlog.getTitle());
        existing.setCategory(updatedBlog.getCategory());
        existing.setContent(updatedBlog.getContent());
        existing.setUserId(updatedBlog.getUserId());
        existing.setImagepath(updatedBlog.getImagepath());
        existing.setIsVerified(updatedBlog.isIsVerified());
        User user = userRestClient.findUserById(updatedBlog.getUserId());
        existing.setUser(user);
        return blogRepository.save(existing);
    }

    public Blog VerifyBlog(Long blogId) {
        Blog existing = blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogNotFoundException("Blog with ID " + blogId + " not found"));
        existing.setIsVerified(true);
        User user = userRestClient.findUserById(existing.getUserId());
        existing.setUser(user);
        return blogRepository.save(existing);
    }



    public void deleteBlog(Long Id) {
        blogRepository.deleteById(Id);
    }


}
