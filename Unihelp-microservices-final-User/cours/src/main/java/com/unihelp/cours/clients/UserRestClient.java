package com.unihelp.cours.clients;

import com.unihelp.cours.model.User;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
@FeignClient(name = "USER")
public interface UserRestClient {

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
        user.setEmail("<EMAIL>");
        return user;
    }

    default List<User> getDefaultUsers(Exception exception) {
        return List.of();
    }
}