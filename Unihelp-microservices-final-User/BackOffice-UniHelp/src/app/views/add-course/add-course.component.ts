import {Component, NgIterable, OnInit} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {NgForOf, NgClass, NgIf} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import { NgModule } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-add-course',
  standalone: true,
  imports: [
    NgForOf,
    RouterLink,
    FormsModule,
    NgClass,
    NgIf,
  ],
  templateUrl: './add-course.component.html',
  styleUrls: ['./add-course.component.scss']
})
export class AddCourseComponent implements OnInit {
  course = {
    title: '',
    description: '',
    category: '',
    level: '',
    price: 0,
    thumbnailUrl: '',
    module: [{title: '', description: ''}]
  };
  categories: string[] = [];
  private isLoading = true ;

  constructor(private http: HttpClient,private router: Router) {

  }

  ngOnInit(): void {
    this.http.get<string[]>('http://localhost:8888/COURS/api/categories')
      .subscribe(
        (data) => {
          this.categories = data;
        },
        (error) => {
          console.error('Error fetching categories', error);
        }
      );
  }

  responseMessage: string | null = null;
  levels: string[] = ['Beginner', 'Intermediate', 'Advanced'];
  addCourse(): void {
    this.isLoading = true;
    this.responseMessage = null;
    const apiUrl = 'http://localhost:8888/COURS/api/courses';
    const userId = 1;
    const courseData = {...this.course, userId};

    const headers = new HttpHeaders().set('Content-Type', 'application/json');

    this.http.post(apiUrl, courseData, { headers }).subscribe({
      next: (response) => {
        this.responseMessage = 'Course added successfully!';
        console.log('Course added:', response);
        this.isLoading = false;
        // Navigate to courses list after a short delay to show message
        setTimeout(() => {
          this.router.navigate(['/courses'], { queryParams: { refresh: 'true' } });
        }, 1000);
      },
      error: (error) => {
        this.responseMessage = 'Failed to add course.';
        console.error('Error adding course:', error);
        this.isLoading = false;
      }
    });
  }


  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.course.thumbnailUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }


  }

  removeThumbnail(): void {
    this.course.thumbnailUrl = '';
  }


}
