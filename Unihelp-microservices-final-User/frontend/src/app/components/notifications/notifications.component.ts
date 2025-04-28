import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  isLoading: boolean = true;
  page: number = 0;
  size: number = 10;
  hasMoreNotifications: boolean = false;
  loadingMore: boolean = false;
  refreshSubscription: Subscription = new Subscription();

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
    
    // Set up automatic refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.refreshNotifications();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // Load notifications
  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getNotificationsPaginated(this.page, this.size).subscribe({
      next: (data) => {
        this.notifications = data.content;
        this.hasMoreNotifications = !data.last;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoading = false;
      }
    });
  }

  // Load more notifications
  loadMoreNotifications(): void {
    if (this.loadingMore || !this.hasMoreNotifications) return;

    this.loadingMore = true;
    this.page++;
    this.notificationService.getNotificationsPaginated(this.page, this.size).subscribe({
      next: (data) => {
        this.notifications = [...this.notifications, ...data.content];
        this.hasMoreNotifications = !data.last;
        this.loadingMore = false;
      },
      error: (error) => {
        console.error('Error loading more notifications:', error);
        this.loadingMore = false;
      }
    });
  }

  // Refresh notifications
  refreshNotifications(): void {
    this.page = 0;
    this.notificationService.getNotificationsPaginated(this.page, this.size).subscribe({
      next: (data) => {
        this.notifications = data.content;
        this.hasMoreNotifications = !data.last;
      },
      error: (error) => {
        console.error('Error refreshing notifications:', error);
      }
    });
  }

  // Mark a notification as read
  markAsRead(notification: any): void {
    if (notification.read) return;

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(notification => {
          notification.read = true;
        });
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  // Delete a notification
  deleteNotification(notification: any, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
      },
      error: (error) => {
        console.error('Error deleting notification:', error);
      }
    });
  }

  // Handle notification click based on type
  handleNotificationClick(notification: any): void {
    // Mark as read first
    this.markAsRead(notification);

    // Navigate based on notification type
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        this.router.navigate(['/friends'], { queryParams: { tab: 'requests' } });
        break;
      case 'FRIEND_ACCEPTED':
        this.router.navigate(['/friends']);
        break;
      case 'MESSAGE':
        // Navigate to message with specific user
        this.router.navigate(['/messages', notification.referenceId]);
        break;
      default:
        // Default action - no navigation
        break;
    }
  }

  // Format date for display
  formatDate(date: string): string {
    const notificationDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (notificationDate.toDateString() === today.toDateString()) {
      return notificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (notificationDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return notificationDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
}
