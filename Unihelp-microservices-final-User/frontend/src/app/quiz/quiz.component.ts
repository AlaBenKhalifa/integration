import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Course } from '../models/course';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

@Component({
  selector: 'app-quiz',
  template: `
    <app-header></app-header>
    <div style="font-family: 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding: 230px 20px 40px; min-height: calc(100vh - 300px); background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="font-size: 32px; font-weight: 700; color: #1a3c34; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Course Quiz</h2>
        <p style="font-size: 16px; color: #4a5568; margin-top: 8px;">Test your knowledge with our interactive quiz!</p>
      </div>

      <!-- PDF Selection and Quiz Start -->
      <div *ngIf="!quizCompleted && !quizQuestions.length && !isLoading && pdfs.length > 0" style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); animation: slideIn 0.5s ease;">
        <p style="font-size: 18px; color: #2d3748; margin-bottom: 16px;">Available PDFs: {{ pdfs.length }}</p>
        <button
          (click)="generateQuiz()"
          style="padding: 12px 32px; background: linear-gradient(90deg, #38b2ac, #2c7a7b); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
          [disabled]="currentIndex >= pdfs.length"
          [style.background]="currentIndex >= pdfs.length ? 'gray' : 'linear-gradient(90deg, #38b2ac, #2c7a7b)'"
          [style.transform]="currentIndex >= pdfs.length ? 'scale(1)' : 'scale(1.05) on hover'"
          [style.boxShadow]="currentIndex >= pdfs.length ? 'none' : '0 4px 10px rgba(0,0,0,0.2) on hover'"
        >
          Try Quiz for PDF {{ currentIndex + 1 }}
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" style="text-align: center; margin: 40px 0; animation: fadeIn 0.5s ease;">
        <div style="border: 4px solid #e2e8f0; border-top: 4px solid #38b2ac; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <p style="font-size: 16px; color: #4a5568; margin-top: 16px;">Loading Quiz...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage" style="background: #fff5f5; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.1); animation: slideIn 0.5s ease;">
        <p style="font-size: 16px; color: #c53030; margin-bottom: 16px;">{{ errorMessage }}</p>
        <button
          (click)="resetError()"
          style="padding: 10px 24px; background: #e53e3e; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
          [style.transform]="'scale(1.05) on hover'"
          [style.boxShadow]="'0 4px 10px rgba(0,0,0,0.2) on hover'"
        >
          Retry
        </button>
      </div>

      <!-- No PDFs Available -->
      <div *ngIf="pdfs.length === 0 && !isLoading" style="background: white; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.1); animation: slideIn 0.5s ease;">
        <p style="font-size: 16px; color: #c53030;">No PDFs available for this course</p>
      </div>

      <!-- Quiz Questions -->
      <div *ngIf="!quizCompleted && quizQuestions.length > 0" style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); animation: slideIn 0.5s ease;">
        <h3 style="font-size: 20px; font-weight: 600; color: #1a3c34; margin-bottom: 24px;">Quiz Questions</h3>
        <div *ngFor="let q of quizQuestions; let i = index" style="margin-bottom: 32px;">
          <p style="font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 12px;">{{ i + 1 }}. {{ q.question }}</p>
          <div style="display: grid; gap: 12px;">
            <div *ngFor="let opt of q.options" style="display: flex; align-items: center; padding: 12px; background: #edf2f7; border-radius: 8px; cursor: pointer; transition: background 0.2s, transform 0.2s;"
                 [style.background]="userAnswers[i] === opt ? '#bee3f8' : '#edf2f7'"
                 [style.transform]="userAnswers[i] === opt ? 'scale(1.02)' : 'scale(1)'">
              <input
                type="radio"
                [id]="'q' + i + '-' + opt"
                [name]="'question-' + i"
                [value]="opt"
                [(ngModel)]="userAnswers[i]"
                style="margin-right: 12px; accent-color: #38b2ac;"
              />
              <label [for]="'q' + i + '-' + opt" style="font-size: 16px; color: #2d3748; cursor: pointer;">{{ opt }}</label>
            </div>
          </div>
        </div>
        <button
          (click)="submitQuiz()"
          style="padding: 12px 32px; background: linear-gradient(90deg, #38b2ac, #2c7a7b); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; display: block; margin: 0 auto; transition: transform 0.2s, box-shadow 0.2s;"
          [disabled]="userAnswers.length < quizQuestions.length || userAnswers.includes(undefined)"
          [style.background]="userAnswers.length < quizQuestions.length || userAnswers.includes(undefined) ? 'gray' : 'linear-gradient(90deg, #38b2ac, #2c7a7b)'"
          [style.transform]="userAnswers.length < quizQuestions.length || userAnswers.includes(undefined) ? 'scale(1)' : 'scale(1.05) on hover'"
          [style.boxShadow]="userAnswers.length < quizQuestions.length || userAnswers.includes(undefined) ? 'none' : '0 4px 10px rgba(0,0,0,0.2) on hover'"
        >
          Submit Quiz
        </button>
      </div>

      <!-- Quiz Results -->
      <div *ngIf="quizCompleted" style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); animation: slideIn 0.5s ease;">
        <h3 style="font-size: 24px; font-weight: 700; color: #1a3c34; text-align: center; margin-bottom: 24px;">Quiz Results 🎉</h3>
        <p style="font-size: 20px; font-weight: 600; color: #2d3748; text-align: center; margin-bottom: 24px;">
          Your Score: <span style="color: #38b2ac;">{{ score }} / {{ quizQuestions.length }}</span>
        </p>
        <div *ngFor="let q of quizQuestions; let i = index" style="margin-bottom: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; animation: fadeIn 0.5s ease;">
          <p style="font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 8px;">{{ i + 1 }}. {{ q.question }}</p>
          <p style="font-size: 16px; margin-bottom: 4px;">
            <strong>Your Answer:</strong>
            <span [style.color]="userAnswers[i] === q.correctAnswer ? '#38b2ac' : '#c53030'">{{ userAnswers[i] || 'Not answered' }}</span>
          </p>
          <p style="font-size: 16px; margin-bottom: 4px;">
            <strong>Correct Answer:</strong> {{ q.correctAnswer }}
          </p>
          <p style="font-size: 14px; color: #4a5568; line-height: 1.5;">{{ q.explanation }}</p>
        </div>
        <div style="display: flex; justify-content: center; gap: 16px;">
          <button
            (click)="generateQuiz()"
            style="padding: 12px 32px; background: linear-gradient(90deg, #38b2ac, #2c7a7b); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
            [disabled]="currentIndex >= pdfs.length"
            [style.background]="currentIndex >= pdfs.length ? 'gray' : 'linear-gradient(90deg, #38b2ac, #2c7a7b)'"
            [style.transform]="currentIndex >= pdfs.length ? 'scale(1)' : 'scale(1.05) on hover'"
            [style.boxShadow]="currentIndex >= pdfs.length ? 'none' : '0 4px 10px rgba(0,0,0,0.2) on hover'"
          >
            Try Next Quiz
          </button>
          <button
            (click)="resetQuiz()"
            style="padding: 12px 32px; background: #4a5568; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
            [style.transform]="'scale(1.05) on hover'"
            [style.boxShadow]="'0 4px 10px rgba(0,0,0,0.2) on hover'"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
    <app-footer></app-footer>

    <style>
      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      button:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      }
      @media (max-width: 600px) {
        div[style*="max-width: 900px"] { padding: 80px 10px 20px; }
        h2 { font-size: 24px; }
        h3 { font-size: 18px; }
        p { font-size: 14px; }
        button { padding: 10px 20px; font-size: 14px; }
      }
    </style>
  `,
  styles: []
})
export class QuizComponent implements OnInit {
  quizQuestions: QuizQuestion[] = [];
  pdfs: string[] = [];
  currentIndex = 0;
  isLoading = false;
  errorMessage = '';
  userAnswers: (string | undefined)[] = [];
  score = 0;
  quizCompleted = false;
  courseId: string | null = null;
  mockUser = { userId: 2, role: 'STUDENT' }; // Added mock user for userId

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId');
    if (this.courseId) {
      this.isLoading = true;
      // Fetch course details with userId
      this.http.get<Course>(`http://localhost:8888/COURS/api/courses/${this.courseId}/details?userId=${this.mockUser.userId}`).subscribe({
        next: (course) => {
          // Extract PDF filenames from lessons
          this.pdfs = course.modules
            ?.flatMap((module: { lessons: any; }) => module.lessons || [])
            .filter((lesson: { contentType: string; contentUrl: any; }) => lesson.contentType === 'pdf' && lesson.contentUrl)
            .map((lesson: { contentUrl: string; }) => {
              // Extract filename from contentUrl (e.g., '/COURS/uploads/filename.pdf' -> 'filename.pdf')
              const url = lesson.contentUrl || '';
              return url.split('/').pop() || '';
            })
            .filter((filename: string) => filename.endsWith('.pdf')) || [];
          this.isLoading = false;
          console.log('Course PDFs:', this.pdfs);
          if (this.pdfs.length === 0) {
            this.errorMessage = 'No PDFs available for this course.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Failed to fetch course details: ' + (err.error?.details || err.message);
          console.error('Failed to fetch course details:', err);
        }
      });
    } else {
      this.isLoading = false;
      this.errorMessage = 'No course ID provided.';
    }
  }

