package com.unihelp.Blog.model;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter @Setter @ToString
public class User {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    private String profileImage;
    public Object getRole() {
        return role;
    }


    public Long getId() {
        return id;
    }

    public String getProfileImage(){
        return profileImage;
    }

    public void setProfileImage(String profileImage){
        this.profileImage = profileImage;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }


}
