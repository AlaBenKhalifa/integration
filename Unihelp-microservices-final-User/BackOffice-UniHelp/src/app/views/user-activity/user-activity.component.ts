import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FingerprintService, LoginEvent, UserActivityDto } from '../../services/fingerprint.service';
import { UserService } from '../../services/user.service';
import {
  CardModule,
  GridModule,
  NavModule,
  TableModule,
  BadgeModule,
  ButtonModule,
  FormModule,
  ModalModule,
  ToastModule
} from '@coreui/angular';
import { IconModule } from '@coreui/icons-angular';

@Component({
  selector: 'app-user-activity',
  templateUrl: './user-activity.component.html',
  styleUrls: ['./user-activity.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    GridModule,
    NavModule,
    TableModule,
    BadgeModule,
    ButtonModule,
    FormModule,
    FormsModule,
    IconModule,
    ModalModule,
    ToastModule
  ]
})
export class UserActivityComponent implements OnInit {
  // Tracking data
  loginEvents: LoginEvent[] = [];
  filteredEvents: LoginEvent[] = [];
  userActivities: UserActivityDto[] = [];
  uniqueUsers: { userId: number; userName: string; userEmail: string }[] = [];
  
  // Filter state
  selectedUserId: number | null = null;
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  deviceTypeFilter: string = '';
  
  // Display state
  loading = true;
  showDetailsModal = false;
  selectedEvent: LoginEvent | null = null;
  
  // Stats
  uniqueDeviceCount = 0;
  mobileCount = 0;
  desktopCount = 0;
  tabletCount = 0;
  
  // Event listener reference
  private messageEventListener: any;
  
  constructor(
    private fingerprintService: FingerprintService,
    private userService: UserService
  ) {}
  
  /**
   * Gets login events from the main app (shared via localStorage)
   */
  private getMainAppLoginEvents(): LoginEvent[] {
    let allEvents: LoginEvent[] = [];
    
    try {
      // 1. Check original admin_login_events key first
      const adminEventsKey = 'admin_login_events';
      const eventsJson = localStorage.getItem(adminEventsKey);
      
      if (eventsJson) {
        const events = JSON.parse(eventsJson);
        console.log(`Found ${events.length} events in admin_login_events`);
        allEvents = allEvents.concat(events);
      } else {
        console.log('No admin_login_events found in localStorage');
      }
      
      // 2. Check new dedicated admin events key
      const newAdminKey = 'unihelp_admin_login_events';
      const newAdminEventsJson = localStorage.getItem(newAdminKey);
      
      if (newAdminEventsJson) {
        const newAdminEvents = JSON.parse(newAdminEventsJson);
        console.log(`Found ${newAdminEvents.length} events in unihelp_admin_login_events`);
        allEvents = allEvents.concat(newAdminEvents);
      } else {
        console.log('No unihelp_admin_login_events found in localStorage');
      }
      
      return allEvents;
    } catch (error) {
      console.error('Error reading main app login events:', error);
      return allEvents;
    }
  }
  
  /**
   * Gets login events from shared storage (sessionStorage)
   */
  private getSharedLoginEvents(): LoginEvent[] {
    try {
      let sharedEvents: LoginEvent[] = [];
      
      // 1. Try to read from admin_login_info (used for admin login forwarding)
      const adminLoginInfo = sessionStorage.getItem('admin_login_info');
      
      if (adminLoginInfo) {
        console.log('Found admin login info in sessionStorage');
        const loginInfo = JSON.parse(adminLoginInfo);
        
        // Create a login event from the minimal info
        sharedEvents.push({
          userId: loginInfo.userId,
          userName: loginInfo.userEmail.split('@')[0],
          userEmail: loginInfo.userEmail,
          userRole: 'ADMIN',
          timestamp: loginInfo.timestamp || Date.now(),
          deviceInfo: {
            visitorId: 'session-handoff',
            browserName: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser',
            osName: navigator.platform,
            deviceType: 'Desktop',
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
          }
        });
      }
      
      // 2. Check for direct login event forwarding (newest mechanism)
      const latestLoginEvent = sessionStorage.getItem('latest_login_event');
      
      if (latestLoginEvent) {
        console.log('Found latest login event in sessionStorage');
        const loginEvent = JSON.parse(latestLoginEvent);
        sharedEvents.push(loginEvent);
        
        // Remove it after processing to avoid duplicates in future
        sessionStorage.removeItem('latest_login_event');
      }
      
      return sharedEvents;
    } catch (error) {
      console.error('Error reading shared login events:', error);
      return [];
    }
  }
  
