package com.unihelp.cours.controller;

import com.unihelp.cours.entities.Lesson;
import com.unihelp.cours.entities.Module;
import com.unihelp.cours.repository.LessonRepository;
import com.unihelp.cours.repository.ModuleRepository;
import com.unihelp.cours.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses/{courseId}/modules/{moduleId}/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;
    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;

    @GetMapping
    public ResponseEntity<?> getLessonsByModule(
            @PathVariable Long courseId,
            @PathVariable Long moduleId) {
        try {
            System.out.println("GET lessons for course: " + courseId + ", module: " + moduleId);
            if (!moduleRepository.existsById(moduleId)) {
                System.out.println("Module not found: " + moduleId);
                return ResponseEntity.badRequest().body("Module ID " + moduleId + " not found");
            }
            List<Lesson> lessons = lessonService.getLessonsByModule(moduleId);
            System.out.println("Found " + lessons.size() + " lessons");
            lessons.forEach(lesson -> {
                if (lesson.getContentUrl() != null && !lesson.getContentUrl().startsWith("/COURS/uploads/")) {
                    lesson.setContentUrl("/COURS/uploads/" + lesson.getContentUrl().replace("/uploads/", ""));
                }
                if (lesson.getThumbnailUrl() != null && !lesson.getThumbnailUrl().startsWith("/COURS/uploads/")) {
                    lesson.setThumbnailUrl("/COURS/uploads/" + lesson.getThumbnailUrl().replace("/uploads/", ""));
                }
            });
            return ResponseEntity.ok(lessons);
        } catch (Exception e) {
            System.out.println("Error fetching lessons for module " + moduleId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching lessons: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createLesson(
            @PathVariable Long courseId,
            @PathVariable Long moduleId,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            System.out.println("POST lesson for course: " + courseId + ", module: " + moduleId);
            System.out.println("Title: " + title + ", Description: " + description);
            System.out.println("File: " + (file != null ? file.getOriginalFilename() : "null"));

            if (file == null || file.isEmpty()) {
                System.out.println("No file uploaded");
                return ResponseEntity.badRequest().body("Required part 'file' is missing or empty");
            }

            Module module = moduleRepository.findById(moduleId)
                    .orElseThrow(() -> {
                        System.out.println("Module not found: " + moduleId);
                        return new RuntimeException("Module ID " + moduleId + " not found");
                    });

            String uploadDir = "src/main/resources/uploads/";
            String fileExtension = file.getOriginalFilename() != null
                    ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."))
                    : "";
            String fileName = UUID.randomUUID() + fileExtension;
            Path filePath = Paths.get(uploadDir + fileName);
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, file.getBytes());
            System.out.println("Saved file: " + filePath);

            String contentType = fileExtension.equalsIgnoreCase(".pdf") ? "pdf" : "video";
            String thumbnailUrl = null;
            if (contentType.equals("video")) {
                String thumbnailName = UUID.randomUUID() + ".jpg";
                Path thumbnailPath = Paths.get(uploadDir + thumbnailName);
                Files.createFile(thumbnailPath); // Placeholder for thumbnail
                thumbnailUrl = "/COURS/uploads/" + thumbnailName;
            }

            Lesson lesson = new Lesson();
            lesson.setTitle(title);
            lesson.setDescription(description);
            lesson.setContentUrl("/COURS/uploads/" + fileName);
            lesson.setContentType(contentType);
            lesson.setThumbnailUrl(thumbnailUrl);
            lesson.setModule(module);

            Lesson savedLesson = lessonRepository.save(lesson);
            System.out.println("Lesson saved: " + savedLesson.getContentUrl());
            return ResponseEntity.ok(savedLesson);
        } catch (Exception e) {
            System.out.println("Error creating lesson for module " + moduleId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error creating lesson: " + e.getMessage());
        }
    }

    @PutMapping("/{lessonId}")
    public ResponseEntity<?> updateLesson(
            @PathVariable Long courseId,
            @PathVariable Long moduleId,
            @PathVariable Long lessonId,
            @RequestBody Lesson updatedLesson) {
        try {
            System.out.println("PUT lesson: " + lessonId);
            Lesson lesson = lessonService.updateLesson(moduleId, lessonId, updatedLesson);
            return ResponseEntity.ok(lesson);
        } catch (Exception e) {
            System.out.println("Error updating lesson: " + e.getMessage());
            return ResponseEntity.status(500).body("Error updating lesson: " + e.getMessage());
        }
    }

    @DeleteMapping("/{lessonId}")
    public ResponseEntity<?> deleteLesson(
            @PathVariable Long courseId,
            @PathVariable Long moduleId,
            @PathVariable Long lessonId) {
        try {
            System.out.println("DELETE lesson: " + lessonId);
            lessonService.deleteLesson(moduleId, lessonId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.out.println("Error deleting lesson: " + e.getMessage());
            return ResponseEntity.status(500).body("Error deleting lesson: " + e.getMessage());
        }
    }
}