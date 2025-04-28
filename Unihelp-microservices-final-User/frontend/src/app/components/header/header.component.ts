import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
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
    this.isLoggedIn = !this.isLoggedIn;
    if (!this.isLoggedIn) {
      this.authService.logout().subscribe();
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
}
