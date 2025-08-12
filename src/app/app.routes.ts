import { Routes } from '@angular/router';
import { NoteListComponent } from './notes/note-list/note-list.component';
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { TeamMembersComponent } from './team-members/team-members.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/notes', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'notes', 
    component: NoteListComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'team-members', 
    component: TeamMembersComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/notes' }
];
