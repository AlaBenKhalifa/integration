package com.unihelp.cours.service;

import com.unihelp.cours.entities.Lesson;
import com.unihelp.cours.entities.Module;
import com.unihelp.cours.exception.LessonNotFoundException;
import com.unihelp.cours.exception.ModuleNotFoundException;
import com.unihelp.cours.repository.LessonRepository;
import com.unihelp.cours.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;

    // CREATE: Add a lesson to a module
    public Lesson addLessonToModule(Long moduleId, Lesson lesson) {
        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new ModuleNotFoundException("Module not found"));

        lesson.setModule(module);
        return lessonRepository.save(lesson);
    }
    public List<Lesson> getLessonsByModule(Long moduleId) {
        System.out.println("Service: Fetching lessons for module " + moduleId);
        List<Lesson> lessons = lessonRepository.findByModuleId(moduleId);
        System.out.println("Service: Found " + lessons.size() + " lessons");
        return lessons;
    }



    // READ: Get a specific lesson by ID
    public Lesson getLessonById(Long moduleId, Long lessonId) {
        return lessonRepository.findById(lessonId)
                .filter(lesson -> lesson.getModule().getId().equals(moduleId))
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));
    }

    // UPDATE: Update an existing lesson
    public Lesson updateLesson(Long moduleId, Long lessonId, Lesson updatedLesson) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .filter(l -> l.getModule().getId().equals(moduleId))
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));

        lesson.setTitle(updatedLesson.getTitle());
        lesson.setContentUrl(updatedLesson.getContentUrl());
        return lessonRepository.save(lesson);
    }

    // DELETE: Delete a lesson by ID
    public void deleteLesson(Long moduleId, Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .filter(l -> l.getModule().getId().equals(moduleId))
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));

        lessonRepository.delete(lesson);
    }
}
