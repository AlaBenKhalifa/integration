import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { FriendsComponent } from './components/friends/friends.component';
import { MessagingComponent } from './components/messaging/messaging.component';
import { NotificationsComponent } from './components/notifications/notifications.component';

@NgModule({
  declarations: [
    FriendsComponent,
    MessagingComponent, 
    NotificationsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BrowserAnimationsModule
  ],
  exports: [
    FriendsComponent,
    MessagingComponent,
    NotificationsComponent,
    CommonModule,
    FormsModule
  ]
})
export class MessagingModule { }
