import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AvatarService } from '../../services/avatar.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile-completion',
  templateUrl: './profile-completion.component.html',
  styleUrls: ['./profile-completion.component.css']
})
export class ProfileCompletionComponent implements OnInit {
  profileForm: FormGroup;
  errorMessage: string | null = null;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  isLoading = false;
  userId: number = 0; // Initialize with default value
  
  // Avatar generation properties
  avatarPreviewUrl: SafeUrl | null = null;
  isGeneratingAvatar = false;
  generatedAvatarFile: File | null = null;
  
  @ViewChild('skillInput') skillInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private avatarService: AvatarService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      bio: ['', [Validators.required, Validators.minLength(10)]],
      skills: [''], // Hidden control for backend
      skillsList: [[] as string[], Validators.required], // Require at least one skill
      role: ['', Validators.required],
      profileImage: [null]
    });

    // Sync skillsList to skills
    this.profileForm.get('skillsList')?.valueChanges.subscribe((skills: string[]) => {
      this.profileForm.get('skills')?.setValue(skills.join(','), { emitEvent: false });
    });

    // Get user ID from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userId = user.id;
    } else {
      // Redirect to login if no user info is found
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {
    // Check if the user has already completed their profile
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.profileCompleted) {
        // User has already completed their profile, redirect to dashboard
        this.router.navigate(['/profile']);
      }
    }
  }

  // This method is kept for backward compatibility but won't be used with the new UI
  addSkill(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      const skills = this.profileForm.get('skillsList')?.value || [];
      if (!skills.includes(value)) {
        skills.push(value);
        this.profileForm.get('skillsList')?.setValue(skills);
      }
    }
    event.chipInput!.clear();
  }
  
  // Handle keydown events for the skills input
  handleSkillInputKeydown(event: KeyboardEvent): void {
    // Process skill input on comma or Enter key
    if (event.key === ',' || event.key === 'Enter') {
      event.preventDefault();
      
      const input = this.skillInput.nativeElement as HTMLInputElement;
      const value = input.value.trim();
      
      if (value) {
        this.processSkillInput(value);
      }
    }
  }
  
  // Helper method to process skill input
  private processSkillInput(inputValue: string): void {
    // Split by comma and process each skill
    const skillsToAdd = inputValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    const currentSkills = this.profileForm.get('skillsList')?.value || [];
    
    // Add each skill if it's not already in the list
    let skillsAdded = false;
    for (const skill of skillsToAdd) {
      if (skill && !currentSkills.includes(skill)) {
        currentSkills.push(skill);
        skillsAdded = true;
      }
    }
    
    if (skillsAdded) {
      this.profileForm.get('skillsList')?.setValue([...currentSkills]);
      this.profileForm.get('skillsList')?.markAsTouched();
    }
    
    // Clear the input
    this.skillInput.nativeElement.value = '';
  }
  
  // Kept for backward compatibility
  addSkillFromInput(event: KeyboardEvent): void {
    event.preventDefault();
    
    const input = this.skillInput.nativeElement as HTMLInputElement;
    const value = input.value.trim();
    
    if (value) {
      // Use the shared processing method
      this.processSkillInput(value);
    }
  }

  removeSkill(skill: string): void {
    const skills = this.profileForm.get('skillsList')?.value || [];
    const index = skills.indexOf(skill);
    if (index >= 0) {
      skills.splice(index, 1);
      this.profileForm.get('skillsList')?.setValue(skills);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size must be less than 5MB';
        this.profileForm.get('profileImage')?.setErrors({ size: true });
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        this.errorMessage = 'Only JPEG or PNG images are allowed';
        this.profileForm.get('profileImage')?.setErrors({ type: true });
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
      
      this.profileForm.patchValue({ profileImage: file });
      this.profileForm.get('profileImage')?.updateValueAndValidity();
    }
  }
  
  /**
   * Generate a random avatar using the avatar service
   */
  generateAvatar(): void {
    this.isGeneratingAvatar = true;
    
    // Use user's email or ID as seed for consistent avatars
    const userStr = localStorage.getItem('user');
    let seed = this.userId.toString();
    
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.email) {
        seed = user.email;
      }
    }
    
    this.avatarService.generateAvatar(seed).subscribe(blob => {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(blob);
      this.avatarPreviewUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      
      // Convert SVG to PNG for better compatibility with backend
      this.avatarService.convertSvgToPng(blob).then(pngFile => {
        // Store the avatar PNG file for form submission
        this.generatedAvatarFile = pngFile;
        
        // Update the form with the generated avatar
        this.profileForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.profileForm.get('profileImage')?.updateValueAndValidity();
        
        this.isGeneratingAvatar = false;
      }).catch(error => {
        console.error('Error converting SVG to PNG:', error);
        
        // Fallback to SVG if conversion fails
        this.generatedAvatarFile = this.avatarService.blobToFile(blob, `avatar-${Date.now()}.svg`);
        this.profileForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.profileForm.get('profileImage')?.updateValueAndValidity();
        
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
    const userStr = localStorage.getItem('user');
    let seed = this.userId.toString();
    
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.email) {
        seed = user.email;
      }
    }
    
    this.avatarService.generateAvatar(seed).subscribe(blob => {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(blob);
      this.avatarPreviewUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      
      // Convert SVG to PNG
      this.avatarService.convertSvgToPng(blob).then(pngFile => {
        this.generatedAvatarFile = pngFile;
        this.profileForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.profileForm.get('profileImage')?.updateValueAndValidity();
        this.isGeneratingAvatar = false;
      }).catch(error => {
        console.error('Error converting SVG to PNG:', error);
        // Fallback to SVG
        this.generatedAvatarFile = this.avatarService.blobToFile(blob, `avatar-${Date.now()}.svg`);
        this.profileForm.patchValue({ profileImage: this.generatedAvatarFile });
        this.profileForm.get('profileImage')?.updateValueAndValidity();
        this.isGeneratingAvatar = false;
      });
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;

    const formData = new FormData();
    formData.append('userId', this.userId.toString());
    
    const bio = this.profileForm.get('bio')?.value;
    if (bio) formData.append('bio', bio);
    
    const skills = this.profileForm.get('skills')?.value;
    if (skills) formData.append('skills', skills);
    
    const role = this.profileForm.get('role')?.value;
    if (role) formData.append('role', role);
    
    // Use either the generated avatar file or the uploaded profile image
    let profileImage = this.profileForm.get('profileImage')?.value;
    if (profileImage) {
      if (this.generatedAvatarFile && profileImage === this.generatedAvatarFile) {
        console.log('Using generated avatar for profile');
      } else {
        console.log('Using uploaded image for profile');
      }
      formData.append('profileImage', profileImage);
    }

    this.authService.completeProfile(this.userId, formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Profile Completed',
          text: 'Your profile has been completed successfully!',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          this.router.navigate(['/profile']);
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Failed to complete profile. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.errorMessage || 'An error occurred',
          confirmButtonText: 'OK'
        });
      }
    });
  }
}
