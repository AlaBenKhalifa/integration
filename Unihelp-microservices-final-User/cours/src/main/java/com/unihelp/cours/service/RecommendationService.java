package com.unihelp.cours.service;

import com.unihelp.cours.entities.Course;
import com.unihelp.cours.entities.Enrollment;
import com.unihelp.cours.repository.CourseRepository;
import com.unihelp.cours.repository.EnrollmentRepository;
import opennlp.tools.stemmer.PorterStemmer;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.factory.Nd4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {
    @Autowired
    private CourseRepository courseRepository;
    @Autowired
    private EnrollmentRepository enrollmentRepository;

    private INDArray cosineSimilarityMatrix;
    private List<Course> courses;
    private Map<String, Integer> wordToIndex;
    private List<String> vocabulary;

    public void init() {
        courses = courseRepository.findAll();
        if (courses.isEmpty()) return;

        wordToIndex = new HashMap<>();
        vocabulary = new ArrayList<>();
        List<List<String>> tokenizedTitles = courses.stream()
                .map(course -> tokenizeAndStem(course.getTitle()))
                .collect(Collectors.toList());

        tokenizedTitles.forEach(tokens -> tokens.forEach(word -> {
            if (!wordToIndex.containsKey(word)) {
                wordToIndex.put(word, vocabulary.size());
                vocabulary.add(word);
            }
        }));

        int numDocs = courses.size();
        int numTerms = vocabulary.size();
        INDArray tfidfMatrix = Nd4j.zeros(numDocs, numTerms);

        for (int i = 0; i < numDocs; i++) {
            List<String> tokens = tokenizedTitles.get(i);
            Map<String, Integer> termFreq = new HashMap<>();
            tokens.forEach(token -> termFreq.put(token, termFreq.getOrDefault(token, 0) + 1));

            for (Map.Entry<String, Integer> entry : termFreq.entrySet()) {
                String term = entry.getKey();
                int tf = entry.getValue();
                int docFreq = (int) tokenizedTitles.stream()
                        .filter(doc -> doc.contains(term))
                        .count();
                double idf = Math.log((double) numDocs / (docFreq + 1));
                tfidfMatrix.putScalar(i, wordToIndex.get(term), tf * idf);
            }
        }

        cosineSimilarityMatrix = computeCosineSimilarity(tfidfMatrix);
    }

    private List<String> tokenizeAndStem(String text) {
        PorterStemmer stemmer = new PorterStemmer();
        return Arrays.stream(text.toLowerCase()
                        .replaceAll("[^a-zA-Z0-9\\s]", "")
                        .split("\\s+"))
                .filter(word -> !isStopWord(word))
                .map(word -> (String) stemmer.stem(word))
                .collect(Collectors.toList());
    }

    private boolean isStopWord(String word) {
        Set<String> stopWords = Set.of("a", "an", "the", "and", "or", "in", "on", "at", "to");
        return stopWords.contains(word);
    }

    private INDArray computeCosineSimilarity(INDArray matrix) {
        INDArray norm = matrix.norm2(1).reshape(matrix.rows(), 1);
        INDArray normalized = matrix.div(norm);
        return normalized.mmul(normalized.transpose());
    }

    public List<Course> recommendCourses(Long userId, String courseTitle, String skill, String category, int numRec) {
        if (cosineSimilarityMatrix == null) init();
        if (courses.isEmpty()) return Collections.emptyList();

        List<Enrollment> enrollments = enrollmentRepository.findByUserId(userId);
        List<Long> enrolledCourseIds = enrollments.stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toList());

        int courseIndex = -1;
        for (int i = 0; i < courses.size(); i++) {
            if (courses.get(i).getTitle().equalsIgnoreCase(courseTitle)) {
                courseIndex = i;
                break;
            }
        }

        List<Course> recommendations;
        if (courseIndex == -1) {
            recommendations = recommendBasedOnEnrollments(userId, enrolledCourseIds, skill, category, numRec);
        } else {
            recommendations = recommendBasedOnSimilarity(courseIndex, skill, category, numRec, enrolledCourseIds);
        }

        return recommendations;
    }

    private List<Course> recommendBasedOnSimilarity(int courseIndex, String skill, String category, int numRec, List<Long> enrolledCourseIds) {
        List<Map.Entry<Integer, Double>> scores = new ArrayList<>();
        for (int i = 0; i < cosineSimilarityMatrix.shape()[1]; i++) {
            if (i != courseIndex) {
                scores.add(new AbstractMap.SimpleEntry<>(i, cosineSimilarityMatrix.getDouble(courseIndex, i)));
            }
        }
        scores.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<Course> recommendations = new ArrayList<>();
        for (Map.Entry<Integer, Double> score : scores.subList(0, Math.min(10, scores.size()))) {
            Course course = courses.get(score.getKey());
            boolean matchesSkill = skill == null || course.getLevel().equalsIgnoreCase(skill);
            boolean matchesCategory = category == null || course.getCategory().name().equalsIgnoreCase(category);
            if (matchesSkill && matchesCategory && !enrolledCourseIds.contains(course.getId())) {
                recommendations.add(course);
            }
            if (recommendations.size() >= numRec) break;
        }
        return rankRecommendations(recommendations);
    }

    private List<Course> recommendBasedOnEnrollments(Long userId, List<Long> enrolledCourseIds, String skill, String category, int numRec) {
        List<Course> recommendations = new ArrayList<>();
        Map<Long, Double> courseScores = new HashMap<>();

        for (Long courseId : enrolledCourseIds) {
            Course course = courseRepository.findById(courseId).orElse(null);
            if (course == null) continue;
            int courseIndex = courses.indexOf(course);
            if (courseIndex == -1) continue;

            for (int i = 0; i < cosineSimilarityMatrix.shape()[1]; i++) {
                if (i != courseIndex && !enrolledCourseIds.contains(courses.get(i).getId())) {
                    Course otherCourse = courses.get(i);
                    boolean matchesSkill = skill == null || otherCourse.getLevel().equalsIgnoreCase(skill);
                    boolean matchesCategory = category == null || otherCourse.getCategory().name().equalsIgnoreCase(category);
                    if (matchesSkill && matchesCategory) {
                        double score = cosineSimilarityMatrix.getDouble(courseIndex, i);
                        courseScores.put(otherCourse.getId(), courseScores.getOrDefault(otherCourse.getId(), 0.0) + score);
                    }
                }
            }
        }

        List<Map.Entry<Long, Double>> sortedScores = new ArrayList<>(courseScores.entrySet());
        sortedScores.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        for (Map.Entry<Long, Double> entry : sortedScores) {
            Course course = courseRepository.findById(entry.getKey()).orElse(null);
            if (course != null) {
                recommendations.add(course);
            }
            if (recommendations.size() >= numRec) break;
        }
        return rankRecommendations(recommendations);
    }

    private List<Course> rankRecommendations(List<Course> recommendations) {
        long maxEnrolled = recommendations.stream()
                .mapToLong(course -> enrollmentRepository.findByCourseId(course.getId()).size())
                .max().orElse(1000000);

        List<Map.Entry<Course, Double>> scoredCourses = recommendations.stream()
                .map(course -> {
                    long enrolledCount = enrollmentRepository.findByCourseId(course.getId()).size();
                    double normEnrolled = enrolledCount / (double) maxEnrolled;
                    return new AbstractMap.SimpleEntry<>(course, normEnrolled);
                })
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .collect(Collectors.toList());

        return scoredCourses.stream().map(Map.Entry::getKey).collect(Collectors.toList());
    }
}