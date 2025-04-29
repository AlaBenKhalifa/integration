package com.unihelp.user.repositories;

import com.unihelp.user.entities.UserActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {

    List<UserActivity> findByUserIdOrderByTimestampDesc(Long userId);

    @Query("SELECT a FROM UserActivity a WHERE a.activityType = :activityType ORDER BY a.timestamp DESC")
    List<UserActivity> findByActivityType(@Param("activityType") String activityType);

    @Query("SELECT a FROM UserActivity a WHERE a.timestamp BETWEEN :startDate AND :endDate ORDER BY a.timestamp DESC")
    List<UserActivity> findActivitiesBetweenDates(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT a FROM UserActivity a WHERE a.user.id = :userId AND a.activityType = :activityType ORDER BY a.timestamp DESC")
    List<UserActivity> findByUserIdAndActivityType(
            @Param("userId") Long userId,
            @Param("activityType") String activityType);

    @Query("SELECT COUNT(a) FROM UserActivity a WHERE a.timestamp >= :since AND a.activityType = 'LOGIN'")
    Long countLoginsInPeriod(@Param("since") LocalDateTime since);

    @Query("SELECT a.deviceType, COUNT(a) FROM UserActivity a WHERE a.activityType = 'LOGIN' GROUP BY a.deviceType")
    List<Object[]> countLoginsByDeviceType();

    @Query("SELECT a.browserName, COUNT(a) FROM UserActivity a WHERE a.activityType = 'LOGIN' GROUP BY a.browserName")
    List<Object[]> countLoginsByBrowserName();

    @Query("SELECT a.osName, COUNT(a) FROM UserActivity a WHERE a.activityType = 'LOGIN' GROUP BY a.osName")
    List<Object[]> countLoginsByOperatingSystem();
}
