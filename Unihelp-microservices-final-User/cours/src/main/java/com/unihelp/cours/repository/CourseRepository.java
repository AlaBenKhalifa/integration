package com.unihelp.cours.repository;

import com.unihelp.cours.entities.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByUserId(Long UserId);
    Course findByTitle(String title);

}
