import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FingerprintService } from '../../services/fingerprint.service';
import { RecaptchaService } from '../../services/recaptcha.service';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  isModalOpen = false;
  showPassword = false;
  resetToken: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private fingerprintService: FingerprintService,
    private recaptchaService: RecaptchaService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // DEBUG: Add test login event for development
    this.addTestLoginEvent();
    
    // Detect token in query params for password reset
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.resetToken = token;
        this.isModalOpen = true;
      }
    });

    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (userData && token && this.authService.isLoggedIn()) {
      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      if (exp < Date.now()) {
        // Token is expired, clear localStorage and stay on login
        this.authService.logout().subscribe({
          next: () => {},
          error: () => {},
        });
        return;
      }

      const { id } = JSON.parse(userData);
      this.authService.getUserById(id).subscribe({
        next: () => {
          const role = this.authService.getUserRole();
          if (role === 'ADMIN') {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/profile']);
          }
        },
        error: () => {
          this.authService.logout().subscribe({
            next: () => {},
            error: () => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.clear();
            },
          });
        },
      });
    }
    
    // Initialize Google Sign-In after DOM is fully loaded
    setTimeout(() => {
      this.initializeGoogleSignIn();
    }, 1000);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  goToResetPassword(): void {
    this.isModalOpen = true;
    this.resetToken = null;
  }

  closeResetModal(): void {
    this.isModalOpen = false;
    this.resetToken = null;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;
      
      // Execute reCAPTCHA verification before login submission
      console.log('Executing reCAPTCHA verification for login');
      this.recaptchaService.executeRecaptcha('login')
        .pipe(
          finalize(() => {
            // This ensures loading state is reset if reCAPTCHA fails
            if (this.isLoading && !this.loginForm.valid) {
              this.isLoading = false;
            }
          })
        )
        .subscribe({
          next: (token) => {
            console.log('reCAPTCHA validation successful');
            this.submitLoginForm(token);
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
  }
  
  /**
   * Submit the login form with reCAPTCHA token
   * @param recaptchaToken The reCAPTCHA token from Google
   */
  private submitLoginForm(recaptchaToken: string): void {
    const loginRequest = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value,
      'g-recaptcha-response': recaptchaToken
    };

    console.log('📝 Login attempt for:', loginRequest.email);
    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        const role = response.role;
        console.log('🔑 Login successful for:', response.email, 'with ID:', response.id);
        
        // DIRECT SAVING: Store login event in localStorage immediately
        this.directlySaveLoginEvent(response.id, response.email, role);
        
        // Track login BEFORE potential redirect
        this.trackUserLogin(response.id, response.email, undefined, undefined, role);
        
        // Store login event in sessionStorage so it's available across domains
        this.storeLoginEventForAdmin(response.id, response.email, response.role);
        
        if (role === 'ADMIN') {
          // Do NOT store session in localStorage for admin
          Swal.fire({
            icon: 'success',
            title: 'Login Successful',
            text: 'You have logged in successfully!',
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
            role: response.role
          }));
          Swal.fire({
            icon: 'success',
            title: 'Login Successful',
            text: 'You have logged in successfully!',
            showConfirmButton: false,
            timer: 1500
          }).then(() => {
            this.router.navigate(['/profile']);
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        
        // Check if the error is about a banned account
        if (err.status === 403 && err.error === 'User account is banned.') {
          Swal.fire({
            icon: 'error',
            title: 'Account Banned',
            text: 'Your account has been banned. Please contact support.',
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Wrong credentials. Please try again.',
          });
        }
        
        // Clear localStorage on failed login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      },
    });
  }

  goToSignUp(): void {
    this.router.navigate(['/signup']);
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
      // Make sure you have a div with id 'google-login-button' in your HTML template
      const buttonElement = document.getElementById('google-login-button');
      if (buttonElement) {
        google.accounts.id.renderButton(buttonElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 250
        });
      } else {
        console.error('Google login button element not found');
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
          
          // Track Google sign-in login with FingerprintJS
          console.log('🔑 Google login successful for:', response.email, 'with ID:', response.id);
          
          // Track login BEFORE potential redirect
          this.trackUserLogin(response.id, response.email, undefined, undefined, response.role);
          
          // Store login event in sessionStorage so it's available across domains
          this.storeLoginEventForAdmin(response.id, response.email, response.role);
          
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
              title: 'Login Successful',
              text: 'You have logged in with Google successfully!',
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
  
  /**
   * Tracks user login with device fingerprinting
   * This is completely client-side and requires no backend changes
   * Also forwards login events to the admin dashboard
   */
  /**
   * DIRECT METHOD: Store login event in localStorage for immediate access
   * This ensures login events are available in both applications
   */
  private directlySaveLoginEvent(userId: number, userEmail: string, role?: string): void {
    try {
      console.log('📝 DIRECT SAVING: Creating login event for', userEmail);
      
      // Create device info directly from browser
      const deviceInfo = {
        visitorId: `direct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        browserName: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown Browser',
        osName: navigator.userAgent.includes('Windows') ? 'Windows' : 
               navigator.userAgent.includes('Mac') ? 'macOS' : 
               navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown OS',
        deviceType: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      };
      
      // Create login event
      const loginEvent = {
        userId,
        userName: userEmail.split('@')[0],
        userEmail,
        userRole: role,
        timestamp: Date.now(),
        deviceInfo
      };
      
      // Store in ALL possible locations to ensure it's accessible everywhere
      const storageKeys = [
        'unihelp_login_events',
        'admin_login_events',
        'unihelp_admin_login_events'
      ];
      
      // Store in each location
      for (const key of storageKeys) {
        try {
          const existing = localStorage.getItem(key);
          const events = existing ? JSON.parse(existing) : [];
          events.push(loginEvent);
          localStorage.setItem(key, JSON.stringify(events));
          console.log(`✅ Saved login event to ${key}`);
        } catch (e) {
          console.error(`Error saving to ${key}:`, e);
        }
      }
      
      // Also store in sessionStorage for cross-domain access
      sessionStorage.setItem('latest_login_event', JSON.stringify(loginEvent));
      console.log('✅ Saved login event to sessionStorage');
      
    } catch (error) {
      console.error('❌ Error saving login event:', error);
    }
  }
  
  private async trackUserLogin(
    userId: number, 
    userEmail: string, 
    firstName?: string, 
    lastName?: string,
    role?: string
  ): Promise<void> {
    console.log('🔍 TRACKING LOGIN:', userId, userEmail);
    
    if (!userId) {
      console.warn('⚠️ Cannot track login: User ID not provided');
      return;
    }
    
    try {
      // Create a user-friendly display name
      const userName = firstName && lastName 
        ? `${firstName} ${lastName}`.trim() 
        : (firstName || userEmail.split('@')[0]);
      
      // 1. Record login locally - passing the role to the fingerprint service
      await this.fingerprintService.recordLogin(userId, userName, userEmail, role);
      console.log('✅ Login tracked successfully for:', userEmail, role ? `[${role}]` : '');
      
      // 2. Also send to the admin dashboard
      this.sendLoginEventToAdminDashboard(userId, userEmail, userName, role);
    } catch (error) {
      console.error('❌ Error tracking login:', error);
    }
  }
  
  /**
   * Sends the login event to the Admin Dashboard (BackOffice)
   * This allows tracking logins across both applications
   */
  private async sendLoginEventToAdminDashboard(
    userId: number, 
    userEmail: string,
    userName: string = userEmail,
    userRole: string = 'UNKNOWN'
  ): Promise<void> {
    try {
      // Get device info directly
      const deviceInfo = await this.fingerprintService.getDeviceInfo();
      
      // Create the login event payload
      const loginEvent = {
        userId,
        userName,
        userEmail,
        userRole,
        timestamp: Date.now(),
        deviceInfo
      };
      
      // Store in BOTH apps' localStorage to ensure data is available everywhere
      const storageKeys = ['unihelp_login_events', 'admin_login_events', 'unihelp_admin_login_events'];
      for (const key of storageKeys) {
        try {
          const existing = localStorage.getItem(key);
          const events = existing ? JSON.parse(existing) : [];
          events.push(loginEvent);
          localStorage.setItem(key, JSON.stringify(events));
        } catch (e) {
          console.error(`Error saving to ${key}:`, e);
        }
      }
      
      // Also store in sessionStorage
      sessionStorage.setItem('latest_login_event', JSON.stringify(loginEvent));
      
      console.log('💬 Sent login event to admin dashboard:', loginEvent);
      
      // Send a cross-domain message to the BackOffice (if it's open)
      // This is a non-blocking, best-effort approach
      try {
        const adminUrl = 'http://localhost:4201';
        const message = {
          type: 'LOGIN_EVENT',
          payload: loginEvent
        };
        
        // Try to post a message to any open admin windows
        window.postMessage(message, '*');
        console.log('📬 Broadcast login event to any open admin windows');
      } catch (e) {
        // Ignore errors from cross-domain messaging
        console.log('ℹ️ Admin dashboard not active, event stored locally');
      }
    } catch (error) {
      console.error('❌ Error sending login event to admin dashboard:', error);
    }
  }
  
  /**
   * Stores login event in sessionStorage to make it available across domains
   * This helps with the admin redirection flow
   */
  private storeLoginEventForAdmin(userId: number, userEmail: string, role?: string): void {
    try {
      // Only store if this is an admin login
      if (role === 'ADMIN') {
        // Store minimal login info in sessionStorage for cross-domain access
        const loginInfo = { userId, userEmail, timestamp: Date.now() };
        sessionStorage.setItem('admin_login_info', JSON.stringify(loginInfo));
        console.log('✅ Saved admin login info to sessionStorage for handoff');
      }
    } catch (error) {
      console.error('Error storing admin login info:', error);
    }
  }
  
  /**
   * Adds test login events to help with debugging
   * This is only used during development
   */
  private addTestLoginEvent(): void {
    try {
      console.log('📝 Adding test login events for development');
      
      // Create some test users
      const testUsers = [
        { userId: 1, userEmail: 'admin@unihelp.com', userName: 'Admin User', userRole: 'ADMIN' },
        { userId: 2, userEmail: 'student@unihelp.com', userName: 'Student User', userRole: 'STUDENT' },
        { userId: 3, userEmail: 'professor@unihelp.com', userName: 'Professor User', userRole: 'PROFESSOR' }
      ];
      
      // Generate sample login events
      for (const user of testUsers) {
        this.fingerprintService.getDeviceInfo().then(deviceInfo => {
          // Create login event
          const loginEvent = {
            userId: user.userId,
            userName: user.userName,
            userEmail: user.userEmail,
            userRole: user.userRole,
            timestamp: Date.now() - Math.floor(Math.random() * 1000000),  // Random time in the past
            deviceInfo
          };
          
          // Add directly to all storage mechanisms
          const keys = ['unihelp_login_events', 'unihelp_admin_login_events', 'admin_login_events'];
          
          for (const key of keys) {
            const existingJson = localStorage.getItem(key);
            const existing = existingJson ? JSON.parse(existingJson) : [];
            existing.push(loginEvent);
            localStorage.setItem(key, JSON.stringify(existing));
          }
          
          // Also save to sessionStorage
          sessionStorage.setItem('latest_login_event', JSON.stringify(loginEvent));
          
          console.log(`✅ Added test login for ${user.userName}`);
        });
      }
    } catch (error) {
      console.error('Error adding test login events:', error);
    }
  }
}
