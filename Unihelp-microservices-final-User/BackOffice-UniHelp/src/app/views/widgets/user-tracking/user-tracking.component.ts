import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CardModule,
  GridModule,
  TableModule,
  BadgeModule,
  ButtonModule,
  FormModule
} from '@coreui/angular';

Chart.register(...registerables);

interface UserActivity {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  activityType: string;
  timestamp: string;
  ipAddress: string;
  deviceType: string;
  browserName: string;
  osName: string;
  screenResolution: string;
  timezone: string;
  language: string;
  visitorId: string;
  userAgent: string;
  referrer: string;
  country: string;
  city: string;
  sessionId: string;
  successful: boolean;
  failureReason: string;
}

interface DashboardStats {
  recentLogins: number;
  deviceDistribution: Record<string, number>;
  browserDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
}

@Component({
  selector: 'app-user-tracking',
  templateUrl: './user-tracking.component.html',
  styleUrls: ['./user-tracking.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CardModule,
    GridModule,
    TableModule,
    BadgeModule,
    ButtonModule,
    FormModule
  ]
})
export class UserTrackingComponent implements OnInit {
  // Reference to Math so we can use it in the template
  public Math = Math;
  public activities: UserActivity[] = [];
  public filteredActivities: UserActivity[] = [];
  public allActivities: UserActivity[] = [];
  public stats: DashboardStats | null = null;
  public loading = true;
  public error = '';
  public deviceChart: Chart | null = null;
  public browserChart: Chart | null = null;
  public osChart: Chart | null = null;
  public selectedActivityType = 'all';

  // Pagination properties
  public currentPage = 1;
  public pageSize = 5; // 5 rows per page as requested
  public totalItems = 0;
  public paginatedActivities: UserActivity[] = [];

  // Filter properties
  public selectedUserId: string | null = null;
  public searchTerm: string = '';
  public startDate: string = '';
  public endDate: string = '';
  public deviceTypeFilter: string = '';

  // Helper methods for the template
  getUniqueDeviceCount(): number {
    if (this.stats?.deviceDistribution) {
      return Object.keys(this.stats.deviceDistribution).length;
    }
    return 0;
  }

  getDesktopCount(): number {
    if (this.stats?.deviceDistribution) {
      return this.stats.deviceDistribution['Desktop'] || 0;
    }
    return 0;
  }

  getMobileCount(): number {
    if (this.stats?.deviceDistribution) {
      return this.stats.deviceDistribution['Mobile'] || 0;
    }
    return 0;
  }

