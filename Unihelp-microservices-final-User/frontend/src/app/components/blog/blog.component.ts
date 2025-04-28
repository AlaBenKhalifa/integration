import { Component, OnInit } from '@angular/core';
import { BlogService, Blog } from '../../services/blog.service';
import { OfflineStorageService, PendingBlog } from '../../services/offline-storage.service';
import Fuse from 'fuse.js';
import { HttpErrorResponse } from '@angular/common/http';
import { timer, take } from 'rxjs';
import { retryWhen, delayWhen } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Import AuthService
@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {
  blogs: Blog[] = [];
  filteredBlogs: Blog[] = [];
  pendingBlogs: PendingBlog[] = [];
  errorMessage: string | null = null;
  successMessage: string | null = null;
  staticUserId: number = 1;
  searchQuery: string = '';
  selectedCategory: string = '';
  private fuse: Fuse<Blog> | null = null;
  isOffline: boolean = false;
  forceOffline: boolean = false;
  isFetchingBlogs: boolean = false;
  isBackendAvailable: boolean = true;
  debugMode: boolean = true; // Enable for diagnostics

  constructor(
    private blogService: BlogService,
    private offlineStorageService: OfflineStorageService,
    private router: Router,
    private authService: AuthService, // Inject AuthService
  ) {}

  ngOnInit() {



    this.authService.getUser().subscribe({
      next: (user) => {
        this.staticUserId = user.id;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load user profile.';
        console.error(error);
      }
    });






    this.isOffline = !navigator.onLine || this.forceOffline;
    if (this.debugMode) {
      console.log('Initial state:', {
        isOffline: this.isOffline,
        navigatorOnLine: navigator.onLine,
        forceOffline: this.forceOffline,
        isBackendAvailable: this.isBackendAvailable
      });
    }
    window.addEventListener('online', () => this.onNetworkStatusChange(true));
    window.addEventListener('offline', () => this.onNetworkStatusChange(false));

    this.loadBlogs();
  }

  private onNetworkStatusChange(isOnline: boolean): void {
    this.isOffline = !isOnline || this.forceOffline;
    if (this.debugMode) {
      console.log('Network status changed:', {
        isOnline,
        isOffline: this.isOffline,
        forceOffline: this.forceOffline,
        isBackendAvailable: this.isBackendAvailable
      });
    }
    if (isOnline && !this.forceOffline) {
      this.loadBlogs();
    } else {
      this.isBackendAvailable = false;
      this.loadBlogs();
    }
  }

  private loadBlogs(): void {
    this.isFetchingBlogs = true;
    this.offlineStorageService.getPendingBlogs().then(pendingBlogs => {
      this.pendingBlogs = pendingBlogs;
      this.pendingBlogs.forEach(pending => {
        if (pending.imageFile) {
          const reader = new FileReader();
          reader.onload = () => {
            pending.blog.imagepath = reader.result as string;
          };
          reader.readAsDataURL(pending.imageFile);
        }
      });

      if (!this.isOffline) {
        this.blogService.getAllBlogs().pipe(
          retryWhen(errors => errors.pipe(
            delayWhen(() => timer(1000)),
            take(1)
          ))
        ).subscribe({
          next: async (blogs) => {
            if (this.debugMode) {
              console.log('Raw blogs from API:', blogs);
            }
            this.blogs = blogs.filter(blog => blog.isVerified === true);
            if (this.debugMode) {
              console.log('Filtered verified blogs:', this.blogs);
            }
            this.isBackendAvailable = true;
            // Auto-sync pending blogs if backend is available
            if (this.pendingBlogs.length > 0) {
              await this.syncPendingBlogs();
            }
            this.filteredBlogs = [
              ...this.blogs,
              ...this.pendingBlogs.map(pending => ({
                ...pending.blog,
                isPending: true,
                offlineId: pending.offlineId
              }))
            ];
            this.errorMessage = null;
            this.successMessage = 'Blogs loaded successfully.';
            this.isFetchingBlogs = false;
            this.initializeFuse();
            this.onFilterChange();
          },
          error: (error: HttpErrorResponse) => {
            if (this.debugMode) {
              console.error('Error fetching blogs:', {
                message: error.message,
                status: error.status,
                statusText: error.statusText,
                errorDetails: error.error,
                headers: error.headers.keys().map(key => `${key}: ${error.headers.get(key)}`),
                requestUrl: error.url
              });
            }
            this.isBackendAvailable = false;
            this.filteredBlogs = this.pendingBlogs.map(pending => ({
              ...pending.blog,
              isPending: true,
              offlineId: pending.offlineId
            }));
            this.errorMessage = `Failed to load online blogs (Error ${error.status}). Showing pending blogs only.`;
            this.isFetchingBlogs = false;
            this.initializeFuse();
            this.onFilterChange();
          }
        });
      } else {
        this.isBackendAvailable = false;
        this.blogs = [];
        this.filteredBlogs = this.pendingBlogs.map(pending => ({
          ...pending.blog,
          isPending: true,
          offlineId: pending.offlineId
        }));
        this.errorMessage = this.forceOffline ? 'Testing in forced offline mode.' : 'You are offline. Showing pending blogs only.';
        this.isFetchingBlogs = false;
        this.initializeFuse();
        this.onFilterChange();
      }
    }).catch(error => {
      console.error('Error loading pending blogs:', error);
      this.errorMessage = 'Failed to load pending blogs from storage.';
      this.isFetchingBlogs = false;
    });
  }

  AddBlog(): void {
    this.router.navigate(['/add-blog']);
  }

  async syncPendingBlogs(): Promise<void> {
    if (this.isOffline || !this.isBackendAvailable) {
      this.errorMessage = 'Cannot sync: Backend is unavailable or you are offline.';
      return;
    }

    const pendingBlogs = await this.offlineStorageService.getPendingBlogs();
    if (pendingBlogs.length === 0) {
      this.successMessage = 'No pending blogs to sync.';
      return;
    }

    for (const pending of pendingBlogs) {
      try {
        let imageName: string | undefined = pending.blog.imagepath;
        if (pending.imageFile) {
          const formData = new FormData();
          formData.append('image', pending.imageFile);
          try {
            imageName = await this.blogService.uploadImage(formData).toPromise() || '';
          } catch (uploadError) {
            console.error(`Failed to upload image for blog ${pending.offlineId}:`, uploadError);
            this.errorMessage = `Failed to upload image for blog "${pending.blog.title}". Please try syncing again later.`;
            continue;
          }
        }

        const blog: Blog = {
          idBlog: pending.blog.idBlog,
          title: pending.blog.title,
          category: pending.blog.category,
          content: pending.blog.content,
          user: pending.blog.user,
          userId: pending.blog.userId,
          imagepath: imageName || pending.blog.imagepath || '',
          comments: pending.blog.comments,
          isVerified: pending.blog.isVerified
        };

        const observable = pending.operation === 'create'
          ? this.blogService.createBlog(blog)
          : this.blogService.updateBlog(blog.idBlog!, blog);

        await observable.toPromise();
        await this.offlineStorageService.removePendingBlog(pending.offlineId);
        this.successMessage = `Successfully synced blog "${pending.blog.title}"!`;
      } catch (error) {
        console.error(`Failed to sync blog ${pending.offlineId}:`, error);
        this.errorMessage = `Failed to sync blog "${pending.blog.title}". Please try again later.`;
      }
    }
    this.loadBlogs();
  }

  retryFetchBlogs(): void {
    if (this.isOffline) {
      this.errorMessage = 'Cannot fetch blogs while offline.';
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;
    this.loadBlogs();
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredBlogs = [...this.blogs, ...this.pendingBlogs.map(pending => ({
        ...pending.blog,
        isPending: true,
        offlineId: pending.offlineId
      }))];
      this.onFilterChange();
      return;
    }

    if (this.fuse) {
      const result = this.fuse.search(this.searchQuery);
      this.filteredBlogs = result.map((item) => item.item);
    }
  }

  private initializeFuse(blogs: Blog[] = this.filteredBlogs) {
    const options = {
      keys: ['title', 'content'],
      threshold: 0.4,
      includeScore: true
    };
    this.fuse = new Fuse(blogs, options);
  }

  onFilterChange() {
    let tempBlogs = [...this.blogs, ...this.pendingBlogs.map(pending => ({
      ...pending.blog,
      isPending: true,
      offlineId: pending.offlineId
    }))];

    if (this.selectedCategory) {
      tempBlogs = tempBlogs.filter(blog => blog.category === this.selectedCategory);
    }

    if (this.searchQuery.trim()) {
      this.initializeFuse(tempBlogs);
      if (this.fuse) {
        const result = this.fuse.search(this.searchQuery);
        tempBlogs = result.map((item) => item.item);
      }
    }

    this.filteredBlogs = tempBlogs;
  }

  DeleteBlog(id: number | null, offlineId?: string) {
    if (offlineId) {
      this.offlineStorageService.removePendingBlog(offlineId).then(() => {
        this.loadBlogs();
        this.errorMessage = null;
        this.successMessage = 'Pending blog deleted successfully.';
      }).catch(error => {
        this.errorMessage = `Error deleting pending blog: ${error.message}`;
      });
    } else if (id != null && !this.isOffline && this.isBackendAvailable) {
      this.blogService.deleteBlog(id).subscribe({
        next: () => {
          this.loadBlogs();
          this.errorMessage = null;
          this.successMessage = 'Blog deleted successfully.';
        },
        error: (error) => {
          this.errorMessage = error.message;
        }
      });
    } else {
      this.errorMessage = 'Cannot delete online blog while backend is unavailable or offline.';
    }
  }

  getImageUrl(imageName: string | null): string {
    if (!imageName) {
      return 'https://www.bootdey.com/image/280x280/87CEFA/000000';
    }
    if (imageName.startsWith('data:image')) {
      return imageName;
    }
    return `http://localhost:8888/BLOG/api/blog/images/${imageName}`;
  }

  isBlogDeletable(userId: number): boolean {
    return this.staticUserId === userId;
  }
}
