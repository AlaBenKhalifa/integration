package com.unihelp.cours;

import com.unihelp.cours.clients.UserRestClient;
import com.unihelp.cours.enums.Category;

import com.unihelp.cours.entities.Course;
import com.unihelp.cours.model.User;
import com.unihelp.cours.repository.CourseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
import java.util.List;

@SpringBootApplication
@EnableFeignClients

public class CoursApplication {

	public static void main(String[] args) {
		SpringApplication.run(CoursApplication.class, args);
	}

	@Bean
	CommandLineRunner initCourses(CourseRepository courseRepository, UserRestClient userRestClient) {
		return args -> {
			if (courseRepository.count() == 0) {
				User instructor1 = userRestClient.findUserById(1L);
				User instructor2 = userRestClient.findUserById(2L);

				Course course1 = Course.builder()
						.title("Introduction to Programming")
						.description("Learn the basics of programming.")
						.category(Category.CHEMISTRY)
						.level("Beginner")
						.price(49.99)
						.thumbnailUrl("https://example.com/course1-thumbnail.jpg")
						.userId(instructor1.getId())
						.build();

				Course course2 = Course.builder()
						.title("Advanced Java")
						.description("Master advanced Java concepts.")
						.category(Category.BIOLOGY) // Fixed category
						.level("Advanced")
						.price(99.99)
						.thumbnailUrl("https://example.com/course2-thumbnail.jpg")
						.userId(instructor2.getId())
						.build();

				courseRepository.saveAll(List.of(course1, course2));
			}
		};
	}

}