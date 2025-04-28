package com.unihelp.cours.service;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import com.unihelp.cours.entities.Course;
import com.unihelp.cours.entities.Enrollment;
import com.unihelp.cours.enums.Category;
import com.unihelp.cours.repository.CourseRepository;
import com.unihelp.cours.repository.EnrollmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.FileReader;
import java.io.IOException;

@Component
public class DataLoader implements CommandLineRunner {
    @Autowired
    private CourseRepository courseRepository;
    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Override
    public void run(String... args) throws Exception {
        String csvPath = "/app/data/modified_course_data.csv";
        try (CSVReader reader = new CSVReader(new FileReader(csvPath))) {
            reader.readNext(); // Skip header
            String[] line;
            long mockUserId = 2;
            while ((line = reader.readNext()) != null) {
                String title = line[0].trim();
                String skill = line[1].trim();
                String category = line[2].trim();
                long studentsEnrolled = Long.parseLong(line[3].trim());

                Course course = courseRepository.findByTitle(title);
                if (course == null) {
                    course = new Course();
                    course.setTitle(title);
                    course.setLevel(skill);
                    course.setCategory(Category.valueOf(category)); // Convert string to Category enum
                    course = courseRepository.save(course);
                } else {
                    course.setLevel(skill);
                    course.setCategory(Category.valueOf(category));
                    courseRepository.save(course);
                }

                long existingEnrollments = enrollmentRepository.findByCourseId(course.getId()).size();
                long enrollmentsToAdd = studentsEnrolled - existingEnrollments;
                for (int i = 0; i < enrollmentsToAdd && i < 1000; i++) {
                    Enrollment enrollment = new Enrollment();
                    enrollment.setUserId(mockUserId++);
                    enrollment.setCourse(course);
                    enrollmentRepository.save(enrollment);
                }
            }
        } catch (IOException | CsvValidationException e) {
            e.printStackTrace();
        }
    }
}