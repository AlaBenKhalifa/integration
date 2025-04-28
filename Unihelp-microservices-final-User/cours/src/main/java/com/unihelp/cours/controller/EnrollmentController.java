package com.unihelp.cours.controller;

import com.unihelp.cours.entities.Course;
import com.unihelp.cours.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {
    private final CourseService courseService;

    @PostMapping("/{courseId}/enroll")
    public ResponseEntity<Map<String, String>> enrollFreeCourse(@PathVariable Long courseId, @RequestBody Map<String, Object> request) {
        try {
            Long userId = request.get("userId") != null ? Long.valueOf(request.get("userId").toString()) : null;
            String role = request.get("role") != null ? request.get("role").toString() : null;
            if (userId == null || role == null || !role.equals("STUDENT")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid user data. Must provide userId and role='STUDENT'."));
            }
            Course course = courseService.findById(courseId)
                    .orElseThrow(() -> new RuntimeException("Course not found"));
            if ( course.getPrice() > 0 ) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "This is a paid course. Use the checkout endpoint."));
            }
            courseService.enrollUser(userId, courseId);
            return ResponseEntity.ok(Map.of("message", "Successfully enrolled"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Enrollment failed: " + e.getMessage()));
        }
    }
}