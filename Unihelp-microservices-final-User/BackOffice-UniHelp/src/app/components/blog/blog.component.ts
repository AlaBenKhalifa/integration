import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../services/blog.service';
import { Blog } from '../../services/blog.service';
import { CommonModule } from '@angular/common';
import { PopupService } from '../../services/popup.service';
import { PopupComponent } from '../popup/popup.component'; // Verify path

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, PopupComponent],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent implements OnInit {
  blogs: Blog[] = [];
  filteredBlogs: Blog[] = [];
  errorMessage: string | null = null;

  constructor(
    private blogService: BlogService,
    private popupService: PopupService
  ) {
    console.log('BlogComponent initialized'); // Debug log
  }

  ngOnInit() {
    this.blogService.getAllBlogs().subscribe({
      next: (blogs) => {
        console.log('Received blogs:', blogs);
        this.filteredBlogs = blogs.filter(blog => blog.isVerified === false);
        console.log('Filtered blogs:', this.filteredBlogs);
        this.errorMessage = null;
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }

  verify(blogId: number | null) {
    if (!blogId) {
      console.error('Blog ID is undefined');
      return;
    }
    this.blogService.verifyBlog(blogId).subscribe({
      next: (response) => {
        console.log('Blog verified successfully:', response);
        this.ngOnInit();
      },
      error: (error) => {
        console.error('Error verifying blog:', error);
      }
    });
  }

  checkBlog(blog: Blog) {
    console.log('Opening popup with blog:', blog);
    this.popupService.open(blog);
  }

  DeleteBlog(id: number | null) {
    if (id != null) {
      this.blogService.deleteBlog(id).subscribe({
        next: () => {
          this.blogService.getAllBlogs().subscribe({
            next: (blogs) => {
              console.log('Blogs after deletion:', blogs);
              this.blogs = blogs.filter(blog => blog.isVerified === false);
              this.filteredBlogs = this.blogs;
            },
            error: (error) => {
              this.errorMessage = error.message;
            }
          });
        },
        error: (error) => {
          this.errorMessage = error.message;
        }
      });
    }
  }

  testPopup() {
    const testBlog: Blog = {
      idBlog: 1,
      title: 'Test Blog',
      category: 'Test Category',
      content: 'This is a test blog content.',
      user: null,
      userId: 100,
      imagepath: 'https://via.placeholder.com/150',
      isVerified: false
    };
    console.log('Testing popup with:', testBlog);
    this.popupService.open(testBlog);
  }
}