import { Component, OnInit } from '@angular/core';
import { BlogService, Blog } from '../../../services/blog.service';
import { CommentService, Comment } from '../../../services/comment.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {AuthService} from "../../../services/auth.service";

interface PopularPost {
  title: string;
  date: string;
  imageUrl: string | null;
}

@Component({
  selector: 'app-blog-details',
  templateUrl: './blog-details.component.html',
  styleUrls: ['./blog-details.component.css']
})
export class BlogDetailsComponent implements OnInit {
  blog: Blog | null = null;
  blogs: Blog[] = [];
  filteredBlogs: Blog[] = [];
  latestBlogs: Blog[] = [];
  comments: Comment[] = [];
  errorMessage: string | null = null;
  isEditing: boolean = false;
  editingCommentId: number | null = null;
  staticUserId: number = 1 ;
  instagramPosts: string[] = Array(9).fill('https://www.bootdey.com/image/100x100/87CEFA/000000');

  constructor(
    private blogService: BlogService,
    private commentService: CommentService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {

    this.authService.getUser().subscribe({
      next: (user) => {
        this.staticUserId = user.id;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load user profile.';
        console.error(error);
      }
    });



    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadBlog(+id);
        this.loadComments(+id);
      }
    });
    this.blogService.getAllBlogs().subscribe({
      next: (blogs) => {
        this.blogs = blogs;
        this.filteredBlogs = blogs;
        this.latestBlogs = this.getLatestBlogs(blogs);
        this.errorMessage = null;
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }

  private getLatestBlogs(blogs: Blog[]): Blog[] {
    return blogs
      .filter(blog => blog.idBlog != null)
      .sort((a, b) => b.idBlog! - a.idBlog!)
      .slice(0, 3);
  }

  loadBlog(id: number): void {
    this.blogService.getBlog(id).subscribe({
      next: (blog) => {
        this.blog = blog;
        this.errorMessage = null;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.blog = null;
      }
    });
  }

  loadComments(blogId: number): void {
    this.commentService.getAllComments().subscribe({
      next: (comments) => {
        this.comments = this.blog?.comments || [];
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }

  getImageUrl(imageName: string): string {
    return `http://localhost:8888/BLOG/api/blog/images/${imageName}`;
  }

  submitComment(form: NgForm): void {
    if (!this.blog || !this.blog.idBlog) {
      this.errorMessage = 'Blog not loaded. Please try again.';
      return;
    }
    const commentData: Comment = {
      idComment: this.isEditing ? this.editingCommentId : null,
      content: form.value.content.trim(),
      blog: this.blog,
      user: null,
      userId: this.staticUserId    };

    if (!commentData.content) {
      this.errorMessage = 'Comment content cannot be empty.';
      return;
    }

    if (this.isEditing && this.editingCommentId) {
      this.commentService.updateComment(this.editingCommentId, commentData).subscribe({
        next: (updatedComment) => {
          const index = this.comments.findIndex(c => c.idComment === this.editingCommentId);
          if (index !== -1) {
            this.comments[index] = updatedComment;
          }
          this.resetForm(form);
          this.errorMessage = null;
        },
        error: (error) => {
          this.errorMessage = error.message;
        }
      });
    } else {
      this.commentService.createComment(commentData, this.blog.idBlog, this.staticUserId).subscribe({
        next: (newComment) => {
          this.comments.push(newComment);
          this.resetForm(form);
          this.errorMessage = null;
        },
        error: (error) => {
          this.errorMessage = error.message;
        }
      });
    }
  }

  editComment(comment: Comment): void {
    if (comment.userId !== this.staticUserId) {
      this.errorMessage = 'You can only edit your own comments.';
      return;
    }
    this.isEditing = true;
    this.editingCommentId = comment.idComment;
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = comment.content;
    }
  }

  deleteComment(commentId: number): void {
    const comment = this.comments.find(c => c.idComment === commentId);
    if (comment && comment.userId !== this.staticUserId) {
      this.errorMessage = 'You can only delete your own comments.';
      return;
    }
    if (confirm('Are you sure you want to delete this comment?')) {
      this.commentService.deleteComment(commentId).subscribe({
        next: () => {
          this.comments = this.comments.filter(c => c.idComment !== commentId);
          this.errorMessage = null;
        },
        error: (error) => {
          this.errorMessage = error.message;
        }
      });
    }
  }

  resetForm(form: NgForm): void {
    form.resetForm();
    this.isEditing = false;
    this.editingCommentId = null;
  }

  isCommentEditable(comment: Comment): boolean {
    return comment.userId === this.staticUserId;
  }

  downloadAsPDF(): void {
    if (!this.blog) {
      this.errorMessage = 'Blog not loaded. Please try again.';
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Header: Username (Top-Left) and Date/Time (Top-Right)
    const now = new Date();
    const dateTime = now.toLocaleString();
    const username = this.blog.user?.firstName || 'Anonymous';

    doc.setFontSize(12);
    doc.setFont('times', 'italic');
    doc.setTextColor(50, 50, 50); // Dark gray for elegance
    doc.text(username, margin, 15); // Top-left

    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text(`Generated on: ${dateTime}`, pageWidth - margin, 15, { align: 'right' }); // Top-right

    // Title: Centered with a larger, bold font
    doc.setFontSize(24);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 0, 0); // Black for title
    const titleWidth = doc.getTextWidth(this.blog.title);
    doc.text(this.blog.title, (pageWidth - titleWidth) / 2, 30); // Centered

    let y = 40;

    // Image: Full width with proportional height
    if (this.blog.imagepath) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = this.getImageUrl(this.blog.imagepath);
        img.onload = () => {
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = (img.height * imgWidth) / img.width;
          doc.addImage(img, 'JPEG', margin, y, imgWidth, imgHeight);
          y += imgHeight + 10;

          // Content: Styled with Times font, justified, and better spacing
          doc.setFontSize(12);
          doc.setFont('times', 'normal');
          doc.setTextColor(40, 40, 40);
          doc.setLineHeightFactor(1.5); // Better line spacing
          doc.text(this.blog!.content, margin, y, { maxWidth: pageWidth - 2 * margin, align: 'justify' });

          // Footer: Unihelp@support.com in bottom-right
          doc.setFontSize(10);
          doc.setFont('times', 'italic');
          doc.setTextColor(100, 100, 100); // Light gray for footer
          doc.text('Unihelp@support.com', pageWidth - margin, pageHeight - margin, { align: 'right' });

          doc.save(`${this.blog!.title}.pdf`);
        };
        img.onerror = () => {
          // Fallback if image fails to load
          doc.setFontSize(12);
          doc.setFont('times', 'normal');
          doc.setTextColor(40, 40, 40);
          doc.setLineHeightFactor(1.5);
          doc.text(this.blog!.content, margin, y, { maxWidth: pageWidth - 2 * margin, align: 'justify' });

          // Footer
          doc.setFontSize(10);
          doc.setFont('times', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text('Unihelp@support.com', pageWidth - margin, pageHeight - margin, { align: 'right' });

          doc.save(`${this.blog!.title}.pdf`);
        };
      } catch (error) {
        console.error('Error loading image:', error);
        // Proceed without image
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.setLineHeightFactor(1.5);
        doc.text(this.blog.content, margin, y, { maxWidth: pageWidth - 2 * margin, align: 'justify' });

        // Footer
        doc.setFontSize(10);
        doc.setFont('times', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Unihelp@support.com', pageWidth - margin, pageHeight - margin, { align: 'right' });

        doc.save(`${this.blog.title}.pdf`);
      }
    } else {
      // Add Content without image
      doc.setFontSize(12);
      doc.setFont('times', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.setLineHeightFactor(1.5);
      doc.text(this.blog.content, margin, y, { maxWidth: pageWidth - 2 * margin, align: 'justify' });

      // Footer
      doc.setFontSize(10);
      doc.setFont('times', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('support@unihelp.com', pageWidth - margin, pageHeight - margin, { align: 'right' });

      doc.save(`${this.blog.title}.pdf`);
    }
  }
}
