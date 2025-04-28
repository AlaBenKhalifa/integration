package com.unihelp.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDTO {
    private Long id;
    private UserDTO sender;
    private UserDTO recipient;
    private String content;
    private LocalDateTime sentAt;
    private boolean read;
}
