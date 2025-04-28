
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Course } from '../models/course';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit, OnDestroy {
  courses: Course[] = [];
  filteredCourses: Course[] = [];
  enrollmentStatus: { [key: number]: boolean } = {};
  categories: string[] = [];
  filters: { categories: { [key: string]: boolean } } = { categories: {} };
  mockUser = { userId: 2, role: 'STUDENT' };
  userRole: string | null = null;
  loading: boolean = false;
  errorMessage: string | null = null;
  private subscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadCourses();
  }



  loadCategories(): void {
    this.loading = true;
    this.http.get<string[]>('http://localhost:8888/COURS/api/categories')
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.categories.forEach(category => {
            this.filters.categories[category] = false;
          });
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load categories:', err);
          this.errorMessage = 'Failed to load categories. Please try again later.';
          this.loading = false;
        }
      });
  }


  loadCourses(): void {
    this.loading = true;
    this.http.get<Course[]>('http://localhost:8888/COURS/api/courses')
      .subscribe({
        next: (data) => {
          this.courses = data;
          this.filteredCourses = data;
          this.loading = false;
          this.courses.forEach(course => {
            if (course.price === 0) {
              this.enrollmentStatus[course.id] = true;
            } else {
              this.checkEnrollmentStatus(course.id);
            }
          });
        },
        error: (err) => {
          console.error('Failed to load courses:', err);
          this.errorMessage = 'Failed to load courses. Please try again later.';
          this.loading = false;
        }
      });
  }

  checkEnrollmentStatus(courseId: number): void {
    this.http.get(`http://localhost:8888/COURS/api/courses/${courseId}/enrollment-status?userId=${this.mockUser.userId}`)
      .subscribe({
        next: (response: any) => {
          this.enrollmentStatus[courseId] = response.isEnrolled;
        },
        error: (err) => {
          console.error(`Failed to check enrollment status for course ${courseId}:`, err);
          this.enrollmentStatus[courseId] = false;
        }
      });
  }

  enrollCourse(courseId: number): void {
    const course = this.courses.find(c => c.id === courseId);
    if (course && course.price === 0) {
      this.enrollmentStatus[courseId] = true;
      this.router.navigate([`/course-details/${courseId}`]);
    } else {
      this.http.post(`http://localhost:8888/COURS/api/courses/${courseId}/create-checkout-session`, {
        userId: this.mockUser.userId,
        role: this.mockUser.role
      }).subscribe({
        next: (response: any) => {
          const sessionId = response.sessionId;
          const stripe = (window as any).Stripe('pk_test_51REryU4gOpgPD2XUhQJo2PfFFpZNKOrJQkcHXEAGHWpoqvJ7x2eDKv2AClE33BcOWD667uoOoAHXiQKheLtQtwrB00j74eGkdB');
          stripe.redirectToCheckout({ sessionId: sessionId })
            .then((result: any) => {
              if (result.error) {
                console.error('Stripe checkout error:', result.error.message);
                this.errorMessage = 'Failed to initiate payment. Please try again.';
              }
            });
        },
        error: (err) => {
          console.error(`Failed to enroll in course ${courseId}:`, err);
          this.errorMessage = 'Failed to initiate payment. Please try again.';
        }
      });
    }
  }

  viewCourseDetails(courseId: number): void {
    this.router.navigate([`/course-details/${courseId}`]);
  }

  applyFilters(): void {
    this.filteredCourses = this.courses.filter(course => {
      const selectedCategories = Object.keys(this.filters.categories).filter(cat => this.filters.categories[cat]);
      return selectedCategories.length === 0 || selectedCategories.includes(course.category);
    });
  }

  ngOnDestroy(): void {}
}
