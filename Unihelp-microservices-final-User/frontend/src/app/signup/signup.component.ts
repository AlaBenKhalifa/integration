import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AvatarService } from '../services/avatar.service';
import { RecaptchaService } from '../services/recaptcha.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

declare const google: any;

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit {
  signupForm: FormGroup;
  errorMessage: string | null = null;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  showPassword = false;
  currentStep = 1;
  isLoading = false;
  
  // Avatar generation properties
  avatarPreviewUrl: SafeUrl | null = null;
  isGeneratingAvatar = false;
  generatedAvatarFile: File | null = null;
  
  @ViewChild('profileImageInput') profileImageInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private avatarService: AvatarService,
    private recaptchaService: RecaptchaService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/),
        ],
      ],
      bio: ['', [Validators.minLength(10)]],
      skills: [''], // Hidden control for backend
      skillsList: [[] as string[], Validators.required], // Require at least one skill
      role: [''],
      profileImage: [null],
    });

    // Sync skillsList to skills
    this.signupForm.get('skillsList')?.valueChanges.subscribe((skills: string[]) => {
      this.signupForm.get('skills')?.setValue(skills.join(','), { emitEvent: false });
    });
  }

  ngOnInit(): void {
    // Initialize Google Sign-In after DOM is fully loaded
    setTimeout(() => {
      this.initializeGoogleSignIn();
    }, 1000);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.signupForm.get('firstName')?.valid && this.signupForm.get('lastName')?.valid) {
        this.currentStep++;
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Incomplete Fields',
          text: 'Please fill in all required fields to proceed.',
          confirmButtonText: 'OK'
        });
      }
    } else if (this.currentStep === 2) {
      if (this.signupForm.get('email')?.valid && this.signupForm.get('password')?.valid) {
        this.currentStep++;
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Incomplete Fields',
          text: 'Please fill in all required fields to proceed.',
          confirmButtonText: 'OK'
        });
      }
    }
  }

  addSkill(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      const skills = this.signupForm.get('skillsList')?.value || [];
      if (!skills.includes(value)) {
        skills.push(value);
        this.signupForm.get('skillsList')?.setValue(skills);
      }
    }
    event.chipInput!.clear();
  }

  removeSkill(skill: string): void {
    const skills = this.signupForm.get('skillsList')?.value || [];
    const index = skills.indexOf(skill);
    if (index >= 0) {
      skills.splice(index, 1);
      this.signupForm.get('skillsList')?.setValue(skills);
    }
  }

  onFileChange(event: Event): void {
    console.log('File change triggered');
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size must be less than 5MB';
        this.signupForm.get('profileImage')?.setErrors({ size: true });
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        this.errorMessage = 'Only JPEG or PNG images are allowed';
        this.signupForm.get('profileImage')?.setErrors({ type: true });
        return;
      }
      
      // Clear any generated avatar when a file is uploaded
      this.generatedAvatarFile = null;
      this.avatarPreviewUrl = null;
      
      // Create a preview URL for the selected file
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreviewUrl = this.sanitizer.bypassSecurityTrustUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      this.signupForm.patchValue({ profileImage: file });
      this.signupForm.get('profileImage')?.updateValueAndValidity();
    }
  }
  
  /**
   * Generate a random avatar using the avatar service
   */
  generateAvatar(): void {
    this.isGeneratingAvatar = true;
    
    // Use email as seed if available, otherwise use a random seed
    let seed = this.signupForm.get('email')?.value || Math.random().toString(36).substring(2, 8);
    
    this.avatarService.generateAvatar(seed).subscribe(blob => {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(blob);
      this.avatarPreviewUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      
      // Convert SVG to PNG for better compatibility with backend
      this.avatarService.convertSvgToPng(blob).then(pngFile => {
        // Store the avatar PNG file for form submission
        this.generatedAvatarFile = pngFile;
        
        // Update the form with the generated avatar
        this.signupForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.signupForm.get('profileImage')?.updateValueAndValidity();
        
        this.isGeneratingAvatar = false;
      }).catch(error => {
        console.error('Error converting SVG to PNG:', error);
        
        // Fallback to SVG if conversion fails
        this.generatedAvatarFile = this.avatarService.blobToFile(blob, `avatar-${Date.now()}.svg`);
        this.signupForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.signupForm.get('profileImage')?.updateValueAndValidity();
        
        this.isGeneratingAvatar = false;
      });
    });
  }
  
  /**
   * Generate a different style of avatar
   */
  changeAvatarStyle(): void {
    this.isGeneratingAvatar = true;
    this.avatarService.nextStyle();
    
    // Use the same seed for consistency
    let seed = this.signupForm.get('email')?.value || Math.random().toString(36).substring(2, 8);
    
    this.avatarService.generateAvatar(seed).subscribe(blob => {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(blob);
      this.avatarPreviewUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      
      // Convert SVG to PNG
      this.avatarService.convertSvgToPng(blob).then(pngFile => {
        this.generatedAvatarFile = pngFile;
        this.signupForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.signupForm.get('profileImage')?.updateValueAndValidity();
        this.isGeneratingAvatar = false;
      }).catch(error => {
        console.error('Error converting SVG to PNG:', error);
        // Fallback to SVG
        this.generatedAvatarFile = this.avatarService.blobToFile(blob, `avatar-${Date.now()}.svg`);
        this.signupForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.signupForm.get('profileImage')?.updateValueAndValidity();
        this.isGeneratingAvatar = false;
      });
    });
  }

  onSubmit(): void {
    console.log('Form submitted');
    console.log('Form valid:', this.signupForm.valid);
    console.log('Form value:', this.signupForm.value);
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      console.log('Form errors:', this.signupForm.errors);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Execute reCAPTCHA verification before form submission
    console.log('Executing reCAPTCHA verification');
    this.recaptchaService.executeRecaptcha('signup')
      .pipe(
        finalize(() => {
          // This ensures loading state is reset if reCAPTCHA fails
          if (this.isLoading && !this.signupForm.valid) {
            this.isLoading = false;
          }
        })
      )
      .subscribe({
        next: (token) => {
          console.log('reCAPTCHA validation successful');
          this.submitSignupForm(token);
        },
        error: (error) => {
          console.error('reCAPTCHA validation failed:', error);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Verification Failed',
            text: 'We could not verify that you are human. Please try again.',
            confirmButtonText: 'OK'
          });
        }
      });
  }

  /**
   * Submit the signup form with reCAPTCHA token
   * @param recaptchaToken The reCAPTCHA token from Google
   */
  private submitSignupForm(recaptchaToken: string): void {
    const formData = new FormData();
    formData.append('firstName', this.signupForm.get('firstName')?.value);
    formData.append('lastName', this.signupForm.get('lastName')?.value);
    formData.append('email', this.signupForm.get('email')?.value);
    formData.append('password', this.signupForm.get('password')?.value);
    // Add the reCAPTCHA token to the form data
    formData.append('g-recaptcha-response', recaptchaToken);

    const bio = this.signupForm.get('bio')?.value;
    if (bio) formData.append('bio', bio);
    const skills = this.signupForm.get('skills')?.value;
    if (skills) formData.append('skills', skills);
    const role = this.signupForm.get('role')?.value;
    if (role) formData.append('role', role);
    const profileImage = this.signupForm.get('profileImage')?.value;
    if (profileImage) formData.append('profileImage', profileImage);

    console.log('Sending request to backend');
    this.authService.register(formData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.isLoading = false;
        this.errorMessage = null;
        Swal.fire({
          icon: 'success',
          title: 'Sign Up Successful',
          text: 'You have signed up successfully!',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        console.error('Registration error:', err);
        this.isLoading = false;
        this.errorMessage =
          err.message || 'Registration failed. Please try again.';
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Note: signInWithGoogle method removed as we're now using FedCM with rendered buttons
  // and initializing Google Sign-In in ngOnInit

  private initializeGoogleSignIn(): void {
    try {
      // Use the actual Google Client ID
      const clientId = '464900684466-96jtnmiv303pv1tfgh9c4010cb0dobvq.apps.googleusercontent.com';

      google.accounts.id.initialize({
        client_id: clientId,
        callback: this.handleGoogleSignIn.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true, // Enable FedCM
        itp_support: true // Add ITP support for Safari
      });

      // Instead of using prompt(), render a button
      // Make sure you have a div with id 'google-signup-button' in your HTML template
      const buttonElement = document.getElementById('google-signup-button');
      if (buttonElement) {
        google.accounts.id.renderButton(buttonElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 250
        });
      } else {
        console.error('Google sign-up button element not found');
      }
    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
    }
  }

  private handleGoogleSignIn(response: any): void {
    try {
      console.log('Google Sign-In response received:', response);
      const idToken = response.credential;

      if (!idToken) {
        console.error('No credential found in Google response');
        Swal.fire({
          icon: 'error',
          title: 'Sign In Failed',
          text: 'No credential received from Google. Please try again.',
          confirmButtonText: 'OK'
        });
        return;
      }

      this.isLoading = true;
      console.log('Sending Google token to backend...');

      this.authService.loginWithGoogle(idToken).subscribe({
        next: (response) => {
          console.log('Backend response:', response);
          this.isLoading = false;
          const role = response.role;

          if (role === 'ADMIN') {
            // Do NOT store session in localStorage for admin
            Swal.fire({
              icon: 'success',
              title: 'Login Successful',
              text: 'You have logged in with Google successfully!',
              showConfirmButton: false,
              timer: 1500
            }).then(() => {
              // Pass token and user as query params for handoff
              const token = response.token;
              const user = JSON.stringify({
                id: response.id,
                email: response.email,
                role: response.role
              });
              window.location.href = `http://localhost:4201/session-handoff?token=${encodeURIComponent(token)}&user=${encodeURIComponent(user)}`;
            });
          } else {
            // Non-admin: store session in localStorage
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify({
              id: response.id,
              email: response.email,
              role: response.role,
              profileCompleted: response.profileCompleted,
              newUser: response.newUser
            }));

            // Log profile completion status for debugging
            console.log('Profile completion status:', {
              newUser: response.newUser,
              profileCompleted: response.profileCompleted
            });

            Swal.fire({
              icon: 'success',
              title: 'Sign In Successful',
              text: 'You have signed in with Google successfully!',
              showConfirmButton: false,
              timer: 1500
            }).then(() => {
              // Check if profile needs to be completed
              if (response.newUser || !response.profileCompleted) {
                console.log('Redirecting to profile completion page');
                this.router.navigate(['/complete-profile']);
              } else {
                console.log('Redirecting to profile page');
                this.router.navigate(['/profile']);
              }
            });
          }
        },
        error: (err) => {
          console.error('Error from backend:', err);
          this.isLoading = false;
          let errorMessage = 'Google sign-in failed. Please try again.';

          if (err.error && typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.message) {
            errorMessage = err.message;
          } else if (err.status === 0) {
            errorMessage = 'Cannot connect to the server. Please check if the backend is running.';
          }

          this.errorMessage = errorMessage;
          Swal.fire({
            icon: 'error',
            title: 'Sign In Failed',
            text: this.errorMessage,
            confirmButtonText: 'OK'
          });
        }
      });
    } catch (error) {
      console.error('Unexpected error in handleGoogleSignIn:', error);
      this.isLoading = false;
      Swal.fire({
        icon: 'error',
        title: 'Sign In Failed',
        text: 'An unexpected error occurred. Please try again later.',
        confirmButtonText: 'OK'
      });
    }
  }
}