  getMostRecentLoginTime(): string {
    if (!this.activities || this.activities.length === 0) {
      return 'No data';
    }

    // Find the most recent login activity
    const loginActivities = this.activities.filter(activity => activity.activityType === 'LOGIN');
    if (loginActivities.length === 0) {
      return 'No logins';
    }

    // Sort by timestamp in descending order (most recent first)
    loginActivities.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Format the date/time in a user-friendly way
    const mostRecent = loginActivities[0];
    const date = new Date(mostRecent.timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  getMostRecentLoginUser(): string {
    if (!this.activities || this.activities.length === 0) {
      return 'No user data';
    }

    // Find the most recent login activity
    const loginActivities = this.activities.filter(activity => activity.activityType === 'LOGIN');
    if (loginActivities.length === 0) {
      return 'No login data';
    }

    // Sort by timestamp in descending order (most recent first)
    loginActivities.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Return the user name
    const mostRecent = loginActivities[0];
    return mostRecent.userName || 'Unknown user';
  }

  private readonly API_URL = `http://localhost:8888/USER/api/auth/user-activity`;
  // Modern color palette with gradients
  // Modern color palette with gradients - Simplified to work better with TypeScript
  private readonly COLORS_DEVICE: string[] = [
    'rgba(66, 133, 244, 0.8)',  // Blue for Desktop
    'rgba(234, 67, 53, 0.8)',   // Red for Mobile
    'rgba(251, 188, 4, 0.8)',   // Yellow for Tablet
    'rgba(52, 168, 83, 0.8)'    // Green for Other
  ];

  private readonly COLORS_BROWSER: string[] = [
    'rgba(66, 133, 244, 0.8)',  // Blue for Chrome
    'rgba(234, 67, 53, 0.8)',   // Red for Firefox
    'rgba(52, 168, 83, 0.8)',   // Green for Edge
    'rgba(251, 188, 4, 0.8)',   // Yellow for Safari
    'rgba(153, 102, 255, 0.8)'  // Purple for Others
  ];

  private readonly COLORS_OS: string[] = [
    'rgba(52, 168, 83, 0.8)',   // Green for Windows
    'rgba(66, 133, 244, 0.8)',  // Blue for macOS
    'rgba(251, 188, 4, 0.8)',   // Yellow for Linux
    'rgba(234, 67, 53, 0.8)',   // Red for Android
    'rgba(153, 102, 255, 0.8)'  // Purple for iOS
  ];

  private readonly HOVER_COLORS_DEVICE: string[] = [
    'rgba(66, 133, 244, 1)',  // Blue for Desktop
    'rgba(234, 67, 53, 1)',    // Red for Mobile
    'rgba(251, 188, 4, 1)',    // Yellow for Tablet
    'rgba(52, 168, 83, 1)'     // Green for Other
  ];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadRecentActivities();
  }

  loadDashboardStats(): void {
    this.http.get<DashboardStats>(`${this.API_URL}/dashboard-stats`)
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          // Check if we have valid data to render charts
          if (stats && stats.deviceDistribution &&
            Object.keys(stats.deviceDistribution).length > 0) {
            this.renderCharts();
          } else {
            console.warn('Dashboard stats returned empty data');
            // Initialize empty charts to avoid errors
            this.initializeEmptyCharts();
          }
        },
        error: (err) => {
          console.error('Failed to load dashboard stats', err);
          this.error = 'Failed to load stats. Please try again later.';
          this.loading = false;
        }
      });
  }

  loadRecentActivities(activityType: string = 'all'): void {
    this.selectedActivityType = activityType;
    this.loading = true;
    this.error = '';

    let apiUrl = '';
    if (activityType === 'all') {
      // Load ALL types - this is a fallback option
      apiUrl = `${this.API_URL}/date-range?startDate=${this.getLastMonthDateString()}&endDate=${this.getCurrentDateString()}`;
    } else {
      // Load specific activity type
      apiUrl = `${this.API_URL}/type/${activityType}`;
    }

    this.http.get<UserActivity[]>(apiUrl)
      .subscribe({
        next: (activities) => {
          if (activities && Array.isArray(activities)) {
            this.activities = activities;
            this.allActivities = [...activities];
            this.filteredActivities = [...activities];
            this.totalItems = activities.length;
            this.updatePaginatedActivities();
          } else {
            // Handle case where response is not an array
            console.warn('Expected array of activities but got:', activities);
            this.activities = [];
            this.allActivities = [];
            this.filteredActivities = [];
            this.totalItems = 0;
            this.updatePaginatedActivities();
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load user activities', err);
          this.error = 'Failed to load activity data. Please try again later.';
          this.loading = false;
          // Initialize with empty arrays
          this.activities = [];
          this.allActivities = [];
          this.filteredActivities = [];
          this.totalItems = 0;
          this.updatePaginatedActivities();
        }
      });
  }

  onActivityTypeChange(): void {
    this.loadRecentActivities(this.selectedActivityType);
  }

  private  initializeEmptyCharts(): void {
    // Set default empty stats to avoid errors
    if (!this.stats) {
      this.stats = {
        recentLogins: 0,
        deviceDistribution: { 'No Data': 1 },
        browserDistribution: { 'No Data': 1 },
        osDistribution: { 'No Data': 1 }
      };
    }

    // Clear any existing charts
    if (this.deviceChart) this.deviceChart.destroy();
    if (this.browserChart) this.browserChart.destroy();
    if (this.osChart) this.osChart.destroy();

    // Create placeholder charts
    this.createChart('deviceChart', 'Device Types', { 'No Data': 1 }, this.COLORS_DEVICE);
    this.createChart('browserChart', 'Browsers', { 'No Data': 1 }, this.COLORS_BROWSER);
    this.createChart('osChart', 'Operating Systems', { 'No Data': 1 }, this.COLORS_OS);

    this.loading = false;
  }

  renderCharts(): void {
    if (!this.stats) {
      console.error('No stats available for chart rendering');
      this.initializeEmptyCharts();
      return;
    }

    // Clear any existing charts
    if (this.deviceChart) this.deviceChart.destroy();
    if (this.browserChart) this.browserChart.destroy();
    if (this.osChart) this.osChart.destroy();

    // Create new charts with null/undefined checks
    this.createChart('deviceChart', 'Device Types',
      this.stats.deviceDistribution || { 'No Data': 1 },
      this.COLORS_DEVICE);

    this.createChart('browserChart', 'Browsers',
      this.stats.browserDistribution || { 'No Data': 1 },
      this.COLORS_BROWSER);

    this.createChart('osChart', 'Operating Systems',
      this.stats.osDistribution || { 'No Data': 1 },
      this.COLORS_OS);

    this.loading = false;
  }

  private createChart(canvasId: string, title: string, data: Record<string, number>, colorScheme: string[]): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const labels = Object.keys(data);
    const values = Object.values(data);

    // Use simple colors instead of gradients to avoid TypeScript issues
    const backgroundColors: string[] = [];
    const hoverBackgroundColors: string[] = [];

    labels.forEach((_, index) => {
      const colorIndex = index % colorScheme.length;
      backgroundColors.push(colorScheme[colorIndex]);
      hoverBackgroundColors.push(colorScheme[colorIndex].replace('0.8', '1'));
    });

    // Define chart configuration with explicit typing
    // Use a simple chart configuration to avoid TypeScript errors
    const chartConfig: any = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: backgroundColors,
          hoverBackgroundColor: hoverBackgroundColors,
          borderColor: 'rgba(255, 255, 255, 0.6)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 15,
              font: {
                size: 12,
                family: "'Poppins', sans-serif"
              }
            }
          },
          title: {
            display: true,
            text: title,
            font: {
              size: 18,
              family: "'Poppins', sans-serif",
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#333',
            bodyFont: {
              size: 13
            },
            displayColors: false,
            padding: 10,
            borderColor: '#ddd',
            borderWidth: 1,
            callbacks: {
              label(tooltipItem: any) {
                const label = tooltipItem.label || '';
                const value = tooltipItem.raw as number;
                // Calculate total safely
                const dataset = tooltipItem.chart.data.datasets[0].data as number[];
                let total = 0;
                for (let i = 0; i < dataset.length; i++) {
                  total += Number(dataset[i]);
                }
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        // Remove animations configuration as it's causing TypeScript errors
      }
    };

    // Create the chart with the simplified configuration
    const chart = new Chart(canvas, chartConfig);

    if (canvasId === 'deviceChart') this.deviceChart = chart;
    else if (canvasId === 'browserChart') this.browserChart = chart;
    else if (canvasId === 'osChart') this.osChart = chart;
  }

  formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  private getCurrentDateString(): string {
    // Format as ISO string that Java's LocalDateTime can parse
    const now = new Date();
    return now.toISOString().slice(0, 19); // Remove milliseconds
  }

  // Pagination methods
  public updatePaginatedActivities(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedActivities = this.filteredActivities.slice(startIndex, startIndex + this.pageSize);
    this.activities = this.paginatedActivities;
  }

  public goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.updatePaginatedActivities();
    }
  }

  public previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  public nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  public getTotalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  public getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Show 5 page numbers with current page in the middle when possible
    if (this.currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    } else if (this.currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      return [this.currentPage - 2, this.currentPage - 1, this.currentPage, this.currentPage + 1, this.currentPage + 2];
    }
  }

  private getLastMonthDateString(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 19); // Remove milliseconds
  }

  /**
   * Filter activities based on user selection
   */
  public applyFilters(): void {
    console.log('Applying filters');
    this.filteredActivities = this.allActivities.filter(activity => {
      // Filter by selected user
      if (this.selectedUserId && activity.userId.toString() !== this.selectedUserId) {
        return false;
      }

      // Filter by search term (check username, email, or IP)
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const nameMatch = activity.userName?.toLowerCase().includes(searchLower) || false;
        const emailMatch = activity.userEmail?.toLowerCase().includes(searchLower) || false;
        const ipMatch = activity.ipAddress?.toLowerCase().includes(searchLower) || false;

        if (!nameMatch && !emailMatch && !ipMatch) {
          return false;
        }
      }

      // Filter by date range
      if (this.startDate) {
        const activityDate = new Date(activity.timestamp);
        const startDate = new Date(this.startDate);
        startDate.setHours(0, 0, 0, 0); // Start of day

        if (activityDate < startDate) {
          return false;
        }
      }

      if (this.endDate) {
        const activityDate = new Date(activity.timestamp);
        const endDate = new Date(this.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day

        if (activityDate > endDate) {
          return false;
        }
      }

      // Filter by device type
      if (this.deviceTypeFilter && activity.deviceType !== this.deviceTypeFilter) {
        return false;
      }

      return true;
    });

    this.totalItems = this.filteredActivities.length;
    this.currentPage = 1; // Reset to first page after filtering
    this.updatePaginatedActivities();
  }

  /**
   * Reset all filters to default values
   */
  public resetFilters(): void {
    this.selectedUserId = null;
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.deviceTypeFilter = '';
    this.filteredActivities = [...this.allActivities];
    this.totalItems = this.filteredActivities.length;
    this.currentPage = 1; // Reset to first page
    this.updatePaginatedActivities();
  }

  /**
   * Clear all stored data
   */
  public clearData(): void {
    if (confirm('Are you sure you want to clear all user tracking data? This cannot be undone.')) {
      // Clear from local storage if any
      localStorage.removeItem('unihelp_login_events');

      // Clear in-memory data
      this.activities = [];
      this.filteredActivities = [];
      this.allActivities = [];

      // Optionally, you can also make an API call to clear data on the server
      // this.http.delete(`${this.API_URL}/clear-all`).subscribe(...)
    }
  }
}
