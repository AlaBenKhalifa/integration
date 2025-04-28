package com.unihelp.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    @Builder.Default
    private String token = "";
    @Builder.Default
    private String type = "Bearer";
    private Long id;
    private String email;
    private String role;
    private boolean profileCompleted;
    private boolean newUser;
}
