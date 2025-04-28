package com.unihelp.cours.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class EmbeddingService {

    private final WebClient geminiWebClient;
    private static final int BATCH_SIZE = 10;
    private static final long RATE_LIMIT_DELAY_MS = 1000;
    private static final String GEMINI_EMBEDDING_MODEL = "text-embedding-004"; // Updated model for embeddings
    private static final String GEMINI_CHAT_MODEL = "gemini-1.5-pro"; // Model for chat

    public EmbeddingService(
            @Value("${spring.ai.opener.key:}") String geminiApiKey,
            @Value("${spring.ai.opener.base-url:}") String geminiBaseUrl) {
        // Validate required properties
        if (geminiApiKey.isEmpty()) {
            throw new IllegalArgumentException("Gemini API key (spring.ai.opener.key) is required but not provided.");
        }
        if (geminiBaseUrl.isEmpty()) {
            throw new IllegalArgumentException("Gemini base URL (spring.ai.opener.base-url) is required but not provided.");
        }

        this.geminiWebClient = WebClient.builder()
                .baseUrl(geminiBaseUrl)
                .defaultHeader("x-goog-api-key", geminiApiKey)
                .build();
        System.out.println("Gemini API Key: " + geminiApiKey);
        System.out.println("Gemini Base URL: " + geminiBaseUrl);
    }

    public List<Double> getEmbedding(String input) {
        List<List<Double>> embeddings = getEmbeddings(List.of(input));
        return embeddings.isEmpty() ? List.of() : embeddings.get(0);
    }

    public List<List<Double>> getEmbeddings(List<String> inputs) {
        if (inputs.isEmpty()) {
            return List.of();
        }

        List<List<Double>> allEmbeddings = new ArrayList<>();
        for (int i = 0; i < inputs.size(); i += BATCH_SIZE) {
            List<String> batch = inputs.subList(i, Math.min(i + BATCH_SIZE, inputs.size()));
            for (String text : batch) {
                Map<String, Object> request = Map.of(
                        "model", "models/" + GEMINI_EMBEDDING_MODEL,
                        "content", Map.of(
                                "parts", List.of(
                                        Map.of("text", text)
                                )
                        )
                );

                try {
                    GeminiEmbeddingResponse response = geminiWebClient.post()
                            .uri("/v1/models/" + GEMINI_EMBEDDING_MODEL + ":embedContent")
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(GeminiEmbeddingResponse.class)
                            .block();
                    System.out.println("Gemini Embeddings Response: " + response);

                    if (response == null || response.getEmbedding() == null || response.getEmbedding().getValues() == null) {
                        throw new RuntimeException("Invalid embeddings response: 'embedding.values' is empty for text: " + text);
                    }

                    allEmbeddings.add(response.getEmbedding().getValues());

                    if (allEmbeddings.size() < inputs.size()) {
                        try {
                            Thread.sleep(RATE_LIMIT_DELAY_MS);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            throw new RuntimeException("Rate limiting interrupted", e);
                        }
                    }
                } catch (WebClientResponseException e) {
                    System.err.println("Error calling Gemini embeddings API: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
                    throw e;
                }
            }
        }
        return allEmbeddings;
    }

    public String getChatResponse(String prompt) {
        Map<String, Object> request = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", "You are a helpful assistant. " + prompt)
                                )
                        )
                )
        );

        try {
            GeminiChatResponse response = geminiWebClient.post()
                    .uri("/v1/models/" + GEMINI_CHAT_MODEL + ":generateContent")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(GeminiChatResponse.class)
                    .block();
            System.out.println("Gemini Chat Response: " + response);

            if (response == null || response.getCandidates() == null || response.getCandidates().isEmpty()) {
                throw new RuntimeException("Invalid chat response: 'candidates' is empty");
            }

            GeminiChatResponse.Candidate candidate = response.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                throw new RuntimeException("Invalid chat response: 'content.parts' is missing");
            }

            GeminiChatResponse.Part part = candidate.getContent().getParts().get(0);
            if (part.getText() == null) {
                throw new RuntimeException("Invalid chat response: 'text' is missing");
            }

            return part.getText();
        } catch (WebClientResponseException e) {
            System.err.println("Error calling Gemini chat API: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
            throw e;
        }
    }

    public static class GeminiEmbeddingResponse {
        private Embedding embedding;

        public Embedding getEmbedding() {
            return embedding;
        }

        public void setEmbedding(Embedding embedding) {
            this.embedding = embedding;
        }

        @Override
        public String toString() {
            return "GeminiEmbeddingResponse{embedding=" + embedding + "}";
        }
    }

    public static class Embedding {
        private List<Double> values;

        public List<Double> getValues() {
            return values;
        }

        public void setValues(List<Double> values) {
            this.values = values;
        }

        @Override
        public String toString() {
            return "Embedding{values=" + values + "}";
        }
    }

    public static class GeminiChatResponse {
        private List<Candidate> candidates;

        public List<Candidate> getCandidates() {
            return candidates;
        }

        public void setCandidates(List<Candidate> candidates) {
            this.candidates = candidates;
        }

        @Override
        public String toString() {
            return "GeminiChatResponse{candidates=" + candidates + "}";
        }

        public static class Candidate {
            private Content content;

            public Content getContent() {
                return content;
            }

            public void setContent(Content content) {
                this.content = content;
            }

            @Override
            public String toString() {
                return "Candidate{content=" + content + "}";
            }
        }

        public static class Content {
            private List<Part> parts;

            public List<Part> getParts() {
                return parts;
            }

            public void setParts(List<Part> parts) {
                this.parts = parts;
            }

            @Override
            public String toString() {
                return "Content{parts=" + parts + "}";
            }
        }

        public static class Part {
            private String text;

            public String getText() {
                return text;
            }

            public void setText(String text) {
                this.text = text;
            }

            @Override
            public String toString() {
                return "Part{text='" + text + "'}";
            }
        }
    }
}