import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  showOptions: boolean = false;
  unreadMessagesCount: number = 0;
  unreadNotificationsCount: number = 0;
  currentUser: User | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isLoggedIn = this.authService.isLoggedIn();
    });
  }

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      // Get current user profile
      this.authService.getCurrentUserProfile().subscribe({
        next: (user: User) => {
          this.currentUser = user;
          console.log('User profile loaded in header:', user);
        },
        error: (error) => {
          console.error('Error loading user profile in header:', error);
        }
      });
      
      // Subscribe to unread messages count
      const msgSubscription = this.messageService.getUnreadCount().subscribe(response => {
        this.unreadMessagesCount = response.count;
      });
      this.subscriptions.push(msgSubscription);
      
      // Subscribe to unread notifications count
      const notifSubscription = this.notificationService.getUnreadCount().subscribe(response => {
        this.unreadNotificationsCount = response.count;
      });
      this.subscriptions.push(notifSubscription);
    }
  }

  toggleLoginState() {
    if (this.isLoggedIn) {
      // Only attempt to logout if currently logged in
      this.authService.logout().subscribe({
        next: () => {
          this.isLoggedIn = false;
          this.currentUser = null;
          // Clear any auth-related data
          localStorage.removeItem('token');
          // Redirect to login page
          this.router.navigate(['/login']).then(() => {
            // Force a page reload to ensure all components update their state
            window.location.reload();
          });
        },
        error: (err) => {
          console.error('Logout failed:', err);
          // Even if API fails, clear local data and redirect
          this.isLoggedIn = false;
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        }
      });
    }
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-has-children')) {
      this.showOptions = false;
    }
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }
  
  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Get profile image URL for a user with base64 handling
  getProfileImageUrl(profileImage?: string | null): string {
    if (!profileImage) {
      return 'assets/img/default-user.png';
    }
    
    // Check if the image is already a URL (starts with http or assets/)
    if (profileImage.startsWith('http') || profileImage.startsWith('assets/')) {
      return profileImage;
    }
    
    // Handle base64 image data - add the data URL prefix if not already present
    if (!profileImage.startsWith('data:')) {
      return `data:image/jpeg;base64,${profileImage}`;
    }
    
    // Image already has data URL prefix
    return profileImage;
  }
}
