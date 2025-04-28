import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface DeviceInfo {
  visitorId: string;
  browserName: string;
  osName: string;
  deviceType: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

export interface LoginEvent {
  userId: number;
  userName: string;
  userEmail: string;
  userRole?: string;
  timestamp: number;
  deviceInfo: DeviceInfo;
}

export interface UserActivityDto {
  id?: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  activityType: string;
  timestamp?: Date;
  ipAddress?: string;
  deviceType: string;
  browserName: string;
  osName: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  visitorId: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
  sessionId?: string;
  successful?: boolean;
  failureReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FingerprintService {
  private readonly STORAGE_KEY = 'unihelp_login_events';
  private readonly ADMIN_STORAGE_KEY = 'unihelp_admin_login_events';
  private readonly SESSION_STORAGE_KEY = 'latest_login_event';
  private readonly API_URL = 'http://localhost:8888/USER/api/auth/user-activity';

  constructor(private http: HttpClient) {
    console.log('User Agent tracking service initialized');
  }

  /**
   * Get device information based on user agent string
   * @returns DeviceInfo object with user agent details
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      // Parse browser info from user agent
      const browserInfo = this.parseBrowserInfo(navigator.userAgent);

      // Generate a simple visitor ID using timestamp and random value
      // This isn't as unique as FingerprintJS but works for basic tracking
      const visitorId = `ua-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Create device info object
      const deviceInfo: DeviceInfo = {
        visitorId: visitorId,
        browserName: browserInfo.browser,
        osName: browserInfo.os,
        deviceType: this.getDeviceType(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      };

      return deviceInfo;
    } catch (error) {
      console.error('Error getting device info:', error);

      // Return a fallback device info with a random ID
      return {
        visitorId: `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        browserName: 'Unknown Browser',
        osName: 'Unknown OS',
        deviceType: 'Unknown Device'
      };
    }
  }

  /**
   * Records a user login with device fingerprinting
   * @param userId User ID
   * @param userName User's display name
   * @param userEmail User's email
   * @param userRole User's role (optional)
   * @returns Promise that resolves when the login is recorded
   */
  async recordLogin(userId: number, userName: string, userEmail: string, userRole?: string): Promise<void> {
    try {
      console.log('Recording login for:', userName, `(${userEmail})`, userRole ? `[${userRole}]` : '');

      // Get the device fingerprint
      const deviceInfo = await this.getDeviceInfo();
      console.log('Device info:', deviceInfo.visitorId, deviceInfo.browserName, deviceInfo.deviceType);

      // Create the login event
      const loginEvent: LoginEvent = {
        userId,
        userName,
        userEmail,
        userRole,
        timestamp: Date.now(),
        deviceInfo
      };

      // 1. Store in backend
      this.recordActivityToBackend('LOGIN', userId, deviceInfo, true);

      // 2. Store in main app's localStorage as backup
      this.storeLoginEvent(loginEvent);

      // 3. Store for admin dashboard in multiple ways
      this.storeForAdminDashboard(loginEvent);

      return Promise.resolve();
    } catch (error) {
      console.error('Error recording login:', error);
      return Promise.reject(error);
    }
  }

  async recordLogout(userId: number): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      this.recordActivityToBackend('LOGOUT', userId, deviceInfo, true);
      return Promise.resolve();
    } catch (error) {
      console.error('Error recording logout:', error);
      return Promise.reject(error);
    }
  }

  async recordPageView(userId: number | null, page: string): Promise<void> {
    try {
      if (userId) {
        const deviceInfo = await this.getDeviceInfo();
        this.recordActivityToBackend('PAGE_VIEW', userId, deviceInfo, true, page);
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Error recording page view:', error);
      return Promise.reject(error);
    }
  }

  private recordActivityToBackend(activityType: string, userId: number, deviceInfo: DeviceInfo, successful: boolean, failureReason?: string): void {
    const activity: UserActivityDto = {
      userId: userId,
      activityType: activityType,
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName,
      osName: deviceInfo.osName,
      visitorId: deviceInfo.visitorId,
      screenResolution: deviceInfo.screenResolution,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      sessionId: this.getSessionId(),
      successful: successful,
      failureReason: failureReason
    };

    this.http.post<UserActivityDto>(`${this.API_URL}/record`, activity)
      .pipe(
        tap(response => console.log('Activity recorded to backend:', response)),
        catchError(error => {
          console.error('Failed to record activity to backend:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Stores login event in localStorage
   * This ensures the data is available for the admin dashboard without backend changes
   */
  private storeLoginEvent(event: LoginEvent): void {
    try {
      // Load existing events
      const events = this.getAllLoginEvents();

      // Add the new event
      events.push(event);

      // Limit storage size (keep last 100 events)
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }

      // Save to main app's localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
      console.log('Login event saved to localStorage:', events.length, 'total events');
    } catch (error) {
      console.error('Error storing login event:', error);
    }
  }

  /**
   * Stores login event specifically for admin dashboard access
   * This parallels the admin session handoff mechanism
   */
  private storeForAdminDashboard(loginEvent: LoginEvent): void {
    try {
      // 1. Store in special localStorage key accessible to admin dashboard
      const adminEvents = JSON.parse(localStorage.getItem(this.ADMIN_STORAGE_KEY) || '[]');
      adminEvents.push(loginEvent);
      localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(adminEvents));

      // 2. Also store in sessionStorage for potential cross-domain access
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(loginEvent));

      // 3. Attempt to send to admin dashboard directly if it's open
      this.sendToAdminDashboard(loginEvent);

      console.log('Login event prepared for admin dashboard');
    } catch (error) {
      console.error('Error storing for admin dashboard:', error);
    }
  }

  /**
   * Attempts to send login event directly to admin dashboard if it's open
   */
  private sendToAdminDashboard(loginEvent: LoginEvent): void {
    try {
      // Try to open a small popup to the admin dashboard with login data
      // This will only work if the user has already logged in as admin
      const adminDashboardUrl = 'http://localhost:4201/api/record-login';

      // Create a form and submit it programmatically
      const form = document.createElement('form');
      form.setAttribute('method', 'post');
      form.setAttribute('action', adminDashboardUrl);
      form.setAttribute('target', '_blank');
      form.style.display = 'none';

      // Add the login data as a hidden input
      const hiddenField = document.createElement('input');
      hiddenField.setAttribute('type', 'hidden');
      hiddenField.setAttribute('name', 'loginData');
      hiddenField.setAttribute('value', JSON.stringify(loginEvent));
      form.appendChild(hiddenField);

      // Add the form to the page and submit it
      document.body.appendChild(form);

      // Use fetch instead of form submission to avoid popup blocking
      fetch(adminDashboardUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ loginEvent }),
        mode: 'no-cors'
      }).catch(() => {
        // Error is expected due to CORS or if admin dashboard is not running
        // Just log it without alerting the user
        console.log('Admin dashboard direct send attempted (expected to fail due to CORS)');
      });

      // Remove the form
      document.body.removeChild(form);
    } catch (error) {
      // We expect this to fail in most cases, so just log it
      console.log('Admin dashboard direct send failed (expected):', error);
    }
  }

  /**
   * Returns all login events from localStorage
   */
  getAllLoginEvents(): LoginEvent[] {
    try {
      const eventsJson = localStorage.getItem(this.STORAGE_KEY);
      if (!eventsJson) {
        return [];
      }
      return JSON.parse(eventsJson);
    } catch (error) {
      console.error('Error reading login events:', error);
      return [];
    }
  }
  
  getUserActivity(userId: number): Observable<UserActivityDto[]> {
    return this.http.get<UserActivityDto[]>(`${this.API_URL}/user/${userId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching user activity:', error);
          return of([]);
        })
      );
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('unihelp_session_id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('unihelp_session_id', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Identifies browser and OS from user agent string
   */
  private parseBrowserInfo(userAgent: string): {browser: string, os: string} {
    const ua = userAgent.toLowerCase();
    
    let browser = 'Unknown';
    // Order matters! Check most specific browsers first
    if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('chrome')) browser = 'Chrome';
    
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    else if (ua.includes('linux')) os = 'Linux';
    
    return { browser, os };
  }
  
  /**
   * Detects device type based on user agent
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }
}
