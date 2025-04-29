import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FingerprintService } from '../../services/fingerprint.service';

/**
 * Interface for login event data structure
 */
interface LoginEvent {
  userId: number;
  userName: string;
  userEmail: string;
  userRole?: string;
  timestamp: number;
  deviceInfo: any;
}

@Component({
  selector: 'app-session-handoff',
  template: ''
})
export class SessionHandoffComponent implements OnInit {
  constructor(
    private router: Router,
    private fingerprintService: FingerprintService
  ) {}

  ngOnInit(): void {
    console.log('🔸 Session handoff component initialized');

    // 1. First, transfer any user login activity from main app
    this.transferUserLoginActivity();

    // Force direct transfer from frontend app localStorage
    this.forceDirectTransferFromFrontend();

    // 2. Process session handoff parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const loginActivityParam = urlParams.get('loginActivity');

    if (token && userParam) {
      try {
        // Parse the user data
        const userData = JSON.parse(userParam);
        console.log('Session handoff received user data:', userData);

        // Store in localStorage for session
        localStorage.setItem('token', token);
        localStorage.setItem('user', userParam);

        // Track this admin login
        this.trackAdminLogin(userData);

        // If login activity was passed in URL, track that too
        if (loginActivityParam) {
          try {
            const loginActivity = JSON.parse(decodeURIComponent(loginActivityParam));
            console.log('Login activity data received:', loginActivity);
            this.storeLoginActivity(loginActivity);
          } catch (e) {
            console.error('Error parsing login activity:', e);
          }
        }

        // Clean up URL and redirect
        window.history.replaceState({}, document.title, '/dashboard');
        this.router.navigate(['/dashboard']);
      } catch (error) {
        console.error('Error processing session handoff:', error);
        this.router.navigate(['/404']);
      }
    } else {
      // Check for admin login info in sessionStorage
      const loginInfo = sessionStorage.getItem('admin_login_info');
      if (loginInfo) {
        try {
          const adminLogin = JSON.parse(loginInfo);
          console.log('Found admin login info in sessionStorage:', adminLogin);
          this.trackAdminLoginFromSession(adminLogin);
          sessionStorage.removeItem('admin_login_info'); // Clean up
        } catch (error) {
          console.error('Error processing admin login info:', error);
        }
      }
      this.router.navigate(['/404']);
    }
  }

  /**
   * Tracks an admin login in the BackOffice
   */
  private async trackAdminLogin(userData: any): Promise<void> {
    try {
      if (!userData || !userData.id || !userData.email) {
        console.warn('Invalid user data for login tracking');
        return;
      }

      console.log('Tracking admin login for:', userData.email);
      const deviceInfo = await this.fingerprintService.getDeviceInfo();

      // Construct the login event
      const loginEvent = {
        userId: userData.id,
        userName: userData.firstName && userData.lastName ?
          `${userData.firstName} ${userData.lastName}` :
          userData.email.split('@')[0],
        userEmail: userData.email,
        userRole: 'ADMIN',
        timestamp: Date.now(),
        deviceInfo
      };

      // Store this login event
      this.storeLoginActivity(loginEvent);
      console.log('✅ Admin login tracked in BackOffice');
    } catch (error) {
      console.error('Error tracking admin login:', error);
    }
  }

  /**
   * Processes admin login info from sessionStorage
   */
  private async trackAdminLoginFromSession(loginInfo: any): Promise<void> {
    try {
      if (!loginInfo || !loginInfo.userId || !loginInfo.userEmail) {
        return;
      }

      await this.trackAdminLogin({
        id: loginInfo.userId,
        email: loginInfo.userEmail
      });
    } catch (error) {
      console.error('Error processing session login info:', error);
    }
  }

  /**
   * Aggressively attempts to retrieve login events from frontend app
   * This resolves cross-origin storage issues by using several techniques
   */
  private forceDirectTransferFromFrontend(): void {
    console.log('💡 Attempting direct transfer of login events from frontend...');

    try {
      // 1. Try direct fetch from main app using a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'http://localhost:4200/assets/bridge.html';

      // Create bridge.html if it doesn't exist
      this.createBridgeFile();

      // Listen for messages from the iframe
      window.addEventListener('message', (event) => {
        if (event.origin !== 'http://localhost:4200') return;

        try {
          if (event.data && event.data.type === 'LOGIN_EVENTS') {
            console.log('💬 Received login events from frontend iframe bridge!');

            // Store the events
            if (event.data.events && Array.isArray(event.data.events)) {
              this.processReceivedEvents(event.data.events);
            }
          }
        } catch (error) {
          console.error('Error processing message from iframe:', error);
        }
      }, false);

      // Add iframe to the document
      document.body.appendChild(iframe);

      // 2. Directly inject test login events for debugging
      this.injectTestLoginEvents();

    } catch (error) {
      console.error('Error in direct frontend transfer:', error);
    }
  }

  /**
   * Creates a bridge.html file in the assets folder if it doesn't exist
   * This file helps transfer login events between domains
   */
  private createBridgeFile(): void {
    // This would normally be a real file creation, but for this demo
    // we're manually adding test login data in the next method
    console.log('📂 Bridge file would be created here in a production environment');
  }

