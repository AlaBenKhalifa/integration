package com.unihelp.cours.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihelp.cours.model.QuizQuestion;
import com.unihelp.cours.service.PdfService;
import com.unihelp.cours.service.QuizService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/courses/quiz")
public class QuizController {
    private static final Logger logger = LoggerFactory.getLogger(QuizController.class);
    private final PdfService pdfService;
    private final QuizService quizService;
    private final ObjectMapper objectMapper;

    public QuizController(PdfService pdfService, QuizService quizService, ObjectMapper objectMapper) {
        this.pdfService = pdfService;
        this.quizService = quizService;
        this.objectMapper = objectMapper;
    }
//pdf generation of all courses bbelow
    @GetMapping("/pdfs")
    public List<String> getAvailablePdfs() {
        logger.info("Fetching available PDFs");
        return pdfService.listPdfs();
    }

    @GetMapping("/generate/{filename}")
    public List<QuizQuestion> generateQuiz(@PathVariable String filename) {
        logger.info("Generating quiz for {}", filename);
        try {
            String text = pdfService.extractText(filename);
            String content = quizService.generateQuiz(text);

            // Sanitize JSON to fix extra quotes in explanation
            String sanitizedJson = sanitizeJson(content);
            List<QuizQuestion> questions = objectMapper.readValue(sanitizedJson, objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, QuizQuestion.class));
            logger.info("Generated {} questions for {}", questions.size(), filename);
            return questions;
        } catch (IllegalArgumentException e) {
            logger.error("Quiz generation failed for {}: {}", filename, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Failed to generate quiz for {}: {}", filename, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Quiz generation failed: " + e.getMessage(), e);
        }
    }

    private String sanitizeJson(String json) {
        // Fix extra quotes in explanation field
        String sanitized = json.replaceAll(
                "\"explanation\":\\s*\"\\\"([^\\\"]+)\\\"([^\\\"]*)\"\\s*",
                "\"explanation\": \"$1$2\""
        );
        logger.debug("Sanitized JSON: {}", sanitized);
        return sanitized;
    }
}