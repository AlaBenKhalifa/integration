package com.unihelp.cours.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PdfService {
    private static final Logger logger = LoggerFactory.getLogger(PdfService.class);
    private static final String UPLOAD_DIR = "/src/main/resources/uploads/";

    public String extractText(String filename) throws Exception {
        logger.info("Extracting text from PDF: {}", filename);
        File file = new File(UPLOAD_DIR + filename);
        if (!file.exists()) {
            logger.error("PDF not found: {}", filename);
            throw new Exception("PDF not found: " + filename);
        }
        try (PDDocument doc = PDDocument.load(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(5, doc.getNumberOfPages()));
            String text = stripper.getText(doc);
            logger.info("Extracted text length: {}", text.length());
            return text.length() > 5000 ? text.substring(0, 5000) : text;
        } catch (Exception e) {
            logger.error("Failed to extract text from {}: {}", filename, e.getMessage(), e);
            throw e;
        }
    }

    public List<String> listPdfs() {
        logger.info("Listing PDFs in {}", UPLOAD_DIR);
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists() || !dir.isDirectory()) {
            logger.warn("Upload directory {} does not exist or is not a directory", UPLOAD_DIR);
            return List.of();
        }
        List<String> pdfs = Arrays.stream(dir.listFiles((f, name) -> name.toLowerCase().endsWith(".pdf")))
                .map(File::getName)
                .collect(Collectors.toList());
        logger.info("Found {} PDFs", pdfs.size());
        return pdfs;
    }
    public List<String> extractChunks(String filePath) throws IOException {
        File pdfFile = new File(filePath);
        if (!pdfFile.exists()) {
            throw new IOException("PDF file not found at: " + filePath);
        }
        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return splitTextIntoChunks(text, 500);
        }
    }

    private List<String> splitTextIntoChunks(String text, int chunkSize) {
        List<String> chunks = new ArrayList<>();
        for (int start = 0; start < text.length(); start += chunkSize) {
            int end = Math.min(start + chunkSize, text.length());
            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty()) {
                chunks.add(chunk);
            }
        }
        return chunks;
    }
}