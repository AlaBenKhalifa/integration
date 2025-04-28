package com.unihelp.user.services;

import com.unihelp.user.entities.User;
import com.unihelp.user.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillMatchingService {

    private final UserRepository userRepository;
    
    /**
     * Find users with matching skills to the specified user
     * Uses both exact skill matching and NLP-extracted skills for better matching
     */
    public List<User> findUsersWithMatchingSkills(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Get all users excluding the current user
        List<User> allUsers = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(userId))
                .collect(Collectors.toList());
        
        // Extract user skills from both manually entered skills and NLP-extracted skills
        Set<String> userSkills = extractAllSkills(user);
        Set<String> userInterests = new HashSet<>(user.getExtractedInterests());
        
        // Score each user based on skill similarity
        Map<User, Double> userScores = new HashMap<>();
        
        for (User otherUser : allUsers) {
            Set<String> otherUserSkills = extractAllSkills(otherUser);
            Set<String> otherUserInterests = new HashSet<>(otherUser.getExtractedInterests());
            
            // Calculate similarity scores
            double skillSimilarity = calculateJaccardSimilarity(userSkills, otherUserSkills);
            double interestSimilarity = calculateJaccardSimilarity(userInterests, otherUserInterests);
            
            // Calculate complementary skills (skills the other user has that current user doesn't)
            Set<String> complementarySkills = new HashSet<>(otherUserSkills);
            complementarySkills.removeAll(userSkills);
            double complementaryScore = complementarySkills.size() * 0.05; // Small bonus for complementary skills
            
            // Combine scores (skill similarity is most important)
            double totalScore = (skillSimilarity * 0.6) + (interestSimilarity * 0.3) + complementaryScore;
            
            userScores.put(otherUser, totalScore);
        }
        
        // Sort users by score and return top matches
        return userScores.entrySet().stream()
                .sorted(Map.Entry.<User, Double>comparingByValue().reversed())
                .limit(10) // Return top 10 matches
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
    
    /**
     * Find users with complementary skills (skills that the user doesn't have)
     * Useful for study groups or project collaborations
     */
    public List<User> findUsersWithComplementarySkills(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Get all users excluding the current user
        List<User> allUsers = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(userId))
                .collect(Collectors.toList());
        
        // Extract user skills
        Set<String> userSkills = extractAllSkills(user);
        
        // Score each user based on complementary skills
        Map<User, Double> userScores = new HashMap<>();
        
        for (User otherUser : allUsers) {
            Set<String> otherUserSkills = extractAllSkills(otherUser);
            
            // Calculate complementary skills (skills the other user has that current user doesn't)
            Set<String> complementarySkills = new HashSet<>(otherUserSkills);
            complementarySkills.removeAll(userSkills);
            
            // Also consider some common ground (shared skills)
            Set<String> commonSkills = new HashSet<>(otherUserSkills);
            commonSkills.retainAll(userSkills);
            
            // Score is based on complementary skills (higher weight) and some common skills
            double score = (complementarySkills.size() * 0.7) + (commonSkills.size() * 0.3);
            
            userScores.put(otherUser, score);
        }
        
        // Sort users by score and return top matches
        return userScores.entrySet().stream()
                .sorted(Map.Entry.<User, Double>comparingByValue().reversed())
                .limit(10) // Return top 10 matches
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
    
    /**
     * Find mentors for a user based on skills and experience
     */
    public List<User> findPotentialMentors(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Get all users excluding the current user
        List<User> allUsers = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(userId))
                .collect(Collectors.toList());
        
        // Extract user skills and interests
        Set<String> userSkills = extractAllSkills(user);
        Set<String> userInterests = new HashSet<>(user.getExtractedInterests());
        
        // Score each potential mentor
        Map<User, Double> mentorScores = new HashMap<>();
        
        for (User potentialMentor : allUsers) {
            Set<String> mentorSkills = extractAllSkills(potentialMentor);
            Set<String> mentorInterests = new HashSet<>(potentialMentor.getExtractedInterests());
            
            // Calculate how many of the user's skills the mentor has
            Set<String> matchedSkills = new HashSet<>(mentorSkills);
            matchedSkills.retainAll(userSkills);
            
            // Calculate interest overlap
            Set<String> matchedInterests = new HashSet<>(mentorInterests);
            matchedInterests.retainAll(userInterests);
            
            // Simple scoring formula
            double score = (matchedSkills.size() * 0.7) + (matchedInterests.size() * 0.3);
            
            // Only consider users with some skill overlap
            if (matchedSkills.size() > 0) {
                mentorScores.put(potentialMentor, score);
            }
        }
        
        // Sort users by score and return top matches
        return mentorScores.entrySet().stream()
                .sorted(Map.Entry.<User, Double>comparingByValue().reversed())
                .limit(5) // Return top 5 potential mentors
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
    
    /**
     * Extract all skills from a user (manual + NLP-extracted)
     */
    private Set<String> extractAllSkills(User user) {
        Set<String> allSkills = new HashSet<>();
        
        // Add manually entered skills
        if (user.getSkills() != null && !user.getSkills().isEmpty()) {
            String[] skillsArray = user.getSkills().toLowerCase().split(",");
            for (String skill : skillsArray) {
                allSkills.add(skill.trim());
            }
        }
        
        // Add NLP-extracted skills
        if (user.getExtractedSkills() != null) {
            allSkills.addAll(user.getExtractedSkills().stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList()));
        }
        
        return allSkills;
    }
    
    /**
     * Calculate Jaccard similarity between two sets
     * (size of intersection divided by size of union)
     */
    private double calculateJaccardSimilarity(Set<String> set1, Set<String> set2) {
        if (set1.isEmpty() && set2.isEmpty()) {
            return 0.0;
        }
        
        Set<String> intersection = new HashSet<>(set1);
        intersection.retainAll(set2);
        
        Set<String> union = new HashSet<>(set1);
        union.addAll(set2);
        
        return (double) intersection.size() / union.size();
    }
}
