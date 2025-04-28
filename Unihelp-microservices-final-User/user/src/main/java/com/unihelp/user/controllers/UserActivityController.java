package com.unihelp.user.controllers;

import com.unihelp.user.dto.UserActivityDto;
import com.unihelp.user.services.UserActivityService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/user-activity")
@RequiredArgsConstructor
public class UserActivityController {

    private final UserActivityService userActivityService;

    @PostMapping("/record")
    public ResponseEntity<UserActivityDto> recordActivity(
            @RequestBody UserActivityDto activityDto,
            HttpServletRequest request) {
        UserActivityDto savedActivity = userActivityService.recordUserActivity(activityDto, request);
        return ResponseEntity.ok(savedActivity);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #userId")
    public ResponseEntity<List<UserActivityDto>> getUserActivity(@PathVariable Long userId) {
        List<UserActivityDto> activities = userActivityService.getUserActivityHistory(userId);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/type/{activityType}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserActivityDto>> getActivityByType(@PathVariable String activityType) {
        List<UserActivityDto> activities = userActivityService.getActivityByType(activityType);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserActivityDto>> getActivitiesByDateRange(
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {
        List<UserActivityDto> activities = userActivityService.getActivitiesBetweenDates(startDate, endDate);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/dashboard-stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = userActivityService.getDashboardStats();
        return ResponseEntity.ok(stats);
    }
}
