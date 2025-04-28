import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-success',
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.css']
})
export class SuccessComponent implements OnInit {
  redirectProgress: number = 0;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const courseId = params['course_id'];
      const sessionId = params['session_id'];
      console.log('SuccessComponent: course_id=', courseId, 'session_id=', sessionId);

      if (courseId && sessionId) {
        // Confirm enrollment before starting progress bar
        this.confirmEnrollment(sessionId, courseId);
      } else {
        console.warn('Missing course_id or session_id, redirecting to /courses in 5 seconds');
        this.errorMessage = 'Payment processed, but course details are missing. Redirecting...';
        this.startRedirect('/courses', false);
      }
    });
  }

  confirmEnrollment(sessionId: string, courseId: string) {
    this.http.post('http://localhost:8888/COURS/api/courses/enrollments/confirm', { sessionId })
      .subscribe({
        next: () => {
          console.log('Enrollment confirmed for course:', courseId);
          this.startRedirect(`/course-details/${courseId}`, true);
        },
        error: (err) => {
          console.error('Failed to confirm enrollment:', err);
          this.errorMessage = 'Payment successful, but enrollment failed. Contact support.';
          this.startRedirect(`/course-details/${courseId}`, true); // Proceed to course details anyway
        }
      });
  }

  startRedirect(path: string, showProgress: boolean) {
    if (showProgress) {
      const interval = setInterval(() => {
        this.redirectProgress += 20;
        if (this.redirectProgress >= 100) {
          clearInterval(interval);
          console.log(`Redirecting to ${path}`);
          this.router.navigate([path]).catch(err => {
            console.error('Navigation error:', err);
            this.router.navigate(['/courses']);
          });
        }
      }, 400); // 2 seconds total (5 * 400ms = 2000ms)
    } else {
      setTimeout(() => {
        this.router.navigate([path]).catch(err => {
          console.error('Navigation error:', err);
          this.router.navigate(['/courses']);
        });
      }, 5000); // 5 seconds for fallback
    }
  }
}