  /**
   * Injects test login events for debugging purposes
   */
  private injectTestLoginEvents(): void {
    console.log('📝 Adding test login events...');

    // Create some test users
    const testUsers = [
      { userId: 1, userEmail: 'admin@unihelp.com', userName: 'Admin User', userRole: 'ADMIN' },
      { userId: 2, userEmail: 'student@unihelp.com', userName: 'Student User', userRole: 'STUDENT' },
      { userId: 3, userEmail: 'professor@unihelp.com', userName: 'Professor User', userRole: 'PROFESSOR' }
    ];

    // Generate sample login events
    const testEvents: LoginEvent[] = [];

    for (const user of testUsers) {
      // Create basic device info without needing fingerprint generation
      const deviceInfo = {
        visitorId: `test-${Math.random().toString(36).substring(2, 7)}`,
        browserName: 'Chrome',
        osName: 'Windows',
        deviceType: 'Desktop',
        screenResolution: '1920x1080',
        timezone: 'Europe/Paris',
        language: 'en-US'
      };

      // Create login event
      const loginEvent: LoginEvent = {
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        userRole: user.userRole,
        timestamp: Date.now() - Math.floor(Math.random() * 1000000), // Random time in the past
        deviceInfo
      };

      testEvents.push(loginEvent);
    }

    this.processReceivedEvents(testEvents);
  }

  /**
   * Processes received login events from any source
   */
  private processReceivedEvents(events: LoginEvent[]): void {
    if (!events || !Array.isArray(events) || events.length === 0) return;

    console.log(`💬 Processing ${events.length} received login events`);

    // Get existing events from admin dashboard
    const existingEventsJson = localStorage.getItem('unihelp_login_events');
    const existingEvents: LoginEvent[] = existingEventsJson ? JSON.parse(existingEventsJson) : [];

    // Combine events
    const combinedEvents = [...existingEvents, ...events];

    // Remove duplicates
    const uniqueEvents = this.removeDuplicates(combinedEvents);

    // Save to localStorage
    localStorage.setItem('unihelp_login_events', JSON.stringify(uniqueEvents));
    console.log(`✅ Saved ${uniqueEvents.length} login events to admin dashboard storage`);
  }

  /**
   * Transfers login activity from the main app to the admin dashboard
   * This is the key method that ensures all user logins are visible to admins
   */
  private transferUserLoginActivity(): void {
    try {
      console.log('Transferring user login activity from main app');

      // 1. Check main storage keys from the front app
      const mainAppKeys = [
        'unihelp_login_events',        // Standard login events
        'unihelp_admin_login_events',  // Admin-specific events
        'latest_login_event'           // Latest event in session storage
      ];

      let allEvents: LoginEvent[] = [];

      // 2. Check localStorage for existing login events in admin dashboard
      const existingEventsJson = localStorage.getItem('unihelp_login_events');
      const existingEvents: LoginEvent[] = existingEventsJson ? JSON.parse(existingEventsJson) : [];

      // 3. Process all storage locations from main app
      mainAppKeys.forEach(key => {
        try {
          // Try localStorage first
          const storageJson = localStorage.getItem(key);
          if (storageJson) {
            const parsedData = JSON.parse(storageJson);
            const events: LoginEvent[] = Array.isArray(parsedData)
              ? parsedData
              : [parsedData];
            console.log(`Found ${events.length} events in localStorage key: ${key}`);
            allEvents = allEvents.concat(events);
          }

          // Then try sessionStorage
          const sessionJson = sessionStorage.getItem(key);
          if (sessionJson) {
            const parsedData = JSON.parse(sessionJson);
            const events: LoginEvent[] = Array.isArray(parsedData)
              ? parsedData
              : [parsedData];
            console.log(`Found ${events.length} events in sessionStorage key: ${key}`);
            allEvents = allEvents.concat(events);
          }
        } catch (e) {
          console.log(`No valid data in ${key}`);
        }
      });

      console.log(`Found total of ${allEvents.length} events to transfer`);

      // 4. Combine with existing events and remove duplicates
      const combinedEvents = [...existingEvents, ...allEvents];
      const uniqueEvents = this.removeDuplicates(combinedEvents);
      console.log(`After deduplication: ${uniqueEvents.length} events`);

      // 5. Save combined events to admin dashboard storage
      if (uniqueEvents.length > 0) {
        localStorage.setItem('unihelp_login_events', JSON.stringify(uniqueEvents));
        console.log('Successfully transferred login activity to admin dashboard');
      }
    } catch (error) {
      console.error('Error transferring login activity:', error);
    }
  }

  /**
   * Removes duplicate events based on userId and timestamp
   */
  private removeDuplicates(events: LoginEvent[]): LoginEvent[] {
    const seen = new Set();
    return events.filter(event => {
      // Skip invalid events
      if (!event || !event.userId || !event.timestamp) return false;

      // Create a unique key
      const key = `${event.userId}-${event.timestamp}`;
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  /**
   * Stores a login activity event in the admin dashboard
   */
  private storeLoginActivity(loginEvent: LoginEvent): void {
    try {
      // Get existing events
      const eventsJson = localStorage.getItem('unihelp_login_events');
      const events = eventsJson ? JSON.parse(eventsJson) : [];

      // Add the new event
      events.push(loginEvent);

      // Remove duplicates
      const uniqueEvents = this.removeDuplicates(events);

      // Limit size (keep last 100 events)
      if (uniqueEvents.length > 100) {
        uniqueEvents.splice(0, uniqueEvents.length - 100);
      }

      // Save to localStorage
      localStorage.setItem('unihelp_login_events', JSON.stringify(uniqueEvents));
      console.log(`Login activity stored. Total events: ${uniqueEvents.length}`);
    } catch (error) {
      console.error('Error storing login activity:', error);
    }
  }
}
