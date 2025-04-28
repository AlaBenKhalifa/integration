import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Course } from '../models/course';

@Component({
  selector: 'app-panier',
  templateUrl: './panier.component.html',
  styleUrls: ['./panier.component.css']
})
export class PanierComponent implements OnInit {
  enrolledCourses: Course[] = [];
  mockUser = { userId: 2, role: 'STUDENT' };
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadEnrolledCourses();
  }

  loadEnrolledCourses(): void {
    this.loading = true;
    const url = `http://localhost:8888/COURS/api/courses/courses/enrolled?userId=${this.mockUser.userId}`;
  console.log('Fetching enrolled courses from:', url); // Debug log
this.http.get<Course[]>(url)
  .subscribe({
    next: (courses) => {
      console.log('Enrolled courses received:', courses);
      this.enrolledCourses = courses;
      this.loading = false;
    },
    error: (err) => {
      console.error('Failed to load enrolled courses:', err);
      this.errorMessage = 'Failed to load your courses. Please try again later.';
      this.loading = false;
    }
  });
}

viewCourseDetails(courseId: number): void {
  this.router.navigate([`/course-details/${courseId}`]);
}
}
