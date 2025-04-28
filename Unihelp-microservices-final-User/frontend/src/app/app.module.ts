import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotFoundComponent } from './components/not-found/not-found.component';
import {HttpClientModule} from "@angular/common/http";
import { SignupComponent } from './signup/signup.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";
import {MatChipsModule} from "@angular/material/chips";
import {MatFormFieldModule} from "@angular/material/form-field";
import { ProfileComponent } from './components/profile/profile.component';
import {AuthGuard} from "./auth.guard";
import {AuthService} from "./services/auth.service";
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ResetPasswordModalComponent } from './components/reset-password-modal/reset-password-modal.component';
import { ProfileCompletionComponent } from './components/profile-completion/profile-completion.component';
import { BioAnalysisComponent } from './components/bio-analysis/bio-analysis.component';
import { MessagingModule } from './messaging.module';
import { CoursesComponent } from './courses/courses.component';
import { SuccessComponent } from './success/success.component';
import { CancelComponent } from './cancel/cancel.component';
import { CourseDetailsComponent } from './course-details/course-details.component';
import { PanierComponent } from './panier/panier.component';
import { QuizComponent } from './quiz/quiz.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { RecommendComponent } from './recommend/recommend.component';

import { BlogComponent } from './components/blog/blog.component';
import { BlogService } from './services/blog.service';
import { AddBlogComponent } from './components/add-blog/add-blog.component';
import { BlogDetailsComponent } from './components/blogdetails/blog-details/blog-details.component';
import {EventDetailsDialogComponent, EventListComponent} from './components/event-list/event-list.component';
import {MatCardModule} from "@angular/material/card";
import {MatButtonModule} from "@angular/material/button";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatNativeDateModule} from "@angular/material/core";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {MatDialogModule} from "@angular/material/dialog";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatListModule} from "@angular/material/list";
import {MatTooltipModule} from "@angular/material/tooltip";
import { FullCalendarModule } from '@fullcalendar/angular';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    HomeComponent,
    LoginComponent,
    NotFoundComponent,
    SignupComponent,
    ProfileComponent,
    ResetPasswordComponent,
    ResetPasswordModalComponent,
    ProfileCompletionComponent,
    BioAnalysisComponent,
    CoursesComponent,
    SuccessComponent,
    CancelComponent,
    CourseDetailsComponent,
    PanierComponent,
    QuizComponent,
    ChatbotComponent,
    RecommendComponent,
    BlogComponent,
    AddBlogComponent,
    BlogDetailsComponent,
    EventListComponent,
    EventDetailsDialogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatChipsModule,
    MatIconModule,
    MatInputModule,
    MessagingModule,
    FullCalendarModule,
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    AppRoutingModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatTooltipModule
  ],
  providers: [
    AuthService,
    AuthGuard,
    BlogService,
    { provide: 'Window', useValue: window }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
