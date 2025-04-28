package com.unihelp.cours.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class QuizService {
    private static final Logger logger = LoggerFactory.getLogger(QuizService.class);
    private final RestClient restClient;
    private final String openRouterApiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private static final String DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

    public QuizService(
            @Value("${spring.ai.openai.api-key}") String openRouterApiKey,
            @Value("${spring.ai.openai.model:meta-llama/llama-3.1-8b-instruct:free}") String model
    ) {
        this.restClient = RestClient.create();
        this.openRouterApiKey = openRouterApiKey;
        this.model = model != null && !model.isEmpty() ? model : DEFAULT_MODEL;
        this.objectMapper = new ObjectMapper();
        logger.info("Initialized QuizService with model: {}", this.model);
    }

    public String generateQuiz(String pdfText) {
        logger.info("Generating quiz with text length: {}, model: {}", pdfText.length(), model);
        String truncatedText = pdfText.length() > 3000 ? pdfText.substring(0, 3000) : pdfText;
        String promptText = "Based on the following text: \"" + truncatedText + "\"\n" +
                "Generate exactly 2 multiple-choice questions, each with 4 options, a correct answer, and a brief explanation. " +
                "Return the response as a JSON array only, with no additional text or commentary. " +
                "Ensure all string values, including the explanation field, are properly enclosed in double quotes and form valid JSON. " +
                "Do not include extra quotes within the explanation text itself. " +
                "Example format: [{\"question\": \"Sample question\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswer\": \"A\", \"explanation\": \"This is a sample explanation.\"}]";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + openRouterApiKey);
        headers.set("HTTP-Referer", "http://localhost:4200");
        headers.set("X-Title", "Unihelp Quiz Generator");

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "user", "content", promptText)
                )
        );

        try {
            logger.info("Sending request to OpenRouter: URI=https://openrouter.ai/api/v1/chat/completions, model={}, headers={}, body={}",
                    model, headers, objectMapper.writeValueAsString(body));
            String response = restClient.method(HttpMethod.POST)
                    .uri("https://openrouter.ai/api/v1/chat/completions")
                    .headers(h -> h.addAll(headers))
                    .body(body)
                    .retrieve()
                    .body(String.class);
            logger.info("Raw OpenRouter response: {}", response);

            // Check if response is valid JSON
            if (!response.trim().startsWith("{") && !response.trim().startsWith("[")) {
                logger.error("Received non-JSON response: {}", response.substring(0, Math.min(response.length(), 200)));
                throw new RuntimeException("OpenRouter returned non-JSON response: " + response.substring(0, Math.min(response.length(), 200)));
            }

            // Type-safe parsing
            Map<String, Object> responseMap = objectMapper.readValue(response, new TypeReference<Map<String, Object>>() {});
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseMap.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new RuntimeException("No choices in OpenRouter response");
            }
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) {
                throw new RuntimeException("No message in OpenRouter response");
            }
            String content = (String) message.get("content");
            if (content == null) {
                throw new RuntimeException("No content in OpenRouter response");
            }
            logger.info("Extracted content: {}", content);
            return content;
        } catch (HttpClientErrorException e) {
            logger.error("OpenRouter error: Status={}, Response={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalArgumentException("OpenRouter API error: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("Failed to generate quiz: {}", e.getMessage(), e);
            throw new RuntimeException("Quiz generation failed: " + e.getMessage(), e);
        }
    }
}