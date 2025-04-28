package com.unihelp.cours.service;

import java.util.List;

public interface VectorStore {

    void add(Long courseId, List<Double> embedding, String chunk);

    List<String> search(Long courseId, List<Double> queryVector, int k);

    List<SearchResult> searchWithScore(Long courseId, List<Double> queryVector, int k);

    class SearchResult {
        private final String chunk;
        private final double similarity;

        public SearchResult(String chunk, double similarity) {
            this.chunk = chunk;
            this.similarity = similarity;
        }

        public String getChunk() {
            return chunk;
        }

        public double getSimilarity() {
            return similarity;
        }
    }
}