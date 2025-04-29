import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '../../services/message.service';
import { FriendshipService } from '../../services/friendship.service';
import { AuthService, User } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-messaging',
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.css']
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;
  @Input() recipientId: number = 0;
  @Input() isPopup: boolean = false;

  currentUser: User | null = null;
  recipient: User | null = null;
  conversations: any[] = [];
  currentConversation: any[] = [];
  message: string = '';
  isLoading: boolean = false;
  friendshipStatus: string = '';
  page: number = 0;
  size: number = 20;
  hasMoreMessages: boolean = false;
  loadingMore: boolean = false;
  isLoadingConversations: boolean = true;
  searchTerm: string = '';
  filteredConversations: any[] = [];
  subscriptions: Subscription[] = [];

  constructor(
    private messageService: MessageService,
    private friendshipService: FriendshipService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUserProfile().subscribe({
      next: (user: User) => {
        this.currentUser = user;

        // ✅ Correction ici : connect() sans argument
        this.messageService.connect();

        const messageSubscription = this.messageService.onNewMessages().subscribe(
          (message: any) => this.handleNewMessage(message)
        );
        const readReceiptSubscription = this.messageService.onReadReceipts().subscribe(
          (receipt: any) => this.handleReadReceipt(receipt)
        );

        this.subscriptions.push(messageSubscription, readReceiptSubscription);
        this.loadConversations();

        if (this.recipientId && this.recipientId > 0) {
          this.loadRecipientProfile();
          this.loadConversation();
          this.checkFriendshipStatus();
        } else {
          const routeSubscription = this.route.params.subscribe(params => {
            if (params['id']) {
              this.recipientId = +params['id'];
              this.loadRecipientProfile();
              this.loadConversation();
              this.checkFriendshipStatus();
            }
          });
          this.subscriptions.push(routeSubscription);
        }
      },
      error: (error: any) => {
        console.error('Error getting current user:', error);
        Swal.fire({
          icon: 'error',
          title: 'Authentication Error',
          text: 'Please log in to access messaging features.'
        });
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.messageService.disconnect();
  }

  scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  loadConversations(): void {
    this.isLoadingConversations = true;
    this.messageService.getConversations().subscribe({
      next: (data: any) => {
        this.conversations = data;
        this.filteredConversations = [...this.conversations];
        this.isLoadingConversations = false;
      },
      error: (error: any) => {
        console.error('Error loading conversations:', error);
        this.isLoadingConversations = false;
      }
    });
  }

  loadRecipientProfile(): void {
    this.messageService.getUserById(this.recipientId).subscribe({
      next: (data: any) => {
        this.recipient = data;
      },
      error: (error: any) => console.error('Error loading recipient profile:', error)
    });
  }

  loadConversation(): void {
    if (!this.recipientId || !this.currentUser) return;

    this.isLoading = true;
    this.messageService.markConversationAsRead(this.recipientId).subscribe();

    this.messageService.getConversation(this.recipientId, this.page, this.size).subscribe({
      next: (data: any) => {
        if (data.content) {
          this.currentConversation = [...data.content.reverse(), ...this.currentConversation];
          this.hasMoreMessages = !data.first;
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading conversation:', error);
        this.isLoading = false;
      }
    });
  }

  loadMoreMessages(): void {
    if (this.loadingMore || !this.hasMoreMessages) return;

    this.loadingMore = true;
    this.page++;
    this.messageService.getConversation(this.recipientId, this.page, this.size).subscribe({
      next: (data: any) => {
        if (data.content) {
          const currentHeight = this.messageContainer.nativeElement.scrollHeight;
          const currentScrollPos = this.messageContainer.nativeElement.scrollTop;

          this.currentConversation = [...data.content.reverse(), ...this.currentConversation];
          this.hasMoreMessages = !data.first;

          setTimeout(() => {
            const newHeight = this.messageContainer.nativeElement.scrollHeight;
            this.messageContainer.nativeElement.scrollTop = currentScrollPos + (newHeight - currentHeight);
          });
        }
        this.loadingMore = false;
      },
      error: (error: any) => {
        console.error('Error loading more messages:', error);
        this.loadingMore = false;
      }
    });
  }

  onScroll(): void {
    if (this.messageContainer.nativeElement.scrollTop === 0 && this.hasMoreMessages) {
      this.loadMoreMessages();
    }
  }

  sendMessage(): void {
    if (!this.message.trim() || !this.recipientId || !this.currentUser) return;

    this.messageService.sendMessageViaWebSocket(
      this.currentUser.id,
      this.recipientId,
      this.message.trim()
    );

    this.message = '';
    setTimeout(() => this.messageInput.nativeElement.focus());
  }

  handleNewMessage(message: any): void {
    if ((message.sender.id === this.recipientId && message.recipient.id === this.currentUser?.id) ||
      (message.sender.id === this.currentUser?.id && message.recipient.id === this.recipientId)) {
      this.currentConversation.push(message);
      if (message.sender.id === this.recipientId) {
        this.messageService.markAsReadViaWebSocket(message.id);
      }
      setTimeout(() => this.scrollToBottom());
    }
    this.updateConversationsList(message);
  }

  handleReadReceipt(receipt: any): void {
    this.currentConversation = this.currentConversation.map(msg =>
      msg.id === receipt.messageId ? { ...msg, read: true } : msg
    );
  }

  checkFriendshipStatus(): void {
    this.friendshipService.getFriendshipStatus(this.recipientId).subscribe({
      next: (data: any) => this.friendshipStatus = data.status,
      error: (error: any) => console.error('Error checking friendship status:', error)
    });
  }

  sendFriendRequest(): void {
    this.friendshipService.sendFriendRequest(this.recipientId).subscribe({
      next: () => {
        this.friendshipStatus = 'PENDING';
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Friend request sent!',
          timer: 1800,
          showConfirmButton: false
        });
      },
      error: (error: any) => console.error('Error sending friend request:', error)
    });
  }

  selectConversation(conversation: any): void {
    if (!this.currentUser) return;

    const otherUser = conversation.sender.id === this.currentUser.id
      ? conversation.recipient
      : conversation.sender;

    this.router.navigate(['/messages', otherUser.id]);

    this.recipientId = otherUser.id;
    this.recipient = otherUser;
    this.currentConversation = [];
    this.page = 0;
    this.hasMoreMessages = false;
    this.loadConversation();
    this.checkFriendshipStatus();
  }

  updateConversationsList(message: any): void {
    const existingIndex = this.conversations.findIndex(c =>
      (c.sender.id === message.sender.id && c.recipient.id === message.recipient.id) ||
      (c.sender.id === message.recipient.id && c.recipient.id === message.sender.id)
    );

    if (existingIndex !== -1) {
      this.conversations.splice(existingIndex, 1);
    }

    this.conversations.unshift(message);
    this.filterConversations();
  }

  filterConversations(): void {
    if (!this.currentUser) {
      this.filteredConversations = [];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();

    this.filteredConversations = this.conversations.filter(conv => {
      const otherUser = conv.sender.id === this.currentUser!.id ? conv.recipient : conv.sender;
      return (
        otherUser.firstName.toLowerCase().includes(term) ||
        otherUser.lastName.toLowerCase().includes(term)
      );
    });
  }

  searchConversations(): void {
    this.filterConversations();
  }

  getOtherUser(conversation: any): any {
    if (!this.currentUser) return null;
    return conversation.sender.id === this.currentUser.id ? conversation.recipient : conversation.sender;
  }

  formatDate(date: string): string {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  getProfileImageForUser(user: any): string {
    if (!user) return 'assets/img/default-avatar.png';

    if (user.profileImage) {
      const profileImage = user.profileImage;

      if (profileImage.startsWith('http') || profileImage.startsWith('assets/')) {
        return profileImage;
      }

      if (!profileImage.startsWith('data:')) {
        return `data:image/jpeg;base64,${profileImage}`;
      }

      return profileImage;
    }

    return 'assets/img/default-avatar.png';
  }
}
