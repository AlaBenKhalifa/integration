package com.unihelp.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Contains the results of NLP analysis performed on user bio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NlpAnalysisResult {
    private Long userId;
    private List<String> extractedSkills;
    private List<String> extractedInterests;
    private Map<String, Double> personalityTraits;
    private String dominantTrait;
}
