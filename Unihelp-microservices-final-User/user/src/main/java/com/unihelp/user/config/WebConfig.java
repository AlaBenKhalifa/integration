package com.unihelp.user.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // CORS configuration is now handled by the API Gateway
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Empty implementation as CORS is handled by the gateway
    }
}
