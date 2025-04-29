package com.unihelp.user.services;

import com.unihelp.user.dto.UserActivityDto;
import com.unihelp.user.entities.User;
import com.unihelp.user.entities.UserActivity;
import com.unihelp.user.repositories.UserActivityRepository;
import com.unihelp.user.repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserActivityService {

    private final UserActivityRepository userActivityRepository;
    private final UserRepository userRepository;

    public UserActivityDto recordUserActivity(UserActivityDto activityDto, HttpServletRequest request) {
        // Find user (if provided)
        User user = null;
        if (activityDto.getUserId() != null) {
            user = userRepository.findById(activityDto.getUserId()).orElse(null);
        }

        // Handle case where user ID is provided but user not found
        if (activityDto.getUserId() != null && user == null) {
            throw new RuntimeException("User with ID " + activityDto.getUserId() + " not found");
        }

        // Set IP address from request if not provided
        String ipAddress = activityDto.getIpAddress();
        if (ipAddress == null || ipAddress.isEmpty()) {
            ipAddress = extractIpAddress(request);
        }

        // Create the activity entity
        UserActivity activity = UserActivity.builder()
                .user(user)
                .activityType(activityDto.getActivityType())
                .timestamp(LocalDateTime.now())
                .ipAddress(ipAddress)
                .deviceType(activityDto.getDeviceType())
                .browserName(activityDto.getBrowserName())
                .osName(activityDto.getOsName())
                .screenResolution(activityDto.getScreenResolution())
                .timezone(activityDto.getTimezone())
                .language(activityDto.getLanguage())
                .visitorId(activityDto.getVisitorId())
                .userAgent(activityDto.getUserAgent() != null ? activityDto.getUserAgent() : request.getHeader("User-Agent"))
                .referrer(activityDto.getReferrer() != null ? activityDto.getReferrer() : request.getHeader("Referer"))
                .sessionId(activityDto.getSessionId())
                .successful(activityDto.isSuccessful())
                .failureReason(activityDto.getFailureReason())
                .build();

        UserActivity savedActivity = userActivityRepository.save(activity);
        return UserActivityDto.fromEntity(savedActivity);
    }

    public List<UserActivityDto> getUserActivityHistory(Long userId) {
        return userActivityRepository.findByUserIdOrderByTimestampDesc(userId)
                .stream()
                .map(UserActivityDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<UserActivityDto> getActivityByType(String activityType) {
        return userActivityRepository.findByActivityType(activityType)
                .stream()
                .map(UserActivityDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<UserActivityDto> getActivitiesBetweenDates(LocalDateTime startDate, LocalDateTime endDate) {
        return userActivityRepository.findActivitiesBetweenDates(startDate, endDate)
                .stream()
                .map(UserActivityDto::fromEntity)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        try {
            // Get total logins in last 24 hours
            LocalDateTime yesterday = LocalDateTime.now().minus(1, ChronoUnit.DAYS);
            Long recentLogins = userActivityRepository.countLoginsInPeriod(yesterday);
            stats.put("recentLogins", recentLogins);

            // Get login distribution by device type
            List<Object[]> deviceStats = userActivityRepository.countLoginsByDeviceType();
            Map<String, Long> deviceDistribution = new HashMap<>();
            for (Object[] stat : deviceStats) {
                String deviceType = (String) stat[0];
                Long count = (Long) stat[1];
                // Handle null keys
                if (deviceType == null) deviceType = "Unknown";
                deviceDistribution.put(deviceType, count);
            }
            stats.put("deviceDistribution", deviceDistribution);

            // Get login distribution by browser
            List<Object[]> browserStats = userActivityRepository.countLoginsByBrowserName();
            Map<String, Long> browserDistribution = new HashMap<>();
            for (Object[] stat : browserStats) {
                String browserName = (String) stat[0];
                Long count = (Long) stat[1];
                // Handle null keys
                if (browserName == null) browserName = "Unknown";
                browserDistribution.put(browserName, count);
            }
            stats.put("browserDistribution", browserDistribution);

            // Get login distribution by OS
            List<Object[]> osStats = userActivityRepository.countLoginsByOperatingSystem();
            Map<String, Long> osDistribution = new HashMap<>();
            for (Object[] stat : osStats) {
                String osName = (String) stat[0];
                Long count = (Long) stat[1];
                // Handle null keys
                if (osName == null) osName = "Unknown";
                osDistribution.put(osName, count);
            }
            stats.put("osDistribution", osDistribution);
        } catch (Exception e) {
            // Add a fallback for empty stats in case of errors
            stats.put("recentLogins", 0L);
            stats.put("deviceDistribution", new HashMap<String, Long>());
            stats.put("browserDistribution", new HashMap<String, Long>());
            stats.put("osDistribution", new HashMap<String, Long>());
            stats.put("error", e.getMessage());
        }

        return stats;
    }

    private String extractIpAddress(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        // For multiple IPs, take just the first one
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }
}
