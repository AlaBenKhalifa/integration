import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Course } from '../models/course';
declare var Stripe: any;

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit {
  course: Course | null = null;
  isEnrolled: boolean = false;
  showFullContent: boolean = false;
  mockUser = { userId: 2, role: 'STUDENT' };
  selectedLesson: any = null;
  loading: boolean = false;
  stripe: any;
  errorMessage: string | null = null;
  isChatOpen: boolean = false; // Toggle state for chat window

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {
    try {
      this.stripe = Stripe('pk_test_51REryU4gOpgPD2XUhQJo2PfFFpZNKOrJQkcHXEAGHWpoqvJ7x2eDKv2AClE33BcOWD667uoOoAHXiQKheLtQtwrB00j74eGkdB');
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.errorMessage = 'Payment system is unavailable. Please try again later.';
    }
  }

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loading = true;
      this.http.get<Course>(`http://localhost:8888/COURS/api/courses/${courseId}/details?userId=${this.mockUser.userId}`)
        .subscribe({
          next: (data: Course) => {
            this.course = data;
            this.loading = false;
            if (data.price === 0) {
              this.isEnrolled = true;
              this.showFullContent = true;
            } else {
              this.checkEnrollmentStatus(courseId);
            }
          },
          error: (err) => {
            console.error('Failed to fetch course details:', err);
            this.course = null;
            this.loading = false;
            this.errorMessage = 'Failed to load course details. Please try again.';
          }
        });
    }
  }

  checkEnrollmentStatus(courseId: string): void {
    this.http.get(`http://localhost:8888/COURS/api/courses/${courseId}/enrollment-status?userId=${this.mockUser.userId}`)
      .subscribe({
        next: (response: any) => {
          this.isEnrolled = response.isEnrolled;
          this.showFullContent = this.isEnrolled;
        },
        error: (err) => {
          console.error('Failed to check enrollment status:', err);
          this.isEnrolled = false;
          this.showFullContent = false;
        }
      });
  }

  enrollCourse(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId && this.course && this.course.price > 0) {
      this.loading = true;
      if (!this.stripe) {
        this.errorMessage = 'Payment system is unavailable. Please try again later.';
        this.loading = false;
        return;
      }
      this.http.post(`http://localhost:8888/COURS/api/courses/${courseId}/create-checkout-session`, {
        userId: this.mockUser.userId,
        role: this.mockUser.role
      }).subscribe({
        next: (response: any) => {
          const sessionId = response.sessionId;
          this.stripe.redirectToCheckout({ sessionId: sessionId })
            .then((result: any) => {
              this.loading = false;
              if (result.error) {
                console.error('Stripe checkout error:', result.error.message);
                this.errorMessage = 'Failed to initiate payment. Please try again.';
              }
            });
        },
        error: (err) => {
          console.error('Failed to create checkout session:', err);
          this.errorMessage = err.error?.error || 'Failed to initiate payment. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  viewLesson(lesson: any): void {
    if (this.showFullContent && lesson.contentUrl) {
      this.selectedLesson = lesson;
    } else {
      this.errorMessage = 'Please enroll to access this content.';
    }
  }

  takeQuiz(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.router.navigate(['/quiz', courseId]);
    }
  }

  closeModal(): void {
    this.selectedLesson = null;
    this.errorMessage = null;
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
  }
}
