package com.unihelp.user.dto;

import com.unihelp.user.entities.FriendshipStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendshipDTO {
    private Long id;
    private UserDTO requester;
    private UserDTO recipient;
    private LocalDateTime requestDate;
    private LocalDateTime acceptedDate;
    private FriendshipStatus status;
}
