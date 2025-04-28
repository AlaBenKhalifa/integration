package com.unihelp.user.dto;

import com.unihelp.user.entities.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProfileCompletionRequest {
    private Long userId;
    private String bio;
    private String skills;
    private UserRole role;
}
