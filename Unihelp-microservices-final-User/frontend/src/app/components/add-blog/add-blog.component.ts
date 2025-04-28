import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BlogService, Blog } from '../../services/blog.service';
import { OfflineStorageService, PendingBlog } from '../../services/offline-storage.service';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {AuthService} from "../../services/auth.service";
// Define the expected Sightengine API response structure
interface SightengineResponse {
  status: 'success' | 'failure' | string;
  summary?: {
    action: 'accept' | 'reject' | string;
  };
  data?: {
    nudity?: { raw: number; moderate: number; partial: number };
    violence?: { prob: number };
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
    details?: any;
  };
  [key: string]: any;
}

@Component({
  selector: 'app-add-blog',
  templateUrl: './add-blog.component.html',
  styleUrls: ['./add-blog.component.css']
})
export class AddBlogComponent implements OnInit {
  blogForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  blogId: number | null = null;
  isEditMode: boolean = false;
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  staticUserId: number = 1;
  isImageVerified: boolean = false;
  isOffline: boolean = false;
  isBackendAvailable: boolean = true;
  offlineId: string | null = null;
  debugMode: boolean = true; // Enable for diagnostics
  bypassSightengine: boolean = false; // Set to true to skip verification for testing

  private badWords: string[] = ['est', 'nomm'];
  private sightengineApiUser = '128746998';
  private sightengineApiSecret = 'ZJ5XbrmXWzdF99cinMPvoVuh3DuuXiYF';
  private sightengineWorkflow = 'wfl_ik8yknXAgINkfaVCalX4X';
  private sightengineApiUrl = 'https://api.sightengine.com/1.0/check-workflow.json';

