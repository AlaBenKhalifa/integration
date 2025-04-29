import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {

  notifications: Notification[] = [];
  isLoading = true;
  hasMoreNotifications = false;
  loadingMore = false;
  currentPage = 0;
  pageSize = 10;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getNotificationsPaginated(this.currentPage, this.pageSize).subscribe(
      (pageData) => {
        this.notifications = [...this.notifications, ...pageData.content];
        this.hasMoreNotifications = !pageData.last;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading notifications', error);
        this.isLoading = false;
      }
    );
  }

  loadMoreNotifications(): void {
    if (this.loadingMore || !this.hasMoreNotifications) return;
    this.loadingMore = true;
    this.currentPage++;
    this.notificationService.getNotificationsPaginated(this.currentPage, this.pageSize).subscribe(
      (pageData) => {
        this.notifications = [...this.notifications, ...pageData.content];
        this.hasMoreNotifications = !pageData.last;
        this.loadingMore = false;
      },
      (error) => {
        console.error('Error loading more notifications', error);
        this.loadingMore = false;
      }
    );
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(
      () => {
        this.notifications.forEach(notification => notification.read = true);
      },
      (error) => {
        console.error('Error marking all notifications as read', error);
      }
    );
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe(
      () => {
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
      },
      (error) => {
        console.error('Error deleting notification', error);
      }
    );
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe(
        () => {
          notification.read = true;
        },
        (error) => {
          console.error('Error marking notification as read', error);
        }
      );
    }
    // Here you can add more logic based on notification.type if needed (e.g. redirect)
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  getProfileImageUrl(profileImage: string | undefined): string {
    if (!profileImage || profileImage.trim() === '') {
      return 'assets/img/default-user.png';
    }
    // Check if the image is already a data URL
    if (profileImage.startsWith('data:')) {
      return profileImage;
    }
    // Convert base64 string to data URL if it's not already
    return `data:image/jpeg;base64,${profileImage}`;
  }
}

// Define a local Notification interface
interface Notification {
  id: number;
  userId: number;
  userName?: string;
  userProfileImage?: string;
  content: string;
  type: string;
  referenceId?: number;
  createdAt: string;
  read: boolean;
}
