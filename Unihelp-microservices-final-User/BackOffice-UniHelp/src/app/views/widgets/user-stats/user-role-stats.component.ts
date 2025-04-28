import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ProgressModule,
  ProgressComponent
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { UserService, User } from '../../../services/user.service';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-user-role-stats',
  templateUrl: './user-role-stats.component.html',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    CardBodyComponent,
    CardHeaderComponent,
    CardFooterComponent,
    ProgressModule,
    ProgressComponent,
    IconDirective,
    ChartjsComponent,
    ButtonDirective,
    DatePipe
  ]
})
export class UserRoleStatsComponent implements OnInit {
  userStats = {
    total: 0,
    admin: 0,
    student: 0,
    mentor: 0, // MENTOR/PROFESSOR role
    banned: 0,
    active: 0,
    googleUsers: 0
  };

  // Properly typed chart data and options
  userChartData: ChartConfiguration['data'] = {
    labels: ['Admin', 'Student', 'Mentor'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#321fdb', '#2eb85c', '#f9b115'],
        hoverBackgroundColor: ['#2819ae', '#25a149', '#e09e13']
      }
    ]
  };

  donutOptions: ChartConfiguration['options'] = {
    aspectRatio: 1,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = context.chart.data.datasets[0].data.reduce((a, b) => (a as number) + (b as number), 0) as number;
            const percentage = Math.round((value / total) * 100);
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  loading = true;
  error: string | null = null;
  lastUpdated = new Date();

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadUserStats();
  }

  loadUserStats(): void {
    this.loading = true;
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.processUserStats(users);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load user statistics';
        this.loading = false;
      }
    });
  }

  processUserStats(users: User[]): void {
    if (!users || users.length === 0) return;

    this.userStats.total = users.length;
    this.userStats.admin = users.filter(user => user.role === 'ADMIN').length;
    this.userStats.student = users.filter(user => user.role === 'STUDENT').length;
    this.userStats.mentor = users.filter(user => user.role === 'MENTOR' || user.role === 'PROFESSOR').length;
    this.userStats.banned = users.filter(user => user.banned).length;
    this.userStats.active = this.userStats.total - this.userStats.banned;
    
    // Update chart data
    this.userChartData.datasets[0].data = [
      this.userStats.admin,
      this.userStats.student,
      this.userStats.mentor
    ];
    
    // Update the last updated timestamp
    this.lastUpdated = new Date();
  }

  getPercentage(value: number): number {
    return this.userStats.total > 0 ? Math.round((value / this.userStats.total) * 100) : 0;
  }

  refreshStats(): void {
    this.loadUserStats();
  }
}
