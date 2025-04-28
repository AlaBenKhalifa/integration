package com.unihelp.Blog.repositories;
import com.unihelp.Blog.entities.Blog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogRepository extends JpaRepository<Blog, Long>{

}