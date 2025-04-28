import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, tap, takeUntil } from 'rxjs/operators';
import { Course, Module, Lesson } from '../models/course';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit {
  @Input() courseId!: number;
  @Output() closeChat = new EventEmitter<void>();
  question: string = '';
  answer: string | null = null;
  error: string | null = null;
  loading: boolean = false;
  chatHistory: { question: string; answer: string }[] = [];
  course: Course | null = null;
  mockUser = { userId: 2, role: 'STUDENT' };
  courseUrl: string = '';
  showProcessingMessage: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.courseUrl = `http://localhost:8888/COURS/api/courses/${this.courseId}`;
    this.fetchCourseDetails();
  }

  fetchCourseDetails(): void {
    this.loading = true;
    this.http.get<Course>(`http://localhost:8888/COURS/api/courses/${this.courseId}/details?userId=${this.mockUser.userId}`)
      .pipe(
        tap((course: Course) => {
          this.course = course;
          this.loading = false;
        }),
        catchError(this.handleError)
      )
      .subscribe({
        error: (err) => {
          console.error('Failed to fetch course details:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error
          });
        }
      });
  }

  askQuestion(): void {
    if (!this.question.trim()) {
      this.error = 'Please enter a question';
      return;
    }

    if (!this.course) {
      this.error = 'Course details not loaded. Please try again later.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.answer = null;
    this.showProcessingMessage = false;

    const processingTimer = timer(5000).subscribe(() => {
      this.showProcessingMessage = true;
    });

    let lessonContent = '';
    if (this.course.modules && this.course.modules.length > 0) {
      this.course.modules.forEach((module: Module) => {
        if (module.lessons && module.lessons.length > 0) {
          module.lessons.forEach((lesson: Lesson) => {
            lessonContent += `Lesson: ${lesson.title}\nDescription: ${lesson.description}\n\n`;
          });
        }
      });
    }

    const prompt = lessonContent
      ? `CONTEXT:\n${lessonContent}INSTRUCTION:\nAnswer based on the context provided. If the answer cannot be found, say "I don't know."\n\nQUESTION:\n${this.question}`
      : `INSTRUCTION:\nAnswer the following question about the course. If you don't know the answer, say "I don't know."\n\nQUESTION:\n${this.question}`;

    this.http.post<{ answer?: string; error?: string }>(`http://localhost:8888/COURS/api/courses/${this.courseId}/chatbot`, prompt, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      tap(response => {
        if (response.error) {
          this.error = response.error;
        } else if (response.answer) {
          this.answer = response.answer;
          this.chatHistory.push({ question: this.question, answer: response.answer });
        } else {
          this.error = 'Invalid response from server';
        }
        this.question = '';
        this.loading = false;
        this.showProcessingMessage = false;
        processingTimer.unsubscribe();
      }),
      catchError(this.handleError),
      takeUntil(timer(30000))
    ).subscribe({
      error: (err) => {
        console.error('Chatbot request failed:', err);
        processingTimer.unsubscribe();
      }
    });
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    this.loading = false;
    this.showProcessingMessage = false;
    if (error.status === 503) {
      this.error = 'The chatbot is temporarily unavailable due to API quota limits. Please try again later.';
    } else if (error.error && typeof error.error === 'object' && error.error.error) {
      this.error = error.error.error;
    } else {
      this.error = 'An error occurred while processing your question';
    }
    return throwError(() => error);
  }

  clear(): void {
    this.question = '';
    this.answer = null;
    this.error = null;
    this.chatHistory = [];
  }

  close(): void {
    this.closeChat.emit();
  }
}
