package com.unihelp.Blog.clients;

import com.unihelp.Blog.model.User;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
@FeignClient(url = "http://user-service:8073", name = "USER")
public interface UserRestClientt {

    @GetMapping("/api/auth/admin/users/{id}")
    @CircuitBreaker(name = "userService", fallbackMethod = "getDefaultUser")
    User findUserById(@PathVariable Long id);

    @GetMapping("/api/auth/admin/users")
    @CircuitBreaker(name = "userService", fallbackMethod = "getDefaultUsers")
    List<User> allUsers();

    default User getDefaultUser(Long id, Exception exception) {
        User user = new User();
        user.setId(id);
        user.setFirstName("Default");
        user.setLastName("User");
        user.setProfileImage("default.png");
        user.setEmail("<EMAIL>");
        return user;
    }

    default List<User> getDefaultUsers(Exception exception) {
        return List.of();
    }
}