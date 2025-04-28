package com.unihelp.cours.service;

import com.unihelp.cours.entities.Course;
import com.unihelp.cours.entities.Enrollment;
import com.unihelp.cours.repository.CourseRepository;
import com.unihelp.cours.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EnrollmentService {
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;

    public void enroll(Long userId, Long courseId) {
        // Fetch the Course entity
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));

        Enrollment enrollment = new Enrollment();
        enrollment.setUserId(userId);
        enrollment.setCourse(course); // Set the Course entity
        enrollmentRepository.save(enrollment);
    }

    public boolean isEnrolled(Long userId, Long courseId) {
        return enrollmentRepository.existsByUserIdAndCourseId(userId, courseId);
    }
}