package com.unihelp.user.controllers;

import com.unihelp.user.dto.NlpAnalysisResult;
import com.unihelp.user.services.NlpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for NLP-related operations
 */
@RestController
@RequestMapping("/api/nlp")
@RequiredArgsConstructor
public class NlpController {

    private final NlpService nlpService;
    
    /**
     * Analyze the bio of a user with the given ID
     * 
     * @param userId ID of the user whose bio to analyze
     * @return NLP analysis results
     */
    @PostMapping("/analyze/{userId}")
    public ResponseEntity<NlpAnalysisResult> analyzeBio(@PathVariable Long userId) {
        NlpAnalysisResult result = nlpService.analyzeBio(userId);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Analyze provided text without saving results
     * 
     * @param text Text to analyze
     * @return NLP analysis results
     */
    @PostMapping("/analyze-text")
    public ResponseEntity<NlpAnalysisResult> analyzeText(@RequestBody String text) {
        NlpAnalysisResult result = nlpService.analyzeText(text);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Get the stored NLP analysis for a user
     * 
     * @param userId ID of the user
     * @return NLP analysis results
     */
    @GetMapping("/{userId}")
    public ResponseEntity<NlpAnalysisResult> getUserAnalysis(@PathVariable Long userId) {
        NlpAnalysisResult result = nlpService.analyzeBio(userId);
        return ResponseEntity.ok(result);
    }
}
