package com.unihelp.cours.controller;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import com.unihelp.cours.entities.Course;
import com.unihelp.cours.entities.Lesson;
import com.unihelp.cours.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {
    @Autowired
    private final CourseService courseService;
    private final EnrollmentService enrollmentService;

    //jdidaa el redis


    private final EmbeddingService embeddingService;
    private final VectorStore vectorStore;

    private final PdfService pdfService;


    //zedtha lel stripe
    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    //zedtha behc naffichi el key


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Course createCourse(@RequestBody Course course) {
        return courseService.createCourse(course);
    }


    @GetMapping("/{id}")
    public Course getCourse(@PathVariable Long id) {
        return courseService.getCourseWithInstructor(id);
    }


    @GetMapping("/instructor/{UserId}")
    public ResponseEntity<List<Course>> getCoursesByInstructor(@PathVariable Long UserId) {
        List<Course> courses = courseService.getCoursesByInstructor(UserId);
        return ResponseEntity.ok(courses);
    }

    @GetMapping
    public List<Course> getAllCourses(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String category
    ) {
        List<Course> courses = courseService.getAllCourses();

        // Filter by title
        if (title != null && !title.trim().isEmpty()) {
            final String searchTitle = title.trim().toLowerCase();
            courses = courses.stream()
                    .filter(c -> c.getTitle() != null && c.getTitle().toLowerCase().contains(searchTitle))
                    .collect(Collectors.toList());
        }

        // Filter by category
        if (category != null && !category.isEmpty()) {
            List<String> categories = Arrays.asList(category.split(","));
            courses = courses.stream()
                    .filter(c -> c.getCategory() != null && categories.contains(c.getCategory()))
                    .collect(Collectors.toList());
        }


        return courses;
    }

    @PutMapping("/{id}")
    public Course updateCourse(@PathVariable Long id, @RequestBody Course course) {
        return courseService.updateCourse(id, course);
    }


    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCourse(@PathVariable Long id) {
        courseService.deleteCourse(id);
    }


    //zedtha lel stripe
    @PostMapping("/{id}/create-checkout-session")
    public ResponseEntity<Map<String, String>> createCheckoutSession(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Stripe.apiKey = stripeSecretKey;

        try {
            Course course = courseService.getCourseWithInstructor(id);
            if (course == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Course not found"));
            }

            if (course.getPrice() == 0.0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "This is a free course. Use the free enrollment endpoint."));
            }

            Long userId = request.get("userId") != null ? Long.valueOf(request.get("userId").toString()) : null;
            String role = request.get("role") != null ? request.get("role").toString() : null;

            if (userId == null || role == null || !role.equals("STUDENT")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid user data. Must provide userId and role='student'."));
            }

            SessionCreateParams params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl("http://localhost:4200/success?session_id={CHECKOUT_SESSION_ID}&course_id=" + id)
                    .setCancelUrl("http://localhost:4200/cancel")
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(
                                            SessionCreateParams.LineItem.PriceData.builder()
                                                    .setCurrency("usd")
                                                    .setUnitAmount((long) (course.getPrice() * 100))
                                                    .setProductData(
                                                            SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                    .setName(course.getTitle())
                                                                    .build()
                                                    )
                                                    .build()
                                    )
                                    .build()
                    )
                    .putMetadata("userId", userId.toString())
                    .putMetadata("courseId", id.toString())
                    .build();

            Session session = Session.create(params);
            Map<String, String> responseData = new HashMap<>();
            responseData.put("sessionId", session.getId());
            return ResponseEntity.ok(responseData);

        } catch (StripeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create checkout session: " + e.getMessage()));
        }
    }


    ///  jdidaa
    // Get course details (no DTOs)
    // Get course details
    // Get course details
    @GetMapping("/{id}/details")
    public ResponseEntity<Map<String, Object>> getCourseDetails(@PathVariable Long id, @RequestParam Long userId) {
        Course course = courseService.findById(id).orElseThrow(() -> new RuntimeException("Course not found"));
        boolean isEnrolled = courseService.isUserEnrolled(userId, id);
        Map<String, Object> courseMap = new HashMap<>();
        courseMap.put("id", course.getId());
        courseMap.put("title", course.getTitle());
        courseMap.put("description", course.getDescription());
        courseMap.put("price", course.getPrice());
        courseMap.put("category", course.getCategory());
        courseMap.put("level", course.getLevel());
        courseMap.put("thumbnailUrl", course.getThumbnailUrl());
        courseMap.put("modules", course.getModules().stream().map(module -> {
            Map<String, Object> moduleMap = new HashMap<>();
            moduleMap.put("id", module.getId());
            moduleMap.put("title", module.getTitle());
            moduleMap.put("description", module.getDescription());
            List<Lesson> lessons = module.getLessons() != null ? module.getLessons() : new ArrayList<>();
            moduleMap.put("lessons", lessons.stream().map(lesson -> {
                Map<String, Object> lessonMap = new HashMap<>();
                lessonMap.put("id", lesson.getId());
                lessonMap.put("title", lesson.getTitle());
                lessonMap.put("description", lesson.getDescription());
                lessonMap.put("thumbnailUrl", lesson.getThumbnailUrl());
                if (isEnrolled) {
                    lessonMap.put("contentUrl", lesson.getContentUrl() != null ? "http://localhost:8888/COURS" + lesson.getContentUrl() : null);
                    lessonMap.put("contentType", lesson.getContentType());
                }
                return lessonMap;
            }).collect(Collectors.toList()));
            return moduleMap;
        }).collect(Collectors.toList()));
        return ResponseEntity.ok(courseMap);
    }

    // Enrollment status w testit bihaa
    @GetMapping("/{id}/enrollment-status")
    public ResponseEntity<Map<String, Boolean>> getEnrollmentStatus(@PathVariable Long id, @RequestParam Long userId) {
        Optional<Course> course = courseService.findById(id);
        boolean isEnrolled = courseService.isUserEnrolled(userId, id);

        Map<String, Boolean> response = new HashMap<>();
        response.put("isEnrolled", isEnrolled);
        return ResponseEntity.ok(response);
    }

    //heth yjdida behc nhel fiha mochkelti maaa el status enrolles false
    @PostMapping("/enrollments/confirm")
    public ResponseEntity<String> confirmEnrollment(@RequestBody Map<String, String> request) {
        try {
            String sessionId = request.get("sessionId");
            Stripe.apiKey = stripeSecretKey;

            // Retrieve Stripe session to verify payment
            Session session = Session.retrieve(sessionId);
            if (!"paid".equals(session.getPaymentStatus())) {
                return ResponseEntity.badRequest().body("Payment not completed");
            }

            String userId = session.getMetadata().get("userId");
            String courseId = session.getMetadata().get("courseId");

            // Enroll the user
            enrollmentService.enroll(Long.valueOf(userId), Long.valueOf(courseId));

            return ResponseEntity.ok("Enrollment successful");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to confirm enrollment: " + e.getMessage());
        }
    }

    @GetMapping("/enrollments/check")
    public boolean isEnrolled(@RequestParam Long courseId, @RequestParam Long userId) {
        return enrollmentService.isEnrolled(userId, courseId);
    }

    @GetMapping("/courses/enrolled")
    public ResponseEntity<Object> getEnrolledCourses(@RequestParam Long userId) {
        try {
            List<Course> enrolledCourses = courseService.getEnrolledCourses(userId);
            return ResponseEntity.ok(enrolledCourses);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("details", "Failed to fetch enrolled courses: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    /// chatbot test
    @PostMapping(value = "/{courseId}/chatbot", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> chatbotQuery(@PathVariable Long courseId, @RequestBody String question) {
        try {
            // Validate question
            if (question == null || question.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question cannot be empty"));
            }
            System.out.println("Processing question for course " + courseId + ": " + question);

            // Fetch course details
            Course course = courseService.findById(courseId)
                    .orElseThrow(() -> new RuntimeException("Course not found"));
            System.out.println("Fetched course: " + course.getTitle());

            System.out.println("Embedding question...");
            List<Double> queryVector;
            try {
                queryVector = embeddingService.getEmbedding(question);
            } catch (Exception e) {
                System.err.println("Failed to embed question: " + e.getMessage());
                throw new RuntimeException("Failed to embed question: " + e.getMessage() + ". The Gemini API endpoint may be incorrect. Expected endpoint: 'https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent'. Check EmbeddingService configuration.", e);
            }
            System.out.println("Question embedded successfully. Searching vector store...");
            List<VectorStore.SearchResult> searchResults = vectorStore.searchWithScore(courseId, queryVector, 3);
            List<String> relevantChunks = new ArrayList<>();
            double SIMILARITY_THRESHOLD = 0.5; // Cosine similarity threshold

            if (!searchResults.isEmpty()) {
                System.out.println("Found " + searchResults.size() + " search results in vector store.");
                for (VectorStore.SearchResult result : searchResults) {
                    if (result.getSimilarity() >= SIMILARITY_THRESHOLD) {
                        relevantChunks.add(result.getChunk());
                    }
                }

                if (relevantChunks.isEmpty()) {
                    System.out.println("No relevant chunks found after applying similarity threshold.");
                    return ResponseEntity.ok(Map.of("answer", "I couldn't find relevant information in the course PDF. Try rephrasing your question or ask about a different topic."));
                }

                String context = String.join("\n\n", relevantChunks);
                String prompt = "CONTEXT:\n" + context + "\n\nINSTRUCTION:\nOnly answer based on this context. If the answer cannot be found in the context, say 'I don't know.'\n\nQUESTION:\n" + question;

                System.out.println("Chatbot Prompt: " + prompt);
                String answer;
                try {
                    answer = embeddingService.getChatResponse(prompt);
                } catch (Exception e) {
                    System.err.println("Failed to get chat response: " + e.getMessage());
                    throw new RuntimeException("Failed to get chat response: " + e.getMessage() + ". The Gemini API chat endpoint may be incorrect. Expected endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent'. Check EmbeddingService configuration.", e);
                }
                System.out.println("Chatbot Response: " + answer);
                return ResponseEntity.ok(Map.of("answer", answer));
            }

            System.out.println("No embeddings found in vector store. Processing PDFs...");
            List<String> allChunks = new ArrayList<>();
            boolean hasContent = false;

            if (course.getModules() != null && !course.getModules().isEmpty()) {
                for (var module : course.getModules()) {
                    if (module.getLessons() != null && !module.getLessons().isEmpty()) {
                        for (var lesson : module.getLessons()) {
                            String contentUrl = lesson.getContentUrl();
                            if (contentUrl != null && lesson.getContentType().equals("pdf")) {
                                hasContent = true;
                                String fileName = contentUrl.startsWith("/COURS/uploads/")
                                        ? contentUrl.replace("/COURS/uploads/", "")
                                        : contentUrl;
                                String pdfPath = "/src/main/resources/uploads/" + fileName;
                                File pdfFile = new File(pdfPath);
                                if (!pdfFile.exists()) {
                                    System.err.println("PDF file not found for lesson " + lesson.getId() + " at: " + pdfPath);
                                    continue;
                                }
                                try {
                                    List<String> chunks = pdfService.extractChunks(pdfPath);
                                    allChunks.addAll(chunks);
                                    System.out.println("Extracted " + chunks.size() + " chunks from PDF: " + pdfPath);
                                } catch (IOException e) {
                                    System.err.println("Failed to process PDF for lesson " + lesson.getId() + ": " + e.getMessage());
                                }
                            }
                        }
                    }
                }
            }

            if (!hasContent) {
                System.out.println("No PDF content found for this course.");
                return ResponseEntity.badRequest().body(Map.of("error", "No PDF content found for this course"));
            }

            if (allChunks.isEmpty()) {
                System.out.println("No valid content extracted from the course PDFs.");
                return ResponseEntity.badRequest().body(Map.of("error", "No valid content extracted from the course PDFs"));
            }

            // Embed all chunks using Gemini
            System.out.println("Embedding " + allChunks.size() + " chunks...");
            List<List<Double>> embeddings;
            try {
                embeddings = embeddingService.getEmbeddings(allChunks);
            } catch (Exception e) {
                System.err.println("Failed to embed PDF chunks: " + e.getMessage());
                throw new RuntimeException("Failed to embed PDF chunks: " + e.getMessage() + ". The Gemini API endpoint may be incorrect. Expected endpoint: 'https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent'. Check EmbeddingService configuration.", e);
            }
            System.out.println("Embedded " + embeddings.size() + " chunks successfully.");
            for (int i = 0; i < allChunks.size(); i++) {
                try {
                    vectorStore.add(courseId, embeddings.get(i), allChunks.get(i));
                } catch (Exception e) {
                    System.err.println("Failed to store embedding for chunk: " + e.getMessage());
                }
            }

            System.out.println("Searching vector store for relevant chunks...");
            searchResults = vectorStore.searchWithScore(courseId, queryVector, 3);
            relevantChunks = new ArrayList<>();
            for (VectorStore.SearchResult result : searchResults) {
                if (result.getSimilarity() >= SIMILARITY_THRESHOLD) {
                    relevantChunks.add(result.getChunk());
                }
            }

            if (relevantChunks.isEmpty()) {
                System.out.println("No relevant chunks found after applying similarity threshold.");
                return ResponseEntity.ok(Map.of("answer", "I couldn't find relevant information in the course PDF. Try rephrasing your question or ask about a different topic."));
            }

            String context = String.join("\n\n", relevantChunks);
            String prompt = "CONTEXT:\n" + context + "\n\nINSTRUCTION:\nOnly answer based on this context. If the answer cannot be found in the context, say 'I don't know.'\n\nQUESTION:\n" + question;

            System.out.println("Chatbot Prompt: " + prompt);
            String answer;
            try {
                answer = embeddingService.getChatResponse(prompt);
            } catch (Exception e) {
                System.err.println("Failed to get chat response: " + e.getMessage());
                throw new RuntimeException("Failed to get chat response: " + e.getMessage() + ". The Gemini API chat endpoint may be incorrect. Expected endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent'. Check EmbeddingService configuration.", e);
            }
            System.out.println("Chatbot Response: " + answer);
            return ResponseEntity.ok(Map.of("answer", answer));

        } catch (Exception e) {
            System.err.println("Exception in chatbotQuery: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error processing question: " + e.getMessage()));
        }
    }








    @Autowired
    private RecommendationService recommendationService;

    @GetMapping("/recommend")
    public List<Course> recommendCourses(
            @RequestParam Long userId,
            @RequestParam(required = false) String courseTitle,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "3") int numRec) {
        return recommendationService.recommendCourses(userId, courseTitle, skill, category, numRec);
    }


















}