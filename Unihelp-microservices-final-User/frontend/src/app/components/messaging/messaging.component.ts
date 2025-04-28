import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../../services/message.service';
import { FriendshipService } from '../../services/friendship.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { User } from '../../models/user.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-messaging',
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.css']
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  currentUser: any;
  recipientId: number = 0;
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
  messageSubscription: string = 'message-component';
  readReceiptSubscription: string = 'read-receipt-component';
  isLoadingConversations: boolean = true;
  searchTerm: string = '';
  filteredConversations: any[] = [];
  subscriptions: Subscription[] = [];

  constructor(
    private messageService: MessageService,
    private friendshipService: FriendshipService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Get current user
    this.authService.getUser().subscribe({
      next: (user: any) => {
        this.currentUser = user;
        
        // Connect to WebSocket for real-time messaging
        this.messageService.connect(this.currentUser.id);
        
        // Subscribe to new messages using Observables
        const messageSubscription = this.messageService.onNewMessages().subscribe(
          (message: any) => {
            this.handleNewMessage(message);
          }
        );
        this.subscriptions.push(messageSubscription);
        
        // Subscribe to read receipts using Observables
        const readReceiptSubscription = this.messageService.onReadReceipts().subscribe(
          (receipt: any) => {
            this.handleReadReceipt(receipt);
          }
        );
        this.subscriptions.push(readReceiptSubscription);
        
        // Get all conversations
        this.loadConversations();
        
        // Get recipient ID from route params
        const routeSubscription = this.route.params.subscribe(params => {
          if (params['id']) {
            this.recipientId = +params['id'];
            this.loadRecipientProfile();
            this.loadConversation();
            this.checkFriendshipStatus();
          }
        });
        this.subscriptions.push(routeSubscription);
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
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Disconnect WebSocket on component destruction
    this.messageService.disconnect();
  }

  // Scroll to bottom of message container
  scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  // Load all conversations
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

  // Load the recipient's profile
  loadRecipientProfile(): void {
    this.messageService.getUserById(this.recipientId).subscribe({
      next: (data: any) => {
        this.recipient = data;
      },
      error: (error: any) => {
        console.error('Error loading recipient profile:', error);
      }
    });
  }

  // Load conversation with the recipient
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

  // Load more messages (pagination)
  loadMoreMessages(): void {
    if (this.loadingMore || !this.hasMoreMessages) return;

    this.loadingMore = true;
    this.page++;
    this.messageService.getConversation(this.recipientId, this.page, this.size).subscribe({
      next: (data: any) => {
        if (data.content) {
          // Get current scroll position before adding more messages
          const currentHeight = this.messageContainer.nativeElement.scrollHeight;
          const currentScrollPos = this.messageContainer.nativeElement.scrollTop;
          
          // Add messages to the beginning
          this.currentConversation = [...data.content.reverse(), ...this.currentConversation];
          this.hasMoreMessages = !data.first;
          
          setTimeout(() => {
            // Maintain scroll position relative to new content
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

  // Check if we need to load more messages when scrolling up
  onScroll(): void {
    if (this.messageContainer.nativeElement.scrollTop === 0 && this.hasMoreMessages) {
      this.loadMoreMessages();
    }
  }

  // Send a message
  sendMessage(): void {
    if (!this.message.trim() || !this.recipientId) return;

    // Use WebSocket for sending messages (real-time)
    this.messageService.sendMessageViaWebSocket(
      this.currentUser.id,
      this.recipientId,
      this.message.trim()
    );

    // Clear the input field
    this.message = '';
    
    // Focus on the input field
    setTimeout(() => {
      this.messageInput.nativeElement.focus();
    });
  }

  // Handle new messages received via WebSocket
  handleNewMessage(message: any): void {
    // If message is from or to the current conversation
    if (
      (message.sender.id === this.recipientId && message.recipient.id === this.currentUser.id) ||
      (message.sender.id === this.currentUser.id && message.recipient.id === this.recipientId)
    ) {
      // Add message to current conversation
      this.currentConversation.push(message);
      
      // Mark as read if received
      if (message.sender.id === this.recipientId) {
        this.messageService.markAsReadViaWebSocket(message.id);
      }
      
      // Scroll to bottom
      setTimeout(() => this.scrollToBottom());
    }

    // Update conversations list
    this.updateConversationsList(message);
  }

  // Handle read receipts
  handleReadReceipt(receipt: any): void {
    // Update read status in the current conversation
    this.currentConversation = this.currentConversation.map(msg => {
      if (msg.id === receipt.messageId) {
        return { ...msg, read: true };
      }
      return msg;
    });
  }

  // Check friendship status
  checkFriendshipStatus(): void {
    this.friendshipService.getFriendshipStatus(this.recipientId).subscribe({
      next: (data: any) => {
        this.friendshipStatus = data.status;
      },
      error: (error: any) => {
        console.error('Error checking friendship status:', error);
      }
    });
  }

  // Send a friend request
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
      error: (error: any) => {
        console.error('Error sending friend request:', error);
      }
    });
  }

  // Select a conversation
  selectConversation(conversation: any): void {
    const otherUser = conversation.sender.id === this.currentUser.id ? 
      conversation.recipient : conversation.sender;
    
    // Update URL and load new conversation
    window.history.pushState({}, '', `/messages/${otherUser.id}`);
    this.recipientId = otherUser.id;
    this.recipient = otherUser;
    this.currentConversation = [];
    this.page = 0;
    this.hasMoreMessages = false;
    this.loadConversation();
    this.checkFriendshipStatus();
  }

  // Update conversations list with new message
  updateConversationsList(message: any): void {
    // Check if conversation exists
    const existingIndex = this.conversations.findIndex(c => 
      (c.sender.id === message.sender.id && c.recipient.id === message.recipient.id) || 
      (c.sender.id === message.recipient.id && c.recipient.id === message.sender.id)
    );

    if (existingIndex !== -1) {
      // Remove existing conversation
      this.conversations.splice(existingIndex, 1);
    }

    // Add new conversation at the beginning
    this.conversations.unshift(message);
    
    // Update filtered conversations
    this.filterConversations();
  }

  // Filter conversations based on search term
  filterConversations(): void {
    if (!this.searchTerm.trim()) {
      this.filteredConversations = [...this.conversations];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredConversations = this.conversations.filter(conv => {
      const otherUser = conv.sender.id === this.currentUser.id ? conv.recipient : conv.sender;
      return (
        otherUser.firstName.toLowerCase().includes(term) || 
        otherUser.lastName.toLowerCase().includes(term)
      );
    });
  }

  // Search conversations
  searchConversations(): void {
    this.filterConversations();
  }

  // Get the other user in a conversation
  getOtherUser(conversation: any): any {
    return conversation.sender.id === this.currentUser.id ? 
      conversation.recipient : conversation.sender;
  }

  // Format date for display
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
}
