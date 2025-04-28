import { Component, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit, OnChanges {
  @Output() resetLinkSent = new EventEmitter<void>();
  @Input() token: string | null = null;
  resetPasswordForm: FormGroup;
  newPasswordForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;
  showNewPassword = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private cdRef: ChangeDetectorRef) {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
    this.newPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit(): void {
    console.log('[ResetPasswordComponent.ngOnInit] token:', this.token);
    if (this.token) {
      this.showNewPassword = true;
      this.cdRef.detectChanges();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[ResetPasswordComponent.ngOnChanges] token:', changes['token']?.currentValue);
    if (changes['token'] && changes['token'].currentValue) {
      this.showNewPassword = true;
      this.cdRef.detectChanges();
    }
  }

  passwordsMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (!this.showNewPassword) {
      // Request reset link
      if (this.resetPasswordForm.valid) {
        this.isLoading = true;
        this.errorMessage = null;
        const email = this.resetPasswordForm.get('email')?.value;
        this.authService.forgotPassword(email).subscribe({
          next: (response: any) => {
            this.isLoading = false;
            if (typeof response === 'string') {
  const respStr = response.toLowerCase();
  if (respStr.includes('success') || respStr.includes('sent') || respStr.includes('email')) {
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: 'Password reset link sent to your email.'
    });
    this.emitSuccess();
  } else if (respStr.includes('not found') || respStr.includes('no user')) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: response
    });
    this.errorMessage = null;
  } else {
    Swal.fire({
      icon: 'info',
      title: 'Info',
      text: response
    });
    this.errorMessage = null;
  }
} else if (typeof response === 'object' && response !== null) {
              // Only show error if response.message is a non-empty string and not a generic object
              if (typeof response.message === 'string' && response.message.trim() !== '' && !response.message.toLowerCase().includes('success')) {
                Swal.fire({
  icon: 'error',
  title: 'Error',
  text: response.message
});
this.errorMessage = null;
              } else if (
                response.success === true ||
                response.status === 'success' ||
                Object.keys(response).length === 0 ||
                (typeof response.message === 'string' && response.message.toLowerCase().includes('success'))
              ) {
                this.emitSuccess();
              } else {
                // If message is not a string or is empty, do not show error
                this.errorMessage = null;
                this.emitSuccess();
              }
            } else if (!response) {
              this.emitSuccess();
            } else {
              Swal.fire({
  icon: 'error',
  title: 'Error',
  text: 'Unexpected response from server.'
});
this.errorMessage = null;
            }
          },
          error: (err) => {
            this.isLoading = false;
            if (err.error && typeof err.error === 'object') {
              Swal.fire({
  icon: 'error',
  title: 'Error',
  text: err.error.message || 'Failed to send reset link. Please try again later.'
});
this.errorMessage = null;
            } else if (typeof err.error === 'string') {
              Swal.fire({
  icon: 'error',
  title: 'Error',
  text: err.error
});
this.errorMessage = null;
            } else {
              Swal.fire({
  icon: 'error',
  title: 'Error',
  text: err.message || 'Failed to send reset link. Please try again later.'
});
this.errorMessage = null;
            }
          },
        });
      }
    } else {
      // Reset password with token
      if (this.newPasswordForm.valid) {
        this.isLoading = true;
        this.errorMessage = null;
        const newPassword = this.newPasswordForm.get('newPassword')?.value;
        this.authService.resetPasswordWithToken(this.token!, newPassword).subscribe({
          next: () => {
            this.isLoading = false;
            Swal.fire({
  icon: 'success',
  title: 'Success',
  text: 'Password successfully reset! You can now log in.'
});
this.successMessage = null;
          },
          error: (err) => {
            this.isLoading = false;
            Swal.fire({
  icon: 'error',
  title: 'Error',
  text: err.error?.message || err.message || 'Failed to reset password. Please try again.'
});
this.errorMessage = null;
          },
        });
      }
    }
  }

  private emitSuccess() {
    this.errorMessage = null;
    this.successMessage = null;
    console.log('[ResetPasswordComponent.emitSuccess] Emitting resetLinkSent event');
    this.resetLinkSent.emit();
  }
}