  constructor(
    private fb: FormBuilder,
    private blogService: BlogService,
    private offlineStorageService: OfflineStorageService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
  private authService: AuthService
  ) {
    this.blogForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      category: ['IT', Validators.required],
      content: ['', [Validators.required, Validators.minLength(10)]],
      image: [null],
      imagepath: ['']
    });
  }

  ngOnInit(): void {


    this.authService.getUser().subscribe({
      next: (user) => {
        this.staticUserId = user.id;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load user profile.';
        console.error(error);
      }
    });




    this.isOffline = !navigator.onLine;
    if (this.debugMode) {
      console.log('Initial state:', {
        isOffline: this.isOffline,
        isEditMode: this.isEditMode,
        blogId: this.blogId,
        isBackendAvailable: this.isBackendAvailable
      });
    }
    window.addEventListener('online', () => this.onNetworkStatusChange(true));
    window.addEventListener('offline', () => this.onNetworkStatusChange(false));

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.blogId = +id;
        this.isEditMode = true;
        this.loadBlog(this.blogId);
        this.blogForm.get('image')?.clearValidators();
      } else {
        this.blogForm.get('image')?.setValidators(this.isOffline ? null : Validators.required);
      }
      this.blogForm.get('image')?.updateValueAndValidity();
    });

    if (!this.isOffline) {
      this.checkBackendAvailability();
    }
  }

  private onNetworkStatusChange(isOnline: boolean): void {
    this.isOffline = !isOnline;
    if (this.debugMode) {
      console.log('Network status changed:', {
        isOnline,
        isOffline: this.isOffline,
        isBackendAvailable: this.isBackendAvailable
      });
    }
    if (isOnline) {
      this.blogForm.get('image')?.setValidators(Validators.required);
      this.checkBackendAvailability();
    } else {
      this.isBackendAvailable = false;
      this.blogForm.get('image')?.clearValidators();
    }
    this.blogForm.get('image')?.updateValueAndValidity();
  }

  private checkBackendAvailability(): void {
    this.http.get('http://localhost:8888/BLOG/api/blog').subscribe({
      next: () => {
        this.isBackendAvailable = true;
        this.syncPendingBlogs();
        if (this.debugMode) {
          console.log('Backend is available');
        }
      },
      error: (error) => {
        this.isBackendAvailable = false;
        if (this.debugMode) {
          console.error('Backend unavailable:', error);
        }
      }
    });
  }

  private async syncPendingBlogs(): Promise<void> {
    if (this.isOffline || !this.isBackendAvailable) {
      this.errorMessage = 'Cannot sync while backend is unavailable or offline.';
      return;
    }

    const pendingBlogs = await this.offlineStorageService.getPendingBlogs();
    if (pendingBlogs.length === 0) {
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
  }

  loadBlog(id: number): void {
    this.blogService.getBlog(id).subscribe({
      next: (blog) => {
        this.blogForm.patchValue({
          title: blog.title,
          category: blog.category,
          content: blog.content,
          imagepath: blog.imagepath || ''
        });
        if (blog.imagepath) {
          this.imagePreview = this.getImageUrl(blog.imagepath);
          this.isImageVerified = true;
        }
        this.errorMessage = null;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.successMessage = null;
      }
    });
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    this.selectedImage = null;
    this.imagePreview = null;
    this.isImageVerified = false;
    this.blogForm.get('image')?.setValue(null);

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (this.debugMode) {
        console.log('Image selected:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isOffline: this.isOffline,
          isBackendAvailable: this.isBackendAvailable
        });
      }

      if (this.isOffline || !this.isBackendAvailable) {
        this.selectedImage = file;
        this.isImageVerified = true;
        this.blogForm.get('image')?.setValue(this.selectedImage);
        const reader = new FileReader();
        reader.onload = () => {
          this.imagePreview = reader.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        try {
          let verificationResult: SightengineResponse | undefined;
          if (this.bypassSightengine) {
            if (this.debugMode) {
              console.warn('Bypassing Sightengine verification for testing');
            }
            verificationResult = { status: 'success', summary: { action: 'accept' } };
          } else {
            verificationResult = await this.verifyImage(file).toPromise();
          }

          if (this.debugMode) {
            console.log('Sightengine response:', verificationResult);
          }

          if (verificationResult?.status === 'success' && !this.isImageRejected(verificationResult)) {
            this.selectedImage = file;
            this.isImageVerified = true;
            this.blogForm.get('image')?.setValue(this.selectedImage);
            const reader = new FileReader();
            reader.onload = () => {
              this.imagePreview = reader.result as string;
            };
            reader.readAsDataURL(file);
          } else {
            const errorMsg = verificationResult?.error
              ? `Error ${verificationResult.error.code}: ${verificationResult.error.message}`
              : 'Invalid content detected';
            this.errorMessage = `Image verification failed: ${errorMsg}.`;
            this.selectedImage = null;
            this.imagePreview = null;
            this.isImageVerified = false;
            this.blogForm.get('image')?.setValue(null);
          }
        } catch (error) {
          const errorMsg = error instanceof HttpErrorResponse
            ? `HTTP ${error.status || 0}: ${error.message} (${error.error?.message || error.error?.error || 'Unknown error'})`
            : `Unknown error: ${error}`;
          if (this.debugMode) {
            console.error('Sightengine verification error:', errorMsg, error);
          }
          this.errorMessage = `Error verifying image: ${errorMsg}. Please try again or select a different image.`;
          this.selectedImage = null;
          this.imagePreview = null;
          this.isImageVerified = false;
          this.blogForm.get('image')?.setValue(null);
        }
      }
    } else {
      this.selectedImage = null;
      this.imagePreview = this.isEditMode ? this.getImageUrl(this.blogForm.value.imagepath || '') : null;
      this.isImageVerified = this.isEditMode;
      this.blogForm.get('image')?.setValue(null);
    }
  }

  private verifyImage(file: File) {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('workflow', this.sightengineWorkflow);
    formData.append('api_user', this.sightengineApiUser);
    formData.append('api_secret', this.sightengineApiSecret);
    return this.http.post<SightengineResponse>(this.sightengineApiUrl, formData);
  }

  private isImageRejected(result: SightengineResponse): boolean {
    const action = result.summary?.action?.toLowerCase() || 'accept';
    return action === 'reject';
  }

  getImageUrl(imageName: string): string {
    return `http://localhost:8888/BLOG/api/blog/images/${imageName}`;
  }

  get title() {
    return this.blogForm.get('title');
  }

  get category() {
    return this.blogForm.get('category');
  }

  get content() {
    return this.blogForm.get('content');
  }

  get image() {
    return this.blogForm.get('image');
  }

  private containsBadWords(text: string): string | null {
    const lowerCaseText = text.toLowerCase();
    for (const badWord of this.badWords) {
      if (lowerCaseText.includes(badWord)) {
        return badWord;
      }
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.debugMode) {
      console.log('onSubmit called', {
        formValid: this.blogForm.valid,
        formValue: this.blogForm.value,
        isOffline: this.isOffline,
        isBackendAvailable: this.isBackendAvailable,
        isEditMode: this.isEditMode,
        selectedImage: this.selectedImage,
        isImageVerified: this.isImageVerified
      });
    }

    if (this.blogForm.invalid) {
      this.blogForm.markAllAsTouched();
      this.errorMessage = 'Please fill out all required fields correctly.';
      return;
    }

    const titleBadWord = this.containsBadWords(this.blogForm.value.title);
    const contentBadWord = this.containsBadWords(this.blogForm.value.content);

    if (titleBadWord || contentBadWord) {
      const badWord = titleBadWord || contentBadWord;
      this.errorMessage = `Inappropriate language detected: "${badWord}". Please remove or replace this word.`;
      return;
    }

    if (!this.isEditMode && !this.isOffline && this.isBackendAvailable && !this.selectedImage) {
      this.errorMessage = 'Please select an image.';
      this.blogForm.get('image')?.markAsTouched();
      return;
    }

    if (!this.isEditMode && !this.isOffline && this.isBackendAvailable && this.selectedImage && !this.isImageVerified) {
      this.errorMessage = 'Selected image has not been verified. Please select a valid image.';
      this.blogForm.get('image')?.markAsTouched();
      return;
    }

    const blog: Blog = {
      idBlog: this.isEditMode ? this.blogId : null,
      title: this.blogForm.value.title,
      category: this.blogForm.value.category,
      content: this.blogForm.value.content,
      imagepath: this.blogForm.value.imagepath || '',
      comments: null,
      user: null,
      userId: this.staticUserId,
      isVerified: false
    };

    if (this.isOffline || !this.isBackendAvailable) {
      await this.offlineStorageService.addPendingBlog(blog, this.isEditMode ? 'update' : 'create', this.selectedImage || undefined);
      this.successMessage = this.isEditMode ? 'Blog update queued for sync!' : 'Blog creation queued for sync!';
      this.errorMessage = null;
      this.blogForm.reset({ category: 'IT', imagepath: '' });
      this.selectedImage = null;
      this.imagePreview = null;
      this.isImageVerified = false;
      this.router.navigate(['/blogs']);
      return;
    }

    try {
      let imageName = this.blogForm.value.imagepath || '';
      if (this.selectedImage) {
        const formData = new FormData();
        formData.append('image', this.selectedImage as Blob);
        imageName = await this.blogService.uploadImage(formData).toPromise() || '';
      }

      blog.imagepath = imageName;
      if (!this.isEditMode && !blog.imagepath) {
        this.errorMessage = 'Image upload failed or no image provided.';
        return;
      }

      const observable = this.isEditMode && this.blogId
        ? this.blogService.updateBlog(this.blogId, blog)
        : this.blogService.createBlog(blog);

      observable.subscribe({
        next: () => {
          this.successMessage = this.isEditMode ? 'Blog updated successfully!' : 'Blog created successfully!';
          this.errorMessage = null;
          this.blogForm.reset({ category: 'IT', imagepath: '' });
          this.selectedImage = null;
          this.imagePreview = null;
          this.isImageVerified = false;
          this.router.navigate(['/blogs']);
        },
        error: (error) => {
          this.errorMessage = `Error saving blog: ${error.message}`;
          this.successMessage = null;
        }
      });
    } catch (error) {
      this.errorMessage = `Error uploading image: ${error}`;
      this.successMessage = null;
    }
  }
}