  /**
   * Saves the combined login events back to localStorage
   */
  private saveLoginEvents(events: LoginEvent[]): void {
    try {
      // Limit to 100 most recent events
      const recentEvents = events.slice(0, 100);
      localStorage.setItem('unihelp_login_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Error saving login events:', error);
    }
  }
  
  /**
   * Removes duplicate events based on timestamp and userId
   */
  private removeDuplicateEvents(): void {
    const seen = new Set();
    this.loginEvents = this.loginEvents.filter(event => {
      // Create a unique key for each event
      const key = `${event.userId}-${event.timestamp}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Extracts unique users from login events
   */
  private extractUniqueUsers(): {userId: number, userName: string, userEmail: string}[] {
    const userMap = new Map<number, {userId: number, userName: string, userEmail: string}>();
    
    this.loginEvents.forEach(event => {
      userMap.set(event.userId, {
        userId: event.userId,
        userName: event.userName,
        userEmail: event.userEmail
      });
    });
    
    return Array.from(userMap.values());
  }
  
  /**
   * Sets up real-time message listener to receive events from main app
   */
  private setupMessageListener(): void {
    console.log('Setting up message listener for login events');
    
    // Check for BroadcastChannel API support
    try {
      // Create a one-time check for any existing login data in the main app
      this.checkMainAppStorage();
      
      // Set up a periodic check for new login events
      setInterval(() => {
        this.checkForNewLoginEvents();
      }, 5000); // Check every 5 seconds
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  }
  
  /**
   * Manually checks for new login events in the main app's localStorage
   * This is a workaround for cross-domain communication issues
   */
  private checkMainAppStorage(): void {
    try {
      // Create a hidden iframe pointed at the main app domain
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'http://localhost:4200/assets/bridge.html'; // This is a workaround
      document.body.appendChild(iframe);
      
      // This is just for testing - it won't work across domains
      // But it shows we're trying to access the main app's localStorage
      console.log('Created iframe to try accessing main app storage');
    } catch (error) {
      console.warn('Cross-domain storage access not supported:', error);
    }
  }
  
  /**
   * Periodically checks for new login events
   */
  private checkForNewLoginEvents(): void {
    const adminEvents = this.getMainAppLoginEvents();
    const sharedEvents = this.getSharedLoginEvents();
    
    // Also check direct keys for test data
    let directEvents: LoginEvent[] = [];
    const directKeys = ['unihelp_login_events', 'unihelp_admin_login_events', 'admin_login_events'];
    
    for (const key of directKeys) {
      try {
        const json = localStorage.getItem(key);
        if (json) {
          const events = JSON.parse(json);
          if (Array.isArray(events) && events.length > 0) {
            console.log(`Found ${events.length} events directly in ${key}`);
            directEvents = [...directEvents, ...events];
          }
        }
      } catch (e) {
        // Ignore errors from failed parsing
      }
    }
    
    if (adminEvents.length > 0 || sharedEvents.length > 0 || directEvents.length > 0) {
      console.log('Found new login events, refreshing data');
      this.loadLoginData();
    }
  }
  
  /**
   * Handles messages from the main application
   */
  private handleCrossDomainMessage(event: MessageEvent): void {
    // Check if the message is a login event
    if (event.data && event.data.type === 'LOGIN_EVENT') {
      console.log('Received login event from main app:', event.data.payload);
      
      // Add the event to our list
      this.loginEvents.push(event.data.payload);
      
      // Update the UI
      this.removeDuplicateEvents();
      this.loginEvents.sort((a, b) => b.timestamp - a.timestamp);
      this.uniqueUsers = this.extractUniqueUsers();
      this.applyFilters();
      this.calculateStats();
    }
  }

  ngOnInit(): void {
    console.log('User Activity Component initialized');
    
    // Register API endpoint for direct login event recording
    this.setupLoginRecordingEndpoint();
    
    // Check for login event in URL parameters (from popup window technique)
    this.checkUrlForLoginEvent();
    
    // Load login activity data
    this.loadLoginData();
    
    // Set up window event listener for cross-domain messages
    this.messageEventListener = (event: MessageEvent) => this.handleCrossDomainMessage(event);
    window.addEventListener('message', this.messageEventListener);
    
    // Start polling for new events every 3 seconds
    setInterval(() => {
      this.checkForNewLoginEvents();
    }, 3000);
    
    // Set up interval to check for new login events
    setInterval(() => this.checkForNewEvents(), 3000);
  }
  
  ngOnDestroy(): void {
    // Clean up event listener
    window.removeEventListener('message', this.messageEventListener);
  }
  
  /**
   * Checks URL parameters for login event data
   * This handles the popup window technique from main app
   */
  private checkUrlForLoginEvent(): void {
    try {
      // Get login event from URL parameters
      const params = new URLSearchParams(window.location.search);
      const loginEventParam = params.get('loginEvent');
      
      if (loginEventParam) {
        console.log('Found login event in URL parameters');
        
        // Parse login event data
        const loginEvent = JSON.parse(decodeURIComponent(loginEventParam));
        console.log('Login event from URL:', loginEvent);
        
        // Add to our login events
        const events = this.fingerprintService.getAllLoginEvents();
        events.push(loginEvent);
        
        // Save to local storage
        localStorage.setItem('unihelp_login_events', JSON.stringify(events));
        console.log('Added login event from URL to local storage');
        
        // Clean up URL
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (error) {
      console.error('Error processing login event from URL:', error);
    }
  }
  
  /**
   * Sets up an HTTP endpoint to receive login events directly from the main app
   * This is implemented on the window object as a fake API endpoint
   */
  private setupLoginRecordingEndpoint(): void {
    try {
      // Create a fake API endpoint on the window object
      // This won't actually work due to CORS, but it demonstrates the approach
      (window as any).recordLoginEvent = (loginEventData: any) => {
        console.log('Received direct login event:', loginEventData);
        
        // Process and store the login event
        if (loginEventData && typeof loginEventData === 'object') {
          const loginEvent = loginEventData.loginEvent || loginEventData;
          
          // Add to our login events
          this.loginEvents.push(loginEvent);
          
          // Update the UI
          this.removeDuplicateEvents();
          this.loginEvents.sort((a, b) => b.timestamp - a.timestamp);
          this.uniqueUsers = this.extractUniqueUsers();
          this.applyFilters();
          this.calculateStats();
          
          // Save to local storage
          this.saveLoginEvents(this.loginEvents);
        }
      };
      
      console.log('Login recording endpoint set up');
    } catch (error) {
      console.error('Error setting up login recording endpoint:', error);
    }
  }
  
  /**
   * Loads login events from all available sources
   */
  loadLoginData(): void {
    this.loading = true;
    
    // Get events from the main app
    const mainAppEvents = this.getMainAppLoginEvents();
    console.log(`Found ${mainAppEvents.length} events from main app`);
    
    // Get events from local storage (admin app-specific)
    const localEvents = this.fingerprintService.getAllLoginEvents();
    console.log(`Found ${localEvents.length} events from admin app storage`);
    
    // Combine all events
    this.loginEvents = [...mainAppEvents, ...localEvents];
    
    // Remove duplicates based on timestamp and userId
    this.removeDuplicateEvents();
    console.log(`After deduplication: ${this.loginEvents.length} unique events`);
    
    // Sort events by timestamp (most recent first)
    this.loginEvents.sort((a, b) => b.timestamp - a.timestamp);
    
    // Extract unique users
    this.uniqueUsers = this.extractUniqueUsers();
    
    // Calculate stats
    this.calculateStats();
    
    // Apply initial filters
    this.applyFilters();
    
    this.loading = false;
  }
  
  /**
   * Loads user activities from the backend API
   */
  loadUserActivityFromApi(): void {
    if (!this.fingerprintService.getUserActivities) {
      console.log('getUserActivities method not available');
      return;
    }
    
    this.loading = true;
    
    this.fingerprintService.getUserActivities().subscribe({
      next: (activities: UserActivityDto[]) => {
        this.userActivities = activities;
        console.log(`Loaded ${activities.length} user activities from API`);
        
        // Update the unique users list with any additional users from the API
        activities.forEach((activity: UserActivityDto) => {
          if (activity.userId && activity.userName && activity.userEmail) {
            const existingUser = this.uniqueUsers.find(u => u.userId === activity.userId);
            if (!existingUser) {
              this.uniqueUsers.push({
                userId: activity.userId,
                userName: activity.userName,
                userEmail: activity.userEmail
              });
            }
          }
        });
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading user activities from API:', error);
        this.loading = false;
      }
    });
  }
  
  /**
   * Apply filters to the login events
   */
  applyFilters(): void {
    this.filteredEvents = this.loginEvents.filter(event => {
      // Apply user filter
      if (this.selectedUserId !== null && event.userId !== this.selectedUserId) {
        return false;
      }
      
      // Apply search term filter
      if (this.searchTerm) {
        const searchTerm = this.searchTerm.toLowerCase();
        const userName = event.userName?.toLowerCase() || '';
        const userEmail = event.userEmail?.toLowerCase() || '';
        const browser = event.deviceInfo?.browserName?.toLowerCase() || '';
        const os = event.deviceInfo?.osName?.toLowerCase() || '';
        
        if (!userName.includes(searchTerm) && 
            !userEmail.includes(searchTerm) && 
            !browser.includes(searchTerm) && 
            !os.includes(searchTerm)) {
          return false;
        }
      }
      
      // Apply date range filter
      if (this.startDate && new Date(event.timestamp) < new Date(this.startDate)) {
        return false;
      }
      
      if (this.endDate && new Date(event.timestamp) > new Date(this.endDate)) {
        return false;
      }
      
      // Apply device type filter
      if (this.deviceTypeFilter && event.deviceInfo.deviceType !== this.deviceTypeFilter) {
        return false;
      }
      
      return true;
    });
    
    // If we have API data, apply filters to that as well
    // This would typically involve making a new API call with the filters
    if (this.selectedUserId !== null && this.fingerprintService.getUserActivityHistory) {
      this.fingerprintService.getUserActivityHistory(this.selectedUserId).subscribe({
        next: (activities: UserActivityDto[]) => {
          this.userActivities = activities;
          console.log(`Loaded ${activities.length} activities for user ${this.selectedUserId}`);
        },
        error: (error: any) => {
          console.error(`Error loading activities for user ${this.selectedUserId}:`, error);
        }
      });
    } else if (this.deviceTypeFilter) {
      // For device type filtering, we would need to filter on the client side
      // as our API doesn't have an endpoint for this specific filter
      this.userActivities = this.userActivities.filter(activity => 
        activity.deviceType === this.deviceTypeFilter
      );
    }
  }
  
  calculateStats(): void {
    // Count unique devices
    const devices = new Set(this.loginEvents.map(event => event.deviceInfo.visitorId));
    this.uniqueDeviceCount = devices.size;
    
    // Count device types
    this.mobileCount = this.loginEvents.filter(event => 
      event.deviceInfo.deviceType === 'Mobile'
    ).length;
    
    this.desktopCount = this.loginEvents.filter(event => 
      event.deviceInfo.deviceType === 'Desktop'
    ).length;
    
    this.tabletCount = this.loginEvents.filter(event => 
      event.deviceInfo.deviceType === 'Tablet'
    ).length;
  }
  
  resetFilters(): void {
    this.selectedUserId = null;
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.deviceTypeFilter = '';
    this.applyFilters();
  }
  
  clearData(): void {
    // Clear all login event data from all storage locations
    localStorage.removeItem('unihelp_login_events');
    localStorage.removeItem('admin_login_events');
    localStorage.removeItem('unihelp_admin_login_events');
    sessionStorage.removeItem('admin_login_info');
    sessionStorage.removeItem('latest_login_event');
    
    this.loginEvents = [];
    this.filteredEvents = [];
    this.uniqueUsers = [];
    this.calculateStats();
    
    console.log('All login tracking data has been cleared');
  }
  
  /**
   * Periodically checks for new login events
   */
  private checkForNewEvents(): void {
    // Get the latest events from the main app
    const mainAppEvents = this.getMainAppLoginEvents();
    const sharedEvents = this.getSharedLoginEvents();
    
    // If we have new events, add them and update the UI
    if (mainAppEvents.length > 0 || sharedEvents.length > 0) {
      console.log(`Found ${mainAppEvents.length + sharedEvents.length} new login events`);
      
      // Add the new events
      this.loginEvents = [...this.loginEvents, ...mainAppEvents, ...sharedEvents];
      
      // Update the UI
      this.removeDuplicateEvents();
      this.loginEvents.sort((a, b) => b.timestamp - a.timestamp);
      this.uniqueUsers = this.extractUniqueUsers();
      this.applyFilters();
      this.calculateStats();
      
      // Save to local storage
      this.saveLoginEvents(this.loginEvents);
    }
  }
  
  viewEventDetails(event: LoginEvent): void {
    this.selectedEvent = event;
    this.showDetailsModal = true;
  }
  
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedEvent = null;
  }
  
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
  
  getDeviceTypeIcon(deviceType: string): string {
    switch (deviceType) {
      case 'Desktop': return 'cil-desktop';
      case 'Mobile': return 'cil-mobile';
      case 'Tablet': return 'cil-tablet';
      default: return 'cil-devices';
    }
  }
  
  getDeviceTypeClass(deviceType: string): string {
    switch (deviceType) {
      case 'Desktop': return 'badge-primary';
      case 'Mobile': return 'badge-success';
      case 'Tablet': return 'badge-info';
      default: return 'badge-secondary';
    }
  }
  
  getBrowserIcon(browser: string): string {
    switch (browser.toLowerCase()) {
      case 'chrome': return 'cib-chrome';
      case 'firefox': return 'cib-firefox';
      case 'safari': return 'cib-safari';
      case 'edge': return 'cib-edge';
      case 'opera': return 'cib-opera';
      default: return 'cil-globe-alt';
    }
  }
}
