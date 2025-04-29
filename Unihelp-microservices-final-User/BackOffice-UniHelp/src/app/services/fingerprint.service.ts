import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface DeviceInfo {
  visitorId: string;
  browserName: string;
  osName: string;
  deviceType: string;
  screenResolution: string;
  timezone: string;
  language: string;
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
  private readonly API_URL = 'http://localhost:8888/USER/api/auth/user-activity';

  constructor(private http: HttpClient) {
    console.log('User Agent tracking service initialized');
  }

  /**
   * Generates a fingerprint ID and device info for the current user device
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
      throw error;
    }
  }

  /**
   * Records a login event for a user
   */
  async recordLogin(userId: number, userName: string, userEmail: string): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();

      const loginEvent: LoginEvent = {
        userId,
        userName,
        userEmail,
        timestamp: Date.now(),
        deviceInfo
      };

      this.storeLoginEvent(loginEvent);
      console.log('Login recorded successfully:', loginEvent);
    } catch (error) {
      console.error('Error recording login:', error);
    }
  }

  /**
   * Stores login event in localStorage
   */
  private storeLoginEvent(event: LoginEvent): void {
    const events = this.getAllLoginEvents();
    events.push(event);

    // Limit storage size (keep last 100 events)
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
  }

  /**
   * Gets activity data from the backend API
   */
  getUserActivities(): Observable<UserActivityDto[]> {
    return this.http.get<UserActivityDto[]>(`${this.API_URL}/date-range?startDate=${this.getLastMonthDateString()}&endDate=${this.getCurrentDateString()}`)
      .pipe(
        tap(activities => console.log(`Fetched ${activities.length} user activities`)),
        catchError(error => {
          console.error('Error fetching user activities:', error);
          return of([]);
        })
      );
  }

  getActivityByType(activityType: string): Observable<UserActivityDto[]> {
    return this.http.get<UserActivityDto[]>(`${this.API_URL}/type/${activityType}`)
      .pipe(
        tap(activities => console.log(`Fetched ${activities.length} ${activityType} activities`)),
        catchError(error => {
          console.error(`Error fetching ${activityType} activities:`, error);
          return of([]);
        })
      );
  }

  getUserActivityHistory(userId: number): Observable<UserActivityDto[]> {
    return this.http.get<UserActivityDto[]>(`${this.API_URL}/user/${userId}`)
      .pipe(
        tap(activities => console.log(`Fetched ${activities.length} activities for user ${userId}`)),
        catchError(error => {
          console.error(`Error fetching activities for user ${userId}:`, error);
          return of([]);
        })
      );
  }

  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard-stats`)
      .pipe(
        tap(stats => console.log('Fetched dashboard stats:', stats)),
        catchError(error => {
          console.error('Error fetching dashboard stats:', error);
          return of({});
        })
      );
  }

  private getCurrentDateString(): string {
    return new Date().toISOString();
  }

  private getLastMonthDateString(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString();
  }

  /**
   * Gets all login events
   */
  getAllLoginEvents(): LoginEvent[] {
    const eventsJson = localStorage.getItem(this.STORAGE_KEY);
    return eventsJson ? JSON.parse(eventsJson) : [];
  }

  /**
   * Gets login events for a specific user
   */
  getLoginEventsForUser(userId: number): LoginEvent[] {
    return this.getAllLoginEvents().filter(event => event.userId === userId);
  }

  /**
   * Gets unique users who have logged in
   */
  getUniqueUsers(): {userId: number, userName: string, userEmail: string}[] {
    const events = this.getAllLoginEvents();
    const userMap = new Map<number, {userId: number, userName: string, userEmail: string}>();

    events.forEach(event => {
      userMap.set(event.userId, {
        userId: event.userId,
        userName: event.userName,
        userEmail: event.userEmail
      });
    });

    return Array.from(userMap.values());
  }

  /**
   * Clears all login events
   */
  clearAllLoginEvents(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Parses browser and OS info from user agent
   */
  private parseBrowserInfo(userAgent: string): {browser: string, os: string} {
    const ua = userAgent.toLowerCase();

    let browser = 'Unknown';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    else if (ua.includes('linux')) os = 'Linux';

    return { browser, os };
  }

  /**
   * Detects the device type from user agent
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
