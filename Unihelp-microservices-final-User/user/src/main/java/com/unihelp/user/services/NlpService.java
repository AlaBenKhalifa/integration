package com.unihelp.user.services;

import com.unihelp.user.dto.NlpAnalysisResult;
import com.unihelp.user.entities.User;
import com.unihelp.user.repositories.UserRepository;
import edu.stanford.nlp.pipeline.*;
import edu.stanford.nlp.ling.*;
import edu.stanford.nlp.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for analyzing user bio text using NLP techniques
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class NlpService {
    
    private final UserRepository userRepository;
    
    // Common skills that might be mentioned in bios
    private static final Set<String> COMMON_SKILLS = new HashSet<>(Arrays.asList(
        "java", "python", "javascript", "typescript", "angular", "react", "node", "spring", 
        "programming", "development", "software", "web", "mobile", "coding", "app", 
        "database", "sql", "nosql", "mongodb", "mysql", "postgresql", "oracle", "frontend", "backend",
        "fullstack", "ai", "machine learning", "data science", "deep learning", "nlp", "cloud",
        "aws", "azure", "gcp", "devops", "docker", "kubernetes", "microservices", 
        "leadership", "management", "communication", "teamwork", "problem solving", 
        "critical thinking", "creativity", "research", "analysis", "writing", "presentation",
        "physics", "chemistry", "biology", "mathematics", "engineering", "teaching", "tutoring"
    ));
    
    // Common interests that might be mentioned in bios
    private static final Set<String> COMMON_INTERESTS = new HashSet<>(Arrays.asList(
        "reading", "writing", "traveling", "music", "sports", "fitness", "yoga", "meditation", 
        "cooking", "baking", "photography", "art", "painting", "drawing", "design", "movies", 
        "series", "tv shows", "theatre", "hiking", "biking", "cycling", "swimming", "running", 
        "jogging", "gaming", "video games", "board games", "chess", "volunteering", "community service",
        "environment", "sustainability", "climate", "politics", "history", "psychology", 
        "philosophy", "languages", "culture", "travel", "exploration", "adventure", "technology",
        "innovation", "science", "research", "learning", "education", "teaching", "mentoring"
    ));
    
    // Personality trait keywords
    private static final Map<String, List<String>> PERSONALITY_TRAITS = Map.of(
        "analytical", List.of("analytical", "logical", "systematic", "rational", "methodical", "detail-oriented", 
                           "precise", "thorough", "critical", "research", "study", "examine", "investigate"),
        "creative", List.of("creative", "innovative", "artistic", "imaginative", "original", "inventive", 
                          "design", "create", "build", "craft", "develop", "vision", "idea"),
        "leadership", List.of("leadership", "leader", "manager", "direct", "guide", "mentor", "initiative", 
                           "responsibility", "decision", "authority", "influence", "motivate", "inspire"),
        "team-oriented", List.of("team", "collaborate", "cooperation", "group", "together", "community", 
                               "support", "assist", "help", "share", "contribute", "partnership"),
        "detail-oriented", List.of("detail", "precise", "thorough", "meticulous", "careful", "accurate", 
                                "exact", "perfectionist", "organized", "structured", "methodical"),
        "adaptable", List.of("adaptable", "flexible", "versatile", "adjust", "change", "dynamic", 
                           "evolving", "agile", "responsive", "open-minded")
    );
    
    // Cache the pipeline as it's expensive to initialize
    private StanfordCoreNLP pipeline;
    
    /**
     * Initialize the NLP pipeline
     */
    private synchronized StanfordCoreNLP getPipeline() {
        if (pipeline == null) {
            Properties props = new Properties();
            props.setProperty("annotators", "tokenize,ssplit,pos,lemma,ner");
            pipeline = new StanfordCoreNLP(props);
            log.info("Stanford CoreNLP pipeline initialized");
        }
        return pipeline;
    }
    
    /**
     * Analyze the bio text of a user and extract skills, interests, and personality traits
     * 
     * @param userId The ID of the user whose bio to analyze
     * @return The analysis result containing extracted information
     */
    public NlpAnalysisResult analyzeBio(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        
        String bioText = user.getBio();
        if (bioText == null || bioText.trim().isEmpty()) {
            return NlpAnalysisResult.builder()
                    .userId(userId)
                    .extractedSkills(Collections.emptyList())
                    .extractedInterests(Collections.emptyList())
                    .personalityTraits(Collections.emptyMap())
                    .build();
        }
        
        NlpAnalysisResult result = analyzeText(bioText);
        result.setUserId(userId);
        
        // Update the user entity with the analysis results
        user.setExtractedSkills(result.getExtractedSkills());
        user.setExtractedInterests(result.getExtractedInterests());
        user.setPersonalityTraits(result.getPersonalityTraits());
        user.setDominantTrait(result.getDominantTrait());
        userRepository.save(user);
        
        return result;
    }
    
    /**
     * Analyze text to extract skills, interests, and personality traits
     * 
     * @param text The text to analyze
     * @return Analysis results
     */
    public NlpAnalysisResult analyzeText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return NlpAnalysisResult.builder()
                    .extractedSkills(Collections.emptyList())
                    .extractedInterests(Collections.emptyList())
                    .personalityTraits(Collections.emptyMap())
                    .build();
        }
        
        String lowerText = text.toLowerCase();
        
        // Process the text with CoreNLP
        Annotation document = new Annotation(text);
        getPipeline().annotate(document);
        
        // Extract skills and interests based on word matching
        List<String> extractedSkills = extractKeywords(lowerText, COMMON_SKILLS);
        List<String> extractedInterests = extractKeywords(lowerText, COMMON_INTERESTS);
        
        // Analyze personality traits based on keyword frequency
        Map<String, Double> personalityTraits = analyzePersonalityTraits(lowerText);
        
        // Find the dominant trait (highest score)
        String dominantTrait = personalityTraits.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
        
        return NlpAnalysisResult.builder()
                .extractedSkills(extractedSkills)
                .extractedInterests(extractedInterests)
                .personalityTraits(personalityTraits)
                .dominantTrait(dominantTrait)
                .build();
    }
    
    /**
     * Extract keywords that match a given set of target keywords
     */
    private List<String> extractKeywords(String text, Set<String> targetKeywords) {
        Set<String> found = new HashSet<>();
        
        for (String keyword : targetKeywords) {
            // Check for word boundaries to avoid partial matches
            String pattern = "\\b" + Pattern.quote(keyword) + "\\b";
            if (Pattern.compile(pattern).matcher(text).find()) {
                found.add(keyword);
            }
        }
        
        return found.stream()
                .sorted()
                .collect(Collectors.toList());
    }
    
    /**
     * Analyze text for personality traits based on keyword frequency
     */
    private Map<String, Double> analyzePersonalityTraits(String text) {
        Map<String, Double> traitScores = new HashMap<>();
        
        // Initialize all traits with a base score
        PERSONALITY_TRAITS.keySet().forEach(trait -> traitScores.put(trait, 0.0));
        
        // Count occurrences of trait keywords
        for (Map.Entry<String, List<String>> entry : PERSONALITY_TRAITS.entrySet()) {
            String trait = entry.getKey();
            List<String> keywords = entry.getValue();
            
            double score = 0.0;
            for (String keyword : keywords) {
                // Check for whole word matches
                String pattern = "\\b" + Pattern.quote(keyword) + "\\b";
                java.util.regex.Matcher matcher = Pattern.compile(pattern).matcher(text);
                
                while (matcher.find()) {
                    score += 1.0;
                }
            }
            
            // Normalize by the number of keywords for this trait
            if (score > 0) {
                score = score / keywords.size();
                traitScores.put(trait, score);
            }
        }
        
        return traitScores;
    }
}
