package com.unihelp.cours.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class InMemoryVectorStore implements VectorStore {

    private final Map<Long, List<Entry>> store = new ConcurrentHashMap<>();

    private static class Entry {
        final List<Double> embedding;
        final String chunk;

        Entry(List<Double> embedding, String chunk) {
            this.embedding = embedding;
            this.chunk = chunk;
        }
    }

    @Override
    public void add(Long courseId, List<Double> embedding, String chunk) {
        store.computeIfAbsent(courseId, k -> new ArrayList<>())
                .add(new Entry(embedding, chunk));
    }

    @Override
    public List<String> search(Long courseId, List<Double> queryVector, int k) {
        List<SearchResult> results = searchWithScore(courseId, queryVector, k);
        return results.stream().map(SearchResult::getChunk).toList();
    }

    @Override
    public List<SearchResult> searchWithScore(Long courseId, List<Double> queryVector, int k) {
        List<Entry> entries = store.getOrDefault(courseId, List.of());
        List<SearchResult> results = new ArrayList<>();

        for (Entry entry : entries) {
            double similarity = cosineSimilarity(queryVector, entry.embedding);
            results.add(new SearchResult(entry.chunk, similarity));
        }

        return results.stream()
                .sorted((a, b) -> Double.compare(b.getSimilarity(), a.getSimilarity()))
                .limit(k)
                .toList();
    }

    private double cosineSimilarity(List<Double> vectorA, List<Double> vectorB) {
        if (vectorA.size() != vectorB.size()) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < vectorA.size(); i++) {
            dotProduct += vectorA.get(i) * vectorB.get(i);
            normA += Math.pow(vectorA.get(i), 2);
            normB += Math.pow(vectorB.get(i), 2);
        }

        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}