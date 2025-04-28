import { Component, OnInit, ErrorHandler, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'UniHelp-Front';
  isLoaded = false;
  error: any = null;
  window = window; // Add reference to window object for template

  constructor(private router: Router, private ngZone: NgZone) {
    // Error handlers disabled to prevent showing error screen
    console.log('App component initialized');
  }

  ngOnInit() {
    // Immediately mark as loaded
    this.isLoaded = true;
    
    // Track router events
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log('Navigation completed:', event.url);
      }
    });
  }
}
