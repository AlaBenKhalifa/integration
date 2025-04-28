package com.unihelp.Blog.controllers;

import com.unihelp.Blog.utils.FileUploadUtil;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.io.IOException;

@RestController
@RequestMapping("/api/blog")
public class ImageUploadController {

    private static final String UPLOAD_DIR = "/app/blogs";

    @PostMapping("/upload-image")
    public ResponseEntity<String> uploadImage(@RequestParam("image") MultipartFile image) throws IOException {
        // Generate a unique image name
        String imageName = System.currentTimeMillis() + "-" + image.getOriginalFilename();

        // Define the directory where the image will be saved
        String uploadDir = "/app/blogs";// You can change this if needed

        // Save the image to the directory
        FileUploadUtil.saveFile(uploadDir, imageName, image);

        System.out.println("Saving image to: " + uploadDir + "/" + imageName);

        // Return the image name to the frontend
        return new ResponseEntity<>(imageName, HttpStatus.OK);
    }

    @GetMapping("/images/{imageName}")
    public ResponseEntity<Resource> serveImage(@PathVariable String imageName) {
        try {
            // Construct the file path
            Path filePath = Paths.get(UPLOAD_DIR).resolve(imageName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            // Check if the file exists and is readable
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_JPEG) // Adjust based on image type
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
