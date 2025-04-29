import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FriendshipService } from '../../services/friendship.service';
import { SkillMatchingService } from '../../services/skill-matching.service';
import { User } from '../../models/user.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent implements OnInit {
  // Event emitter to request a chat popup from parent component
  @Output() chatRequest = new EventEmitter<number>();
  friends: User[] = [];
  pendingRequests: any[] = [];
  sentRequests: any[] = [];
  suggestions: User[] = [];
  skillMatches: User[] = [];
  activeTab: string = 'friends';
  isLoading: boolean = false;

  constructor(
    private friendshipService: FriendshipService,
    private skillMatchingService: SkillMatchingService,
    private router: Router,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadFriends();
    this.loadPendingRequests();
    this.loadSentRequests();
    this.loadSuggestions();
    this.loadSkillMatches();
  }

  loadFriends(callback?: () => void): void {
    this.isLoading = true;
    this.friendshipService.getFriends().subscribe({
      next: (data) => {
        console.log('Friends data received:', data);
        // Log each friend with their friendship ID for debugging
        data.forEach(friend => {
          console.log(`Friend: ${friend.firstName} ${friend.lastName}, ID: ${friend.id}, FriendshipID: ${friend.friendshipId}`);
        });
        this.friends = data;
        this.isLoading = false;
        if (callback) callback(); // Call the callback if provided
      },
      error: (error) => {
        console.error('Error loading friends:', error);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load friends. Please try again.'
        });
      }
    });
  }

  loadPendingRequests(): void {
    this.friendshipService.getPendingFriendRequests().subscribe({
      next: (data) => {
        this.pendingRequests = data;
      },
      error: (error) => {
        console.error('Error loading pending requests:', error);
      }
    });
  }

  loadSentRequests(): void {
    this.friendshipService.getSentFriendRequests().subscribe({
      next: (data) => {
        this.sentRequests = data;
      },
      error: (error) => {
        console.error('Error loading sent requests:', error);
      }
    });
  }

  loadSuggestions(): void {
    this.friendshipService.getFriendSuggestions().subscribe({
      next: (data) => {
        this.suggestions = data;
      },
      error: (error) => {
        console.error('Error loading suggestions:', error);
      }
    });
  }

  loadSkillMatches(): void {
    this.skillMatchingService.findUsersWithMatchingSkills().subscribe({
      next: (data) => {
        this.skillMatches = data;
      },
      error: (error) => {
        console.error('Error loading skill matches:', error);
      }
    });
  }

  sendFriendRequest(userId: number): void {
    // Immediately remove the user from suggestions for a better UX
    const userToRemoveIndex = this.suggestions.findIndex(s => s.id === userId);
    let removedUser: User | null = null;
    
    if (userToRemoveIndex !== -1) {
      removedUser = {...this.suggestions[userToRemoveIndex]};
      // Create a new array without the user
      this.suggestions = [...this.suggestions.slice(0, userToRemoveIndex), 
                         ...this.suggestions.slice(userToRemoveIndex + 1)];
    }
    
    // Also check skill matches
    const skillMatchIndex = this.skillMatches.findIndex(m => m.id === userId);
    if (skillMatchIndex !== -1) {
      removedUser = removedUser || {...this.skillMatches[skillMatchIndex]};
      // Create a new array without the user
      this.skillMatches = [...this.skillMatches.slice(0, skillMatchIndex), 
                          ...this.skillMatches.slice(skillMatchIndex + 1)];
    }
    
    this.friendshipService.sendFriendRequest(userId).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Friend request sent!',
          timer: 1800,
          showConfirmButton: false
        });
        
        // If the API call failed, we would add the user back to the suggestions list
        // But since it succeeded, we can keep them removed
        
        // Refresh sent requests list to include the new request
        this.loadSentRequests();
      },
      error: (error) => {
        console.error('Error sending friend request:', error);
        
        // If there was an error, add the user back to the suggestions list
        if (removedUser) {
          if (userToRemoveIndex !== -1) {
            this.suggestions.splice(userToRemoveIndex, 0, removedUser as User);
          }
          if (skillMatchIndex !== -1) {
            this.skillMatches.splice(skillMatchIndex, 0, removedUser as User);
          }
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to send friend request. Please try again.'
        });
      }
    });
  }

  acceptRequest(friendshipId: number): void {
    this.friendshipService.acceptFriendRequest(friendshipId).subscribe({
      next: () => {
        console.log(`Friend request accepted with friendshipId: ${friendshipId}`);
        // Important: Loading friends FIRST to ensure we have updated friendshipId values
        this.loadFriends(() => {
          // After friends are loaded, then load pending requests
          this.loadPendingRequests();
          
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Friend request accepted!',
            timer: 1800,
            showConfirmButton: false
          });
        });
      },
      error: (error) => {
        console.error('Error accepting friend request:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to accept friend request. Please try again.'
        });
      }
    });
  }

  declineRequest(friendshipId: number): void {
    this.friendshipService.declineFriendRequest(friendshipId).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Friend request declined.',
          timer: 1800,
          showConfirmButton: false
        });
        // Refresh lists
        this.loadPendingRequests();
      },
      error: (error) => {
        console.error('Error declining friend request:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to decline friend request. Please try again.'
        });
      }
    });
  }

  cancelRequest(friendshipId: number): void {
    this.friendshipService.cancelFriendRequest(friendshipId).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Friend request canceled.',
          timer: 1800,
          showConfirmButton: false
        });
        // Refresh lists
        this.loadSentRequests();
      },
      error: (error) => {
        console.error('Error canceling friend request:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to cancel friend request. Please try again.'
        });
      }
    });
  }

  removeFriend(friendshipId: number): void {
    if (!friendshipId) {
      console.error('No friendshipId provided');
      return;
    }
  
    if (confirm('Are you sure you want to remove this friend?')) {
      this.friendshipService.removeFriend(friendshipId).subscribe(
        () => {
          Swal.fire('Removed!', 'Friend has been removed.', 'success');
          // Reload friends after removal
          this.loadFriends();
        },
        (error) => {
          console.error('Error removing friend:', error);
          if (error.status === 403) {
            Swal.fire('Forbidden', 'You are not allowed to remove this friendship.', 'error');
          } else if (error.status === 400) {
            Swal.fire('Invalid', 'Friendship is not active.', 'warning');
          } else {
            Swal.fire('Error', 'Something went wrong.', 'error');
          }
        }
      );
    }
  }
  
  

  viewProfile(userId: number): void {
    this.router.navigate(['/profile', userId]);
  }

  startChat(userId: number): void {
    // Emit event to parent component to open chat popup
    this.chatRequest.emit(userId);
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }
  
  // Get profile image URL for proper display - delegates to MessageService for consistency
  getProfileImageUrl(profileImage?: string | null): string {
    // Use the MessageService implementation for consistency across the app
    return this.messageService.getProfileImageUrl({ profileImage: profileImage });
  }
  
  // Helper method to handle skills and limit to 4 items
  getSplitSkills(skills: string | string[]): string[] {
    if (!skills) {
      return [];
    }
    
    // If skills is already an array, use it directly
    if (Array.isArray(skills)) {
      return skills.slice(0, 4);
    }
    
    // Otherwise, split by comma and trim each skill
    const skillsArray = skills.split(',').map(skill => skill.trim());
    
    // Return only first 4 skills for display
    return skillsArray.slice(0, 4);
  }
}
