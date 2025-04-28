import { Component, Output, EventEmitter, Input } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password-modal',
  templateUrl: './reset-password-modal.component.html',
  styleUrls: ['./reset-password-modal.component.css'],
})
export class ResetPasswordModalComponent {
  @Output() close = new EventEmitter<void>();
  @Input() token: string | null = null;

  closeModal() {
    this.close.emit();
  }

  async onResetLinkSent() {
    console.log('[ResetPasswordModalComponent.onResetLinkSent] SweetAlert will be shown');
    await Swal.fire({
      icon: 'success',
      title: 'Reset Link Sent',
      text: 'Please check your email for the password reset link.',
      confirmButtonText: 'OK'
    });
    // Only close after user confirms
    this.closeModal();
  }
}
