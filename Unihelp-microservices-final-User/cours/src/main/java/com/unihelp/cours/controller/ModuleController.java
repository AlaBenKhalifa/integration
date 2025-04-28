package com.unihelp.cours.controller;

import com.unihelp.cours.entities.Module;
import com.unihelp.cours.service.ModuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class ModuleController {

    private final ModuleService moduleService;

    @PostMapping("/{courseId}/modules")
    public ResponseEntity<Module> addModule(@PathVariable Long courseId, @RequestBody Module module) {
        Module savedModule = moduleService.addModuleToCourse(courseId, module);
        return ResponseEntity.ok(savedModule);
    }
    // READ: Get all modules for a specific course
    @GetMapping("/{courseId}/modules")
    public ResponseEntity<List<Module>> getModulesByCourse(@PathVariable Long courseId) {
        List<Module> modules = moduleService.getModulesByCourse(courseId);
        return ResponseEntity.ok(modules);
    }

    // READ: Get a specific module by ID
    @GetMapping("/{courseId}/modules/{moduleId}")
    public ResponseEntity<Module> getModuleById(@PathVariable Long courseId, @PathVariable Long moduleId) {
        Module module = moduleService.getModuleById(courseId, moduleId);
        return ResponseEntity.ok(module);
    }

    // UPDATE: Update an existing module
    @PutMapping("/{courseId}/modules/{moduleId}")
    public ResponseEntity<Module> updateModule(@PathVariable Long courseId, @PathVariable Long moduleId, @RequestBody Module updatedModule) {
        Module module = moduleService.updateModule(courseId, moduleId, updatedModule);
        return ResponseEntity.ok(module);
    }

    // DELETE: Delete a module by ID
    @DeleteMapping("/{courseId}/modules/{moduleId}")
    public ResponseEntity<Void> deleteModule(@PathVariable Long courseId, @PathVariable Long moduleId) {
        moduleService.deleteModule(courseId, moduleId);
        return ResponseEntity.noContent().build();
    }



}
