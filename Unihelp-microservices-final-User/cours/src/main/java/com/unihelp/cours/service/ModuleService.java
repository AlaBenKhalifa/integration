package com.unihelp.cours.service;

import com.unihelp.cours.entities.Course;
import com.unihelp.cours.entities.Module;
import com.unihelp.cours.exception.CourseNotFoundException;
import com.unihelp.cours.exception.ModuleNotFoundException;
import com.unihelp.cours.repository.CourseRepository;
import com.unihelp.cours.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ModuleService {
    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    public Module addModuleToCourse(Long courseId, Module module) {
        // Check if course exists
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course not found"));

        // Log course and module information
        System.out.println("Course: " + course);
        System.out.println("Adding module: " + module.getTitle());

        // Set course and save the module
        module.setCourse(course);
        return moduleRepository.save(module);
    }
    // READ: Get all modules for a specific course
    public List<Module> getModulesByCourse(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course not found"));
        return course.getModules();
    }

    // READ: Get a specific module by ID
    public Module getModuleById(Long courseId, Long moduleId) {
        return moduleRepository.findById(moduleId)
                .filter(module -> module.getCourse().getId().equals(courseId))
                .orElseThrow(() -> new ModuleNotFoundException("Module not found"));
    }

    // UPDATE: Update an existing module
    public Module updateModule(Long courseId, Long moduleId, Module updatedModule) {
        Module module = moduleRepository.findById(moduleId)
                .filter(m -> m.getCourse().getId().equals(courseId))
                .orElseThrow(() -> new ModuleNotFoundException("Module not found"));

        module.setTitle(updatedModule.getTitle());
        module.setDescription(updatedModule.getDescription());
        return moduleRepository.save(module);
    }

    // DELETE: Delete a module by ID
    public void deleteModule(Long courseId, Long moduleId) {
        Module module = moduleRepository.findById(moduleId)
                .filter(m -> m.getCourse().getId().equals(courseId))
                .orElseThrow(() -> new ModuleNotFoundException("Module not found"));

        moduleRepository.delete(module);
    }
}
