import {Component, OnInit} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {NgClass, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {Router, RouterLink,ActivatedRoute} from "@angular/router";  // <-- Import HttpClient
import { trigger, transition, style, animate } from '@angular/animations';
import {FormsModule} from "@angular/forms";
import {debounceTime, Subject} from "rxjs";
import { Course } from '../models/course';
import { ChangeDetectorRef } from '@angular/core';

interface Suggestion {
  title: string;
  category: string;
}


@Component({
  selector: 'app-course',
  imports: [
    NgForOf,
    RouterLink,
    NgClass,
    FormsModule,
    NgIf
  ],
  standalone: true,

  templateUrl: './course.component.html',
  styleUrls: ['./course.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ])
  ]
})
export class CourseComponent implements OnInit {
  courses: Course[] = [];
  filteredCourses: Course[] = [];
  categories = ['Programming', 'Design', 'Business', 'Data Science', 'CHEMISTRY'];
  searchTerm = '';
  selectedCategory = '';
  suggestions: Suggestion[] = [];
  showSuggestions = false;
  searching = false;
  activeSuggestionIndex = -1;
  showDeleteModal = false;
  courseToDelete: Course | null = null;
  private searchSubject = new Subject<string>();
  private courseAddedSource = new Subject<void>();
  courseAdded$ = this.courseAddedSource.asObservable();
  constructor(private http: HttpClient, private router: Router,private cd: ChangeDetectorRef,private route: ActivatedRoute ) {



  }

  ngOnInit(): void {
    // Initialize tooltips
    setTimeout(() => {
      const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.forEach(tooltipTriggerEl => {
        const bootstrap = (window as any).bootstrap;
        if (bootstrap && bootstrap.Tooltip) {
          new bootstrap.Tooltip(tooltipTriggerEl);
        }
      });
    }, 0);


    this.route.queryParams.subscribe(params => {
      if (params['refresh'] === 'true') {
        this.fetchCourses();
        // Clear query param to avoid repeated triggers
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      } else {
        this.fetchCourses(); // Initial fetch
      }
    });

    // Debounce search input
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.generateSuggestions();
      this.filterCourses();
    });
  }

  fetchCourses(): void {
    this.searching = true;
    this.http.get<Course[]>('http://localhost:8888/COURS/api/courses').subscribe({
      next: (data) => {
        this.courses = data;
        this.filteredCourses = data;
        this.searching = false;
      },

      error: (err) => {
        console.error('Error fetching courses:', err);
        this.searching = false;
      }
    });
  }














  onSearchChange(): void {
    this.showSuggestions = !!this.searchTerm;
    this.activeSuggestionIndex = -1;
    this.searchSubject.next(this.searchTerm);
  }

  filterCourses(): void {
    const term = (this.searchTerm || '').toLowerCase().trim();
    const selectedCategory = (this.selectedCategory || '').toLowerCase();

    this.filteredCourses = this.courses.filter(course => {
      const title = (course.title || '').toLowerCase();
      const category = (course.category || '').toLowerCase();

      const matchesTitle = term ? title.includes(term) : false;
      const matchesCategory = selectedCategory ? category === selectedCategory : false;

      // Case 1: Both term and category selected
      if (term && selectedCategory) {
        return matchesTitle || matchesCategory;
      }

      // Case 2: Only term entered
      if (term && !selectedCategory) {
        return matchesTitle;
      }

      // Case 3: Only category selected
      if (!term && selectedCategory) {
        return matchesCategory;
      }

      // Case 4: No filters
      return true;
    });
  }


  generateSuggestions(): void {
    const term = (this.searchTerm || '').toLowerCase().trim();
    let suggestions: Suggestion[] = [];

    // Sample course data pulled from DB (mocked here)
    const courseTitles = [
      { title: 'Introduction to Programming', category: 'CHEMISTRY' },
      { title: 'Advanced Java', category: 'BIOLOGY' },
      { title: 'Python for Beginners', category: 'PHYSICAL' },
      { title: 'Digital Marketing', category: 'ENGLISH' },
      { title: 'Data Science with Python', category: 'MATHEMATICS' },
      { title: 'SEO Mastery', category: 'ENGLISH' }
    ];

    // Filter by search term or category match (case-insensitive)
    if (term || this.selectedCategory) {
      suggestions = courseTitles.filter(course =>
        course.title.toLowerCase().includes(term) ||
        (this.selectedCategory &&
          course.category.toLowerCase() === this.selectedCategory.toLowerCase())
      );
    }

    // Fallback suggestion if nothing matched
    if (suggestions.length === 0 && term) {
      suggestions.push(
        { title: `${term} Fundamentals`, category: '' },
        { title: `Advanced ${term}`, category: '' }
      );
    }

    this.suggestions = suggestions.slice(0, 5);
  }

  selectSuggestion(suggestion: Suggestion): void {
    this.searchTerm = suggestion.title;
    this.selectedCategory = suggestion.category || this.selectedCategory;
    this.showSuggestions = false;
    this.activeSuggestionIndex = -1;
    this.filterCourses();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.showSuggestions = false;
    this.suggestions = [];
    this.activeSuggestionIndex = -1;
    this.filteredCourses = this.courses;
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.showSuggestions || !this.suggestions.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeSuggestionIndex = Math.min(this.activeSuggestionIndex + 1, this.suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeSuggestionIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        this.showSuggestions = false;
        this.activeSuggestionIndex = -1;
        break;
    }
  }

  getCategoryIconClass(category: string): string {
    return `category-${category.toLowerCase().replace(' ', '-')}`;
  }

  getCategorySvgViewBox(category: string): string {
    return '0 0 24 24';
  }

  getCategorySvgPath(category: string): string {
    switch (category) {
      case 'Programming':
        return 'M7 8l-4 4 4 4m10-8l4 4-4 4M3 12h18';
      case 'Design':
        return 'M12 21a9 9 0 100-18 9 9 0 000 18zm-3-9l3-3m0 0l3 3m-3-3v6';
      case 'Business':
        return 'M12 2a10 10 0 00-7.35 16.83l1.41-1.41A8 8 0 1120 12H18l3 3 3-3h-2a10 10 0 00-10-10z';
      case 'Data Science':
        return 'M3 3h18v18H3V3zm2 2v14h14V5H5zm3 10h8v2H8v-2zm0-4h8v2H8v-2z';
      case 'Marketing':
        return 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-6 0a3 3 0 10-6 0 3 3 0 006 0z';
      default:
        return 'M12 2a10 10 0 00-10 10 10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2z';
    }
  }

  deleteCourse(courseId: number): void {
    const confirmDelete = window.confirm('Are you sure you want to delete this course?');
    if (confirmDelete) {
      this.http.delete(`http://localhost:8888/COURS/api/courses/${courseId}`).subscribe({
        next: () => {
          console.log('Course deleted successfully');
          // Remove the course from the filteredCourses array
          this.filteredCourses = this.filteredCourses.filter(course => course.id !== courseId);
        },
        error: (err) => {
          console.error('Error deleting course:', err);
        }
      });
    }
  }





}
