import { Component, OnInit } from '@angular/core';
import { FriendshipService } from '../../services/friendship.service';
import { SkillMatchingService } from '../../services/skill-matching.service';
import { User } from '../../models/user.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent implements OnInit {
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
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadFriends();
    this.loadPendingRequests();
    this.loadSentRequests();
    this.loadSuggestions();
    this.loadSkillMatches();
  }

  loadFriends(): void {
    this.isLoading = true;
    this.friendshipService.getFriends().subscribe({
      next: (data) => {
        this.friends = data;
        this.isLoading = false;
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
    this.friendshipService.sendFriendRequest(userId).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Friend request sent!',
          timer: 1800,
          showConfirmButton: false
        });
        // Refresh lists
        this.loadSentRequests();
        this.loadSuggestions();
        this.loadSkillMatches();
      },
      error: (error) => {
        console.error('Error sending friend request:', error);
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
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Friend request accepted!',
          timer: 1800,
          showConfirmButton: false
        });
        // Refresh lists
        this.loadFriends();
        this.loadPendingRequests();
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
    Swal.fire({
      title: 'Remove Friend',
      text: 'Are you sure you want to remove this friend?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove'
    }).then((result) => {
      if (result.isConfirmed) {
        this.friendshipService.removeFriend(friendshipId).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: 'Friend removed.',
              timer: 1800,
              showConfirmButton: false
            });
            // Refresh lists
            this.loadFriends();
          },
          error: (error) => {
            console.error('Error removing friend:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to remove friend. Please try again.'
            });
          }
        });
      }
    });
  }

  viewProfile(userId: number): void {
    this.router.navigate(['/profile', userId]);
  }

  startChat(userId: number): void {
    this.router.navigate(['/messages', userId]);
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }
}
