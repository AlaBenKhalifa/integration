package com.unihelp.cours.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.unihelp.cours.enums.Category;
import com.unihelp.cours.model.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;


@Entity
@Getter
@Setter
@AllArgsConstructor
@Builder

public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String description;
    @Enumerated(EnumType.STRING)
    private Category category;
    private String level;
    private Double price;
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String thumbnailUrl;
    private Long userId;

    @Transient
    private User user;


    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Module> modules = new ArrayList<>();



    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
    public double getPrice() {
        return price != null ? price : 0.0;
    }
//jdida lel enrollment relation

    @OneToMany(mappedBy = "course")
    @JsonIgnore // Exclude enrollments from serialization
    private List<Enrollment> enrollments;

    // Constructor for ID
    public Course(Long id) {
        this.id = id;
    }

    // Default constructor
    public Course() {}
    public double getPrice(Course course) {
        return price != null ? price : 0.0;
    }
}

