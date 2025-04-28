import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import {NotFoundComponent} from "./components/not-found/not-found.component";
import {SignupComponent} from "./signup/signup.component";
import {ProfileComponent} from "./components/profile/profile.component";
import {AuthGuard} from "./auth.guard";
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ProfileCompletionComponent } from './components/profile-completion/profile-completion.component';
import { FriendsComponent } from './components/friends/friends.component';
import { MessagingComponent } from './components/messaging/messaging.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import {CoursesComponent} from "./courses/courses.component";
import {SuccessComponent} from "./success/success.component";
import {CancelComponent} from "./cancel/cancel.component";
import {CourseDetailsComponent} from "./course-details/course-details.component";
import {PanierComponent} from "./panier/panier.component";
import {QuizComponent} from "./quiz/quiz.component";
import { ChatbotComponent } from './chatbot/chatbot.component';
import { BlogComponent } from './components/blog/blog.component';
import { AddBlogComponent } from './components/add-blog/add-blog.component';
import { BlogDetailsComponent } from './components/blogdetails/blog-details/blog-details.component';
import { EventListComponent } from './components/event-list/event-list.component';

const routes: Routes = [
  {path:'',component:HomeComponent},
  {path:'login', component: LoginComponent},
  { path: 'signup', component: SignupComponent },
  {path:'home', component: HomeComponent},
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'complete-profile', component: ProfileCompletionComponent, canActivate: [AuthGuard] },
  { path: 'friends', component: FriendsComponent, canActivate: [AuthGuard] },
  { path: 'messages', component: MessagingComponent, canActivate: [AuthGuard] },
  { path: 'messages/:id', component: MessagingComponent, canActivate: [AuthGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'courses', component: CoursesComponent },
  { path: 'success', component: SuccessComponent },
  { path: 'cancel', component: CancelComponent },
  { path: 'course-details/:id', component: CourseDetailsComponent },
  { path: 'panier', component: PanierComponent },
  { path: 'quiz/:courseId', component: QuizComponent },
  { path: 'courses/:courseId/chatbot', component: ChatbotComponent },
  {path:'blogs',component:BlogComponent},
  {path:'blog/:id',component:BlogDetailsComponent},
  {path:'addblog',component:AddBlogComponent},
  {path:'editblog/:id',component:AddBlogComponent},
  { path: 'events', component: EventListComponent },

  { path: '**', component: NotFoundComponent } // Wildcard route for 404
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