  generateQuiz() {
    if (this.currentIndex >= this.pdfs.length) {
      alert('All quizzes completed for this course!');
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.quizQuestions = [];
    this.userAnswers = [];
    this.quizCompleted = false;
    const pdf = this.pdfs[this.currentIndex++];
    this.http.get<QuizQuestion[]>(`http://localhost:8888/COURS/api/courses/quiz/generate/${pdf}`).subscribe({
      next: (data) => {
        this.quizQuestions = data;
        this.isLoading = false;
        console.log('Quiz generated:', this.quizQuestions);
      },
      error: (err) => {
        this.isLoading = false;
        let errorMsg = 'Failed to generate quiz: ';
        if (err.status === 400 && err.error?.details) {
          try {
            const details = JSON.parse(err.error.details);
            errorMsg += details.error?.message || 'Invalid request';
          } catch (e) {
            errorMsg += err.error?.details || 'Unable to generate quiz';
          }
        } else {
          errorMsg += err.error?.message || 'Unable to generate quiz. Please try again later.';
        }
        this.errorMessage = errorMsg;
        console.error('Quiz failed:', err);
        this.currentIndex--; // Revert index on failure
      }
    });
  }

  submitQuiz() {
    this.score = this.quizQuestions.reduce((score, question, i) => {
      return score + (this.userAnswers[i] === question.correctAnswer ? 1 : 0);
    }, 0);
    this.quizCompleted = true;
  }

  resetError() {
    this.errorMessage = '';
    this.currentIndex--;
    this.generateQuiz();
  }

  resetQuiz() {
    this.currentIndex = 0;
    this.quizQuestions = [];
    this.userAnswers = [];
    this.score = 0;
    this.quizCompleted = false;
    this.errorMessage = '';
  }
}
