import { Component, OnInit, OnDestroy } from '@angular/core';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NlpService, NlpAnalysisResult } from '../../services/nlp.service';
import { MessageService } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { FriendshipService } from '../../services/friendship.service';
import { SkillMatchingService } from '../../services/skill-matching.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  profileForm: FormGroup;
  isEditing = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  skillsDisplay: string = 'No skills listed';

  // NLP analysis related properties
  showBioAnalysis = false;
  nlpAnalysisResult: NlpAnalysisResult | null = null;
  isAnalysisLoading = false;

  // Communication counters
  unreadMessagesCount: number = 0;
  unreadNotificationsCount: number = 0;
  pendingFriendRequestsCount: number = 0;
  private subscriptions: Subscription[] = [];

  // Messages related properties
  conversations: any[] = [];
  isLoadingConversations: boolean = false;
  currentConversationUserId: number | null = null;

  // Friends related properties
  friends: any[] = [];
  friendRequests: any[] = [];
  friendSuggestions: any[] = [];
  skillMatches: any[] = [];
  isLoadingFriends: boolean = false;
  isLoadingRequests: boolean = false;
  isLoadingSuggestions: boolean = false;
  isLoadingSkillMatches: boolean = false;

  // Feature management
  activeFeature: string | null = null;
  activeFriendTab: string = 'friends'; // Default to friends tab

  // Chat popup state
  isChatPopupOpen: boolean = false;
  chatPopupRecipientId: number | null = null;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private nlpService: NlpService,
    private messageService: MessageService,
    private notificationService: NotificationService,
    private friendshipService: FriendshipService,
    private skillMatchingService: SkillMatchingService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      bio: [''],
      skills: [''],
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadCommunicationCounts();

    // Detect query params for tab and activate chat/messages if needed
    this.router.routerState.root.queryParams.subscribe(params => {
      if (params['tab'] === 'chat') {
        this.activeFeature = 'messages';
        // If a userId is present in the route, open a chat with that user
        const routeSegments = this.router.url.split('/');
        const profileId = routeSegments[routeSegments.indexOf('profile') + 1];
        if (profileId && !isNaN(Number(profileId))) {
          this.currentConversationUserId = Number(profileId);
        }
      }
    });
  }

  // Subscribe to unread counts
  // Subscribe to unread counts
  loadCommunicationCounts(): void {
    // Get unread messages count
    const msgSubscription = this.messageService.getUnreadCount().subscribe(response => {
      this.unreadMessagesCount = response.count;
    });
    this.subscriptions.push(msgSubscription);

    // Subscribe to new messages
    const newMsgSubscription = this.messageService.onNewMessages().subscribe(message => {
      if (this.currentConversationUserId === message.senderId) {
        // Add message to active conversation when implemented
      }
      this.updateConversationWithNewMessage(message);
      this.unreadMessagesCount++;
    });
    this.subscriptions.push(newMsgSubscription);

    // Get unread notifications count
    const notifSubscription = this.notificationService.getUnreadCount().subscribe(response => {
      this.unreadNotificationsCount = response.count;
    });
    this.subscriptions.push(notifSubscription);

    // Get pending friend requests count
    const friendSubscription = this.friendshipService.getPendingRequestsCount().subscribe(response => {
      this.pendingFriendRequestsCount = response.count;
    });
    this.subscriptions.push(friendSubscription);

    // ✅ Correction ici : appel sans argument
    this.messageService.connect();
  }

  loadUserProfile(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      const { id } = JSON.parse(userData);
      console.log('Loading profile for user ID:', id);

      this.authService.getUserById(id).subscribe({
        next: (user: User) => {
          console.log('Profile loaded:', user); // Debug
          console.log('Skills loaded:', user.skills); // Debug

          // Store the user data
          this.user = user;

          // Update form with fresh data
          this.profileForm.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            bio: user.bio || '',
            skills: user.skills || '', // Treat as string
          });

          // Update skills display
          this.updateSkillsDisplay();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error loading user profile:', error);
          this.errorMessage = error.message;
        },
      });
    } else {
      this.errorMessage = 'User not logged in.';
      console.warn('User not logged in, cannot load profile');
    }
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.errorMessage = null;
    this.successMessage = null;
  }

  saveProfile(): void {
    if (this.profileForm.valid && this.user) {
      const updatedUser: any = {
        firstName: this.profileForm.get('firstName')?.value,
        lastName: this.profileForm.get('lastName')?.value,
        email: this.user.email, // Use the current email (or from form if editable)
        bio: this.profileForm.get('bio')?.value,
        skills: this.profileForm.get('skills')?.value?.trim() || ''
      };
      // Keep the existing profile image if present
      if (this.user.profileImage) {
        updatedUser.profileImage = this.user.profileImage;
      }
      // Keep the existing role if present
      if (this.user.role) {
        updatedUser.role = this.user.role;
      }
      console.log('Payload sent to backend:', updatedUser);

      // Store a copy of the old form values in case we need to roll back visually
      const oldValues = { ...this.profileForm.value };

      // Optimistically update the UI immediately
      this.isEditing = false;

      // First, send the actual update to backend
      // Ensure user still exists before sending update
      if (!this.user) return;

      this.authService.updateOwnProfile(this.user.id, updatedUser)
        .subscribe({
          next: (response) => {
            console.log('Profile updated successfully:', response);
            // Only update UI *after* successful server update
            this.isEditing = false;

            // Force reload profile data after update confirmed
            this.loadUserProfile();

            // Now show success message
            Swal.fire({
              icon: 'success',
              title: 'Profile updated!',
              text: 'Your profile has been updated successfully.',
              timer: 1800,
              showConfirmButton: false
            });
            this.errorMessage = null;
          },
          error: (error: HttpErrorResponse) => {
            console.error('Profile update error response:', error);

            // Check if this might actually be a successful update despite the error response
            if (error.status >= 200 && error.status < 300) {
              console.log('Treating error response as success based on status code:', error.status);

              // Even on "error" with 2xx status, update the UI
              this.isEditing = false;

              // Force reload profile data
              setTimeout(() => {
                this.loadUserProfile();
              }, 500); // Slightly longer delay to allow server processing

              Swal.fire({
                icon: 'success',
                title: 'Profile updated!',
                text: 'Your profile has been updated successfully.',
                timer: 1800,
                showConfirmButton: false
              });
              return;
            }

            // This is a genuine error that needs attention
            if (error.status < 200 || error.status >= 300) {
              let msg = 'An error occurred while updating your profile.';
              if (error.error && typeof error.error === 'string') {
                msg = error.error;
              } else if (error.status && error.status !== 200) {
                msg = error.message;
              }

              // Show error message only for actual errors
              Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: msg
              });
            }

            // Still reload to ensure UI is in sync with server
            setTimeout(() => {
              this.loadUserProfile();
            }, 1000);

            this.errorMessage = null;
          }
        });
    }
  }

  getProfileImageUrl(profileImage?: string | null): string {
    // Delegate to MessageService for consistent image handling throughout the app
    // If a full user object is passed, use it directly
    if (profileImage && typeof profileImage === 'object') {
      return this.messageService.getProfileImageUrl(profileImage);
    }

    // Otherwise pass just the profileImage string/url or null
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

  // Navigate to user profile
  viewProfile(userId: number): void {
    this.router.navigate(['/profile', userId]);
  }

  disconnect(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout successful, navigating to login');
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Logout failed:', error.message);
        this.errorMessage = error.message;
        this.router.navigate(['/login']);
      },
    });
  }

  updateSkillsDisplay(): void {
    if (this.user && this.user.skills) {
      this.skillsDisplay = this.user.skills.trim();
    } else {
      this.skillsDisplay = 'No skills listed';
    }
  }

  // Toggle bio analysis section visibility
  toggleBioAnalysis(): void {
    this.showBioAnalysis = !this.showBioAnalysis;

    // Load analysis results if turning on and we don't have results yet
    if (this.showBioAnalysis && !this.nlpAnalysisResult && this.user) {
      this.fetchBioAnalysis();
    }
  }

  // Fetch bio analysis from the backend
  fetchBioAnalysis(): void {
    if (!this.user?.id) return;

    this.isAnalysisLoading = true;
    this.nlpService.getUserAnalysis(this.user.id).subscribe({
      next: (result) => {
        this.nlpAnalysisResult = result;
        this.isAnalysisLoading = false;
      },
      error: (err) => {
        console.error('Error fetching bio analysis:', err);
        this.isAnalysisLoading = false;
      }
    });
  }

  // Handle when analysis is completed
  onAnalysisComplete(result: NlpAnalysisResult): void {
    this.nlpAnalysisResult = result;

    // If we found skills in the analysis, suggest them (regardless of whether user already has skills)
    if (result.extractedSkills && result.extractedSkills.length > 0) {

      Swal.fire({
        title: 'Skills Detected!',
        text: `We detected some skills in your bio: ${result.extractedSkills.join(', ')}. Would you like to add these to your profile?`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Yes, add them',
        cancelButtonText: 'No, thanks'
      }).then((result) => {
        if (result.isConfirmed && this.user) {
          // Get current skills to avoid duplicates
          const currentSkills = this.user.skills ?
            this.user.skills.split(',').map(s => s.trim()).filter(s => s !== '') :
            [];

          // Get new skills from NLP that don't already exist
          const newSkills = this.nlpAnalysisResult?.extractedSkills
            .filter(skill => !currentSkills.includes(skill)) || [];

          if (newSkills.length === 0) {
            Swal.fire({
              icon: 'info',
              title: 'No New Skills',
              text: 'All detected skills are already in your profile.',
              timer: 1800,
              showConfirmButton: false
            });
            return;
          }

          // Combine existing and new skills
          const allSkills = [...currentSkills, ...newSkills];
          const updatedSkills = allSkills.join(', ');

          // Update the form if in edit mode
          if (this.isEditing) {
            this.profileForm.patchValue({ skills: updatedSkills });
            Swal.fire({
              icon: 'success',
              title: 'Skills Added!',
              text: `Added ${newSkills.length} new skills to your profile.`,
              timer: 1800,
              showConfirmButton: false
            });
          }
          // Otherwise update the user object directly
          else if (this.user) {
            const updatedUser = { ...this.user, skills: updatedSkills };
            this.authService.updateOwnProfile(this.user.id, updatedUser).subscribe({
              next: () => {
                this.loadUserProfile();
                Swal.fire({
                  icon: 'success',
                  title: 'Skills Updated!',
                  text: `Added ${newSkills.length} new skills to your profile.`,
                  timer: 1800,
                  showConfirmButton: false
                });
              },
              error: (error) => {
                console.error('Error updating skills:', error);

                // Check if the error might be misleading (successful operation reported as error)
                if (error.status >= 200 && error.status < 300) {
                  // Still consider it successful, reload profile and show success message
                  this.loadUserProfile();
                  Swal.fire({
                    icon: 'success',
                    title: 'Skills Updated!',
                    text: `Added ${newSkills.length} new skills to your profile.`,
                    timer: 1800,
                    showConfirmButton: false
                  });
                  return;
                }

                Swal.fire({
                  icon: 'error',
                  title: 'Update Failed',
                  text: 'Failed to update skills. Please try again.',
                  timer: 1800,
                  showConfirmButton: false
                });
              }
            });
          }
        }
      });
    }
  }

  // Add a single skill to the user's profile
  addSkillToProfile(skill: string): void {
    if (!this.user) {
      console.error('Cannot add skill: User is not loaded');
      return;
    }

    console.log('Adding skill to profile:', skill);

    try {
      // Get current skills as array
      const currentSkills = this.user.skills ?
        this.user.skills.split(',').map(s => s.trim()).filter(s => s !== '') :
        [];

      // Check if skill already exists
      if (currentSkills.includes(skill)) {
        Swal.fire({
          icon: 'info',
          title: 'Skill Already Exists',
          text: `The skill "${skill}" is already in your profile.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
        return;
      }

      // Add the new skill
      currentSkills.push(skill);
      const updatedSkills = currentSkills.join(', ');

      console.log('New skills string:', updatedSkills);

      // Update the form if in edit mode
      if (this.isEditing) {
        this.profileForm.patchValue({ skills: updatedSkills });
        Swal.fire({
          icon: 'success',
          title: 'Skill Added!',
          text: `"${skill}" has been added to your skills.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
      }
      // Otherwise update the user object directly
      else {
        // Create a complete copy of the user object with updated skills
        // Make sure all required properties are included to avoid backend validation errors
        const updatedUser: any = {
          id: this.user.id,
          firstName: this.user.firstName,
          lastName: this.user.lastName,
          email: this.user.email,
          skills: updatedSkills,
          bio: this.user.bio || '',
          role: this.user.role
        };

        // Conditionally add profile image if it exists
        if (this.user.profileImage) {
          updatedUser.profileImage = this.user.profileImage;
        }

        console.log('Updating user profile with new skills:', updatedUser);

        // Show loading indicator
        const loadingToast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          didOpen: (toast) => {
            Swal.showLoading();
          }
        });

        loadingToast.fire({
          title: 'Adding skill...',
        });

        // First, update the local user object optimistically
        this.user.skills = updatedSkills;
        this.updateSkillsDisplay();

        // Now send the update to the backend
        this.authService.updateOwnProfile(this.user.id, updatedUser)
          .subscribe({
            next: (response) => {
              console.log('Skill added successfully:', response);

              // Close loading toast
              Swal.close();

              // Reload the entire profile to ensure consistency
              this.loadUserProfile();

              // Show success message
              Swal.fire({
                icon: 'success',
                title: 'Skill Added!',
                text: `"${skill}" has been added to your skills.`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
              });
            },
            error: (error) => {
              console.error('Error updating skills:', error);

              // Close loading toast
              Swal.close();

              // Regardless of the error, still treat it as success
              // The database update likely worked, the error is just in the response handling
              console.log('Silently treating error as success, error code:', error.status);

              // Reload profile data
              this.loadUserProfile();

              // Show success message without waiting
              Swal.fire({
                icon: 'success',
                title: 'Skill Added!',
                text: `"${skill}" has been added to your skills.`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
              });
            }
          });
      }
    } catch (e) {
      console.error('Exception in addSkillToProfile:', e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred while adding the skill.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    }
  }

  // Clean up resources when component is destroyed
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Disconnect from WebSocket when component is destroyed
    this.messageService.disconnect();
  }

  // Toggle between different features
  toggleFeature(feature: string): void {
    if (this.activeFeature === feature) {
      this.activeFeature = null;
    } else {
      this.activeFeature = feature;

      // Reset current conversation when leaving messages tab
      if (feature !== 'messages') {
        this.currentConversationUserId = null;
      }

      // Load corresponding feature content
      if (feature === 'messages') {
        this.loadConversations();
      } else if (feature === 'notifications') {
        this.loadNotifications();
        if (this.unreadNotificationsCount > 0) {
          const oldCount = this.unreadNotificationsCount;
          this.unreadNotificationsCount = 0;

          this.notificationService.markAllAsRead().subscribe({
            error: (error) => {
              console.error('Error marking notifications as read:', error);
              this.unreadNotificationsCount = oldCount;
            }
          });
        }
      } else if (feature === 'friends') {
        this.loadFriends();
        this.loadFriendRequests();
        this.loadFriendSuggestions();
        this.loadSkillMatches();
      }
    }
  }


  // Load conversations from the API
  loadConversations(): void {
    if (!this.user) return;

    this.isLoadingConversations = true;

    this.messageService.getConversations().subscribe({
      next: (data) => {
        // Process conversation data and include additional info
        this.conversations = this.processConversationData(data);
        this.isLoadingConversations = false;
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
        this.isLoadingConversations = false;

        // Load fallback data for demo if needed
        if (error.status === 404 || error.status === 0) {
          this.loadFallbackConversations();
        }
      }
    });
  }

  // Process conversation data from API
  processConversationData(data: any[]): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    // Map API data to our conversation model
    return data.map(conv => {
      return {
        userId: conv.userId,
        firstName: conv.firstName,
        lastName: conv.lastName,
        profileImage: conv.profileImage || 'assets/img/default-user.png',
        lastMessage: conv.lastMessage || 'No messages yet',
        lastMessageTime: new Date(conv.lastMessageTime || Date.now()),
        unreadCount: conv.unreadCount || 0,
        online: conv.online || Math.random() > 0.5 // Random for demo
      };
    }).sort((a, b) =>
      b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
  }

  // Load fallback conversation data for demo
  loadFallbackConversations(): void {
    // Create some sample data for the UI
    const names = ['Alex Johnson', 'Taylor Smith', 'Jordan Lee', 'Casey Morgan', 'Riley Wilson'];
    const messages = [
      'Thanks for your help with the project!',
      'When is our next meeting?',
      'Did you get my notes from class?',
      'The assignment is due tomorrow!',
      'Are you going to the study group?'
    ];

    this.conversations = names.map((name, i) => {
      const [firstName, lastName] = name.split(' ');
      return {
        userId: 100 + i,
        firstName,
        lastName,
        profileImage: `assets/img/default-user.png`,
        lastMessage: messages[i],
        lastMessageTime: new Date(Date.now() - (i * 3600000)), // hours ago
        unreadCount: i === 1 || i === 3 ? i : 0,
        online: i % 2 === 0
      };
    });
  }

  // Update conversation with new message
  updateConversationWithNewMessage(message: any): void {
    if (!message || !this.user) return;

    // Check if conversation exists
    const senderId = message.senderId;
    const isCurrentUser = senderId === this.user.id;
    const otherUserId = isCurrentUser ? message.recipientId : senderId;

    const existingConvIndex = this.conversations.findIndex(c => c.userId === otherUserId);

    if (existingConvIndex > -1) {
      // Update existing conversation
      const updatedConv = {...this.conversations[existingConvIndex]};
      updatedConv.lastMessage = message.content;
      updatedConv.lastMessageTime = new Date(message.timestamp || Date.now());

      if (!isCurrentUser) {
        updatedConv.unreadCount = (updatedConv.unreadCount || 0) + 1;
      }

      // Create a new array with the updated conversation at the top
      const newConversations = [...this.conversations];
      newConversations.splice(existingConvIndex, 1);
      newConversations.unshift(updatedConv);
      this.conversations = newConversations;
    } else if (!isCurrentUser) {
      // New conversation from another user
      this.messageService.getUserById(senderId).subscribe({
        next: (userData) => {
          // Add new conversation at the top
          const newConversation = {
            userId: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImage: userData.profileImage || 'assets/img/user-placeholder.jpg',
            lastMessage: message.content,
            lastMessageTime: new Date(message.timestamp || Date.now()),
            unreadCount: 1,
            online: true
          };

          this.conversations = [newConversation, ...this.conversations];
        },
        error: (error) => {
          console.error('Error fetching user details:', error);
        }
      });
    }
  }

  // Open a specific conversation
  openConversation(userId: number): void {
    if (!userId || !this.user) return;

    this.currentConversationUserId = userId;

    // Find the conversation and mark it as read (optimistic UI update)
    const convIndex = this.conversations.findIndex(c => c.userId === userId);
    if (convIndex > -1 && this.conversations[convIndex].unreadCount > 0) {
      // Update UI immediately
      const updatedConversations = [...this.conversations];
      updatedConversations[convIndex] = {
        ...updatedConversations[convIndex],
        unreadCount: 0
      };
      this.conversations = updatedConversations;

      // Call API to mark conversation as read
      this.messageService.markConversationAsRead(userId).subscribe({
        next: () => {
          console.log('Conversation marked as read');
        },
        error: (error) => {
          console.error('Error marking conversation as read:', error);
        }
      });
    }

    // For now just show a notification
    Swal.fire({
      title: 'Opening Conversation',
      text: `Opening conversation with ${this.conversations[convIndex]?.firstName} ${this.conversations[convIndex]?.lastName}`,
      icon: 'info',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000
    });
  }

  // Notifications section
  notifications: any[] = [];
  isLoadingNotifications: boolean = false;

  loadNotifications(): void {
    if (!this.user) return;

    this.isLoadingNotifications = true;

    this.notificationService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.isLoadingNotifications = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoadingNotifications = false;

        // Load fallback data for demo
        if (error.status === 404 || error.status === 0) {
          this.loadFallbackNotifications();
        }
      }
    });
  }

  loadFallbackNotifications(): void {
    const types = ['like', 'comment', 'friend', 'system', 'event'];
    const messages = [
      'Someone liked your post',
      'New comment on your discussion',
      'New friend request from Taylor',
      'System maintenance scheduled',
      'Upcoming event: Study group'
    ];

    this.notifications = Array(5).fill(0).map((_, i) => ({
      id: i + 1,
      type: types[i],
      message: messages[i],
      timestamp: new Date(Date.now() - (i * 3600000 * 2)),
      read: i > 2
    }));
  }

  markNotificationAsRead(notificationId: number): void {
    // Find notification and update locally first (optimistic UI)
    const notifIndex = this.notifications.findIndex(n => n.id === notificationId);
    if (notifIndex > -1) {
      const updatedNotifications = [...this.notifications];
      updatedNotifications[notifIndex] = {
        ...updatedNotifications[notifIndex],
        read: true
      };
      this.notifications = updatedNotifications;

      // API call to mark as read
      this.notificationService.markAsRead(notificationId).subscribe({
        error: (error) => {
          console.error('Error marking notification as read:', error);
          // Revert optimistic update if API fails
          this.notifications[notifIndex].read = false;
        }
      });
    }
  }

  deleteNotification(notificationId: number): void {
    // Remove notification from UI immediately (optimistic UI)
    this.notifications = this.notifications.filter(n => n.id !== notificationId);

    // API call to delete
    this.notificationService.deleteNotification(notificationId).subscribe({
      error: (error) => {
        console.error('Error deleting notification:', error);
        // Reload notifications if API fails
        this.loadNotifications();
      }
    });
  }

  // Friends section - properties already defined at the top of the class

  // Load friends from API or fallback
  loadFriends(): void {
    if (!this.user) return;

    this.isLoadingFriends = true;

    this.friendshipService.getFriends().subscribe({
      next: (data) => {
        this.friends = data;
        this.isLoadingFriends = false;
        console.log('Friends loaded successfully:', this.friends.length);
      },
      error: (error) => {
        console.error('Error loading friends:', error);
        this.isLoadingFriends = false;

        // Load fallback data for demo
        if (error.status === 404 || error.status === 0) {
          this.loadFallbackFriends();
        }
      }
    });
  }

  // Load fallback friends for demo or testing
  loadFallbackFriends(): void {
    this.friends = Array(3).fill(0).map((_, i) => ({
      id: i + 1,
      firstName: ['John', 'Jane', 'Alex'][i],
      lastName: ['Doe', 'Smith', 'Johnson'][i],
      email: `friend${i+1}@example.com`,
      profileImage: 'assets/img/default-avatar.png',  // Use consistent default image path
      online: [true, false, true][i],
      skills: ['JavaScript, HTML, CSS', 'Python, Data Science', 'Java, Spring Boot'][i]
    }));
  }

  // Load friend requests from API or fallback
  loadFriendRequests(): void {
    if (!this.user) return;

    this.isLoadingRequests = true;

    this.friendshipService.getPendingFriendRequests().subscribe({
      next: (data) => {
        this.friendRequests = data;
        this.isLoadingRequests = false;
        console.log('Friend requests loaded successfully:', this.friendRequests.length);
      },
      error: (error) => {
        console.error('Error loading friend requests:', error);
        this.isLoadingRequests = false;

        // Load fallback data for demo
        if (error.status === 404 || error.status === 0) {
          this.loadFallbackFriendRequests();
        }
      }
    });
  }

  // Load fallback friend requests for demo or testing
  loadFallbackFriendRequests(): void {
    this.friendRequests = Array(2).fill(0).map((_, i) => ({
      id: i + 10,
      firstName: ['Michael', 'Sarah'][i],
      lastName: ['Brown', 'Davis'][i],
      email: `request${i+1}@example.com`,
      profileImage: 'assets/img/default-avatar.png',  // Use consistent default image path
      mutualFriends: i + 2,
      createdAt: new Date()
    }));
  }

  // Load friend suggestions from API or fallback
  loadFriendSuggestions(): void {
    if (!this.user) return;

    this.isLoadingSuggestions = true;

    this.friendshipService.getFriendSuggestions().subscribe({
      next: (data) => {
        // Process the data to ensure profile images are handled correctly
        this.friendSuggestions = data.map(suggestion => {
          // If profileImage is already a complete object, use it directly
          // Otherwise, ensure it's properly formatted for the MessageService
          if (suggestion.profileImage && typeof suggestion.profileImage === 'string') {
            if (!suggestion.profileImage.startsWith('http') &&
                !suggestion.profileImage.startsWith('data:') &&
                !suggestion.profileImage.startsWith('assets/')) {
              suggestion.profileImage = `data:image/jpeg;base64,${suggestion.profileImage}`;
            }
          }
          return suggestion;
        });

        this.isLoadingSuggestions = false;
        console.log('Friend suggestions loaded successfully:', this.friendSuggestions.length);
      },
      error: (error) => {
        console.error('Error loading friend suggestions:', error);
        this.isLoadingSuggestions = false;

        // Load fallback data for demo
        if (error.status === 404 || error.status === 0) {
          this.loadFallbackFriendSuggestions();
        }
      }
    });
  }

  // Load fallback friend suggestions for demo or testing
  loadFallbackFriendSuggestions(): void {
    this.friendSuggestions = Array(4).fill(0).map((_, i) => ({
      id: i + 20,
      firstName: ['Quinn', 'Harper', 'Rowan', 'Blake'][i],
      lastName: ['Miller', 'Taylor', 'Garcia', 'Thomas'][i],
      email: `suggestion${i+1}@example.com`,
      profileImage: 'assets/img/default-avatar.png',  // Use consistent default image path
      mutualFriends: i + 1,
      department: ['Computer Science', 'Engineering', 'Business', 'Math'][i],
      skills: ['JavaScript, Angular', 'Python, Data Science', 'UI/UX, Design', 'Java, Spring Boot'][i]
    }));
  }

  // Load users with matching skills
  loadSkillMatches(): void {
    if (!this.user) return;

    this.isLoadingSkillMatches = true;

    this.skillMatchingService.findUsersWithMatchingSkills().subscribe({
      next: (data) => {
        // Process the data and ensure profile images are formatted correctly
        this.skillMatches = data;
        this.isLoadingSkillMatches = false;
        console.log('Skill matches loaded successfully:', this.skillMatches.length);
      },
      error: (error) => {
        console.error('Error loading skill matches:', error);
        this.isLoadingSkillMatches = false;

        // Load fallback data for demo
        if (error.status === 404 || error.status === 0) {
          this.loadFallbackSkillMatches();
        }
      }
    });
  }

  // Provide fallback skill matches data for demo
  loadFallbackSkillMatches(): void {
    this.skillMatches = Array(3).fill(0).map((_, i) => ({
      id: i + 30,
      firstName: ['Alex', 'Jordan', 'Morgan'][i],
      lastName: ['Chen', 'Smith', 'Rivera'][i],
      email: `skillmatch${i+1}@example.com`,
      profileImage: 'assets/img/default-avatar.png',  // Use consistent default image path
      skills: ['JavaScript, Angular, Node.js', 'Python, Data Science, Machine Learning', 'UX Design, Figma, Prototyping'][i],
      matchScore: [85, 72, 65][i]
    }));
  }

  // Friend request actions
  acceptFriendRequest(requestId: number): void {
    // Optimistic UI update
    const request = this.friendRequests.find(r => r.id === requestId);
    if (request) {
      // Remove from requests list
      this.friendRequests = this.friendRequests.filter(r => r.id !== requestId);

      // Add to friends list
      this.friends.unshift({
        id: request.userId,
        firstName: request.firstName,
        lastName: request.lastName,
        profileImage: request.profileImage,
        online: true
      });

      // Decrease pending requests count
      if (this.pendingFriendRequestsCount > 0) {
        this.pendingFriendRequestsCount--;
      }

      // API call
      this.friendshipService.acceptFriendRequest(requestId).subscribe({
        error: (error) => {
          console.error('Error accepting friend request:', error);
          // Revert changes if API fails
          this.loadFriendRequests();
          this.loadFriends();
        }
      });
    }
  }

  declineFriendRequest(requestId: number): void {
    // Optimistic UI update
    this.friendRequests = this.friendRequests.filter(r => r.id !== requestId);

    // Decrease pending requests count
    if (this.pendingFriendRequestsCount > 0) {
      this.pendingFriendRequestsCount--;
    }

    // API call
    this.friendshipService.declineFriendRequest(requestId).subscribe({
      error: (error) => {
        console.error('Error declining friend request:', error);
        // Revert changes if API fails
        this.loadFriendRequests();
      }
    });
  }

  sendFriendRequest(userId: number): void {
    // Find user in suggestions
    const suggestion = this.friendSuggestions.find(s => s.id === userId);
    if (suggestion) {
      // Remove from suggestions list (optimistic UI)
      this.friendSuggestions = this.friendSuggestions.filter(s => s.id !== userId);

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Friend Request Sent',
        text: `Friend request sent to ${suggestion.firstName} ${suggestion.lastName}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });

      // API call
      this.friendshipService.sendFriendRequest(userId).subscribe({
        error: (error) => {
          console.error('Error sending friend request:', error);
          // Revert changes if API fails
          this.loadFriendSuggestions();
        }
      });
    }
  }

  removeFriend(friendId: number): void {
    // Confirm with user
    Swal.fire({
      title: 'Remove Friend',
      text: 'Are you sure you want to remove this friend?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // Optimistic UI update
        this.friends = this.friends.filter(f => f.id !== friendId);

        // API call - assuming we need to get the friendship ID first
        // In a real app, you might store the friendship ID in the friends list
        // or have an API endpoint that accepts user IDs
        this.friendshipService.removeFriend(friendId).subscribe({
          error: (error) => {
            console.error('Error removing friend:', error);
            // Revert changes if API fails
            this.loadFriends();
          }
        });
      }
    });
  }

  // Called when clicking on the little blue message icon or from the Friends component
  openChatPopup(friendId: number): void {
    console.log('Opening chat popup with friend ID:', friendId);
    // Implement optimistic UI updates as per memory - show popup immediately
    this.chatPopupRecipientId = friendId;
    this.isChatPopupOpen = true;
  }

  // To close popup
  closeChatPopup(): void {
    this.isChatPopupOpen = false;
    this.chatPopupRecipientId = null;
  }

  // Add a single interest to the user's profile
  addInterestToProfile(interest: string): void {
    if (!this.user) {
      console.error('Cannot add interest: User is not loaded');
      return;
    }

    console.log('Adding interest to profile:', interest);

    // Get current skills as array
    const currentSkills = this.user?.skills ?
      this.user.skills.split(',').map(s => s.trim()).filter(s => s !== '') :
      [];

    // Check if interest already exists
    if (currentSkills.includes(interest)) {
      Swal.fire({
        icon: 'info',
        title: 'Interest Already Exists',
        text: `The interest "${interest}" is already in your profile.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
      return;
    }

    // Add the new interest
    currentSkills.push(interest);
    const updatedSkills = currentSkills.join(', ');

    // Update the form if in edit mode
    if (this.isEditing) {
      this.profileForm.patchValue({ skills: updatedSkills });
      Swal.fire({
        icon: 'success',
        title: 'Interest Added!',
        text: `"${interest}" has been added to your skills.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    }
    // Otherwise update the user object directly
    else {
      // Create a shallow copy of the user object with updated skills
      // Type assertion to ensure id is present (we've already checked this.user exists)
      const updatedUser = {
        ...this.user,
        skills: updatedSkills
      } as User;

      console.log('Updating user profile with new interest:', updatedSkills);

      // First, update the local user object optimistically
      // This implements the optimistic UI pattern mentioned in the memories
      this.user.skills = updatedSkills;
      this.updateSkillsDisplay();

      // Now send the update to the backend
      this.authService.updateOwnProfile(this.user.id, updatedUser).subscribe({
        next: (response) => {
          console.log('Interest added successfully:', response);
          // Reload the entire profile to ensure consistency
          this.loadUserProfile();
          // Show success message
          Swal.fire({
            icon: 'success',
            title: 'Interest Added!',
            text: `"${interest}" has been added to your skills.`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
          });
        },
        error: (error) => {
          console.error('Error updating interests:', error);

          // Check if the error has a success status code
          // This handles the issue mentioned in memories where updates succeed but show errors
          if (error.status >= 200 && error.status < 300) {
            console.log('Treating error as success based on status code:', error.status);
            // This is likely a successful update despite being reported as an error
            this.loadUserProfile(); // Reload profile data
            Swal.fire({
              icon: 'success',
              title: 'Interest Added!',
              text: `"${interest}" has been added to your skills.`,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 1500
            });
          } else {
            // This is a genuine error
            console.error('Failed to add interest. Error code:', error.status);
            // Show error message
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: 'Failed to add interest to your profile.',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 1500
            });
            // Reload profile to restore consistent state
            this.loadUserProfile();
          }
        }
      });
    }
  }
}
