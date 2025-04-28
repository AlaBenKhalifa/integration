package com.unihelp.cours.service;

import com.unihelp.cours.clients.UserRestClient;
import com.unihelp.cours.entities.Course;
import com.unihelp.cours.entities.Enrollment;
import com.unihelp.cours.exception.CourseNotFoundException;
import com.unihelp.cours.model.Role;
import com.unihelp.cours.model.User;
import com.unihelp.cours.repository.CourseRepository;
import com.unihelp.cours.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final UserRestClient userRestClient;
    @Autowired
    private EnrollmentRepository enrollmentRepository;
    public Course createCourse(Course course) {
        if (course.getUserId() == null) {
            throw new IllegalArgumentException("User ID is required to create a course");
        }

        User instructor = userRestClient.findUserById(course.getUserId());
        if (instructor == null) {
            throw new IllegalArgumentException("User not found with ID: " + course.getUserId());
        }
        if (instructor.getRole() != Role.ADMIN && instructor.getRole() != Role.MENTOR) {
            throw new IllegalArgumentException("Only instructors with the role 'ADMIN' or 'MENTOR' can create courses");
        }

        course.setUser(instructor);
        return courseRepository.save(course);
    }


    public Course getCourseWithInstructor(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course not found"));

        User instructor = userRestClient.findUserById(course.getUserId());
        course.setUser(instructor);
        return course;
    }


    public List<Course> getAllCourses() {
        List<Course> courses = courseRepository.findAll();
        courses.forEach(course -> {
            User instructor = userRestClient.findUserById(course.getUserId());
            course.setUser(instructor);
        });
        return courses;
    }

    public List<Course> getCoursesByInstructor(Long UserId) {
        List<Course> courses = courseRepository.findByUserId(UserId);
        courses.forEach(course -> {
            User instructor = userRestClient.findUserById(course.getUserId());
            course.setUser(instructor);
        });
        return courses;
    }



    public Course updateCourse(Long courseId, Course updatedCourse) {
        Course existing = courseRepository.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course not found"));

        existing.setTitle(updatedCourse.getTitle());
        existing.setDescription(updatedCourse.getDescription());
        existing.setPrice(updatedCourse.getPrice());
        return courseRepository.save(existing);
    }


    public void deleteCourse(Long courseId) {
        courseRepository.deleteById(courseId);
    }

  //eljdid
    public Optional<Course> findById(Long id) {
        return courseRepository.findById(id);
    }


    public boolean isUserEnrolled(Long userId, Long courseId) {
        return enrollmentRepository.existsByUserIdAndCourseId(userId, courseId);
    }


//jdidaa behc nassuri wmar abarka wehed yenrolii mara abrka el cours mech dima
public void enrollUser(Long userId, Long courseId) {
    if (isUserEnrolled(userId, courseId)) {
        throw new IllegalStateException("User is already enrolled in this course");
    }
    Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new CourseNotFoundException("Course not found"));
    Enrollment enrollment = new Enrollment();
    enrollment.setUserId(userId);
    enrollment.setCourse(course);
    enrollmentRepository.save(enrollment);
}
    public List<Course> getEnrolledCourses(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }
        List<Enrollment> enrollments = enrollmentRepository.findByUserId(userId);
        List<Course> enrolledCourses = new ArrayList<>();
        for (Enrollment enrollment : enrollments) {
            if (enrollment.getCourse() != null) {
                enrolledCourses.add(enrollment.getCourse());
            }
        }
        return enrolledCourses;
    }

}