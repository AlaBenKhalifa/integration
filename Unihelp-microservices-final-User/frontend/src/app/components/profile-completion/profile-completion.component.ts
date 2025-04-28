import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
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
  
  @ViewChild('skillInput') skillInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
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
    // Only process comma or Enter key
    if (event.key === ',' || event.key === 'Enter') {
      event.preventDefault();
      
      const input = this.skillInput.nativeElement as HTMLInputElement;
      const value = input.value.trim();
      
      if (value) {
        // Split by comma in case multiple skills were pasted
        const skillsToAdd = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
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
        input.value = '';
      }
    }
  }
  
  // Kept for backward compatibility
  addSkillFromInput(event: KeyboardEvent): void {
    event.preventDefault();
    
    const input = this.skillInput.nativeElement as HTMLInputElement;
    const value = input.value.trim();
    
    if (value) {
      // Split by comma in case multiple skills were pasted
      const skillsToAdd = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
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
    }
    
    // Clear the input
    input.value = '';
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
      this.profileForm.patchValue({ profileImage: file });
      this.profileForm.get('profileImage')?.updateValueAndValidity();
    }
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
    
    const profileImage = this.profileForm.get('profileImage')?.value;
    if (profileImage) formData.append('profileImage', profileImage);

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
