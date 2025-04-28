import { Component, OnInit } from '@angular/core';
import { PopupService } from '../../services/popup.service';
import { NgIf } from '@angular/common';
import { Blog } from '../../services/blog.service'; // Adjust the import path as necessary

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="popup-overlay" *ngIf="isOpen">
      <div class="popup-content">
        <button class="close-btn" (click)="close()">Close</button>
        <h2 class="popup-title">Blog Details</h2>
        <div class="scrollable-content">
          <div *ngIf="blog" class="blog-details">
            <h3 class="blog-title">{{ blog.title }}</h3>
            <p class="blog-category"><strong>Category:</strong> {{ blog.category }}</p>
            <p class="blog-content">{{ blog.content }}</p>
            <p class="blog-user"><strong>Author ID:</strong> {{ blog.user?.firstName }} {{ blog.user?.lastName }} </p>
            <p class="blog-verified"><strong>Email:</strong> {{ blog.user?.email }}</p>
          </div>
          <div *ngIf="!blog" class="no-data">
            <p>No blog data available.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .debug-message {
      position: fixed;
      top: 10px;
      left: 10px;
      background: yellow;
      padding: 10px;
      z-index: 3000;
      font-weight: bold;
    }
    .popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      border: 5px solid red; /* Debug border */
    }
    .popup-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 500px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }
    .scrollable-content {
      max-height: 60vh;
      overflow-y: auto;
      margin-top: 10px;
      padding-right: 10px;
    }
    .close-btn {
      align-self: flex-end;
      background: #dc2626;
      color: white;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      border-radius: 4px;
      font-weight: 600;
    }
    .popup-title {
      font-size: 1.8rem;
      color: #1e3a8a;
      margin-bottom: 1rem;
      text-align: center;
    }
    .blog-title {
      font-size: 1.5rem;
      color: #2563eb;
      margin-bottom: 0.5rem;
    }
    .blog-category, .blog-user, .blog-verified {
      font-size: 1rem;
      color: #374151;
      margin: 0.5rem 0;
    }
    .blog-content {
      font-size: 1.1rem;
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    .blog-image img {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 1rem;
    }
    .no-data {
      text-align: center;
      color: #4b5563;
      font-size: 1.1rem;
    }
  `]
})
export class PopupComponent implements OnInit {
  isOpen = false;
  blog: Blog | null = null;

  constructor(private popupService: PopupService) {
    console.log('PopupComponent initialized');
  }

  ngOnInit() {
    console.log('PopupComponent ngOnInit');
    this.popupService.isOpen$.subscribe(isOpen => {
      console.log('Popup isOpen:', isOpen);
      this.isOpen = isOpen;
    });
    this.popupService.parameter$.subscribe(param => {
      console.log('Popup received blog:', param);
      this.blog = param as Blog;
    });
  }

  close() {
    console.log('Popup close clicked');
    this.popupService.close();
  }
}