import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Team } from '../models/team.interface';
import { AuthService } from './auth.service';
import { map, switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  private apiUrl = 'http://localhost:3000/teams';
  private teamsUpdatedSubject = new BehaviorSubject<void>(undefined);
  public teamsUpdated$ = this.teamsUpdatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get all teams for the current user (owned by user or user is a member)
   */
  getTeams(): Observable<Team[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of([]);
    }

    return this.http.get<Team[]>(this.apiUrl).pipe(
      map(teams => teams.filter(team => 
        team.userId === currentUser.id.toString() || 
        team.memberIds.includes(currentUser.id.toString())
      )),
      catchError(() => of([]))
    );
  }

  /**
   * Get a specific team (only if user owns it or is a member)
   */
  getTeam(id: string): Observable<Team> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return this.http.get<Team>(`${this.apiUrl}/${id}`).pipe(
      map(team => {
        if (team.userId === currentUser.id.toString() || 
            team.memberIds.includes(currentUser.id.toString())) {
          return team;
        } else {
          throw new Error('Team not found or access denied');
        }
      })
    );
  }

  /**
   * Create a new team with current user as owner
   */
  createTeam(team: Omit<Team, 'id' | 'userId'>): Observable<Team> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const newTeam = {
      ...team,
      id: Date.now().toString(),
      userId: currentUser.id.toString()
    };

    return this.http.post<Team>(this.apiUrl, newTeam).pipe(
      map(() => {
        this.teamsUpdatedSubject.next();
        return newTeam as Team;
      })
    );
  }

  /**
   * Update an existing team (only if user owns it)
   */
  updateTeam(id: string, team: Partial<Team>): Observable<Team> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check ownership before updating
    return this.getTeam(id).pipe(
      switchMap(existingTeam => {
        if (existingTeam.userId !== currentUser.id.toString()) {
          throw new Error('Access denied: Only team owners can update teams');
        }
        return this.http.put<Team>(`${this.apiUrl}/${id}`, team);
      }),
      map(() => {
        this.teamsUpdatedSubject.next();
        return team as Team;
      })
    );
  }

  /**
   * Delete a team (only if user owns it)
   */
  deleteTeam(id: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check ownership before deleting
    return this.getTeam(id).pipe(
      switchMap(existingTeam => {
        if (existingTeam.userId !== currentUser.id.toString()) {
          throw new Error('Access denied: Only team owners can delete teams');
        }
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
      }),
      map(() => {
        this.teamsUpdatedSubject.next();
      })
    );
  }

  /**
   * Add member to team (only if user owns the team)
   */
  addMemberToTeam(teamId: string, memberId: string): Observable<Team> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return this.getTeam(teamId).pipe(
      switchMap(team => {
        if (team.userId !== currentUser.id.toString()) {
          throw new Error('Access denied: Only team owners can add members');
        }
        
        const updatedTeam = {
          ...team,
          memberIds: [...team.memberIds, memberId]
        };
        return this.updateTeam(teamId, updatedTeam);
      })
    );
  }

  /**
   * Remove member from team (only if user owns the team)
   */
  removeMemberFromTeam(teamId: string, memberId: string): Observable<Team> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return this.getTeam(teamId).pipe(
      switchMap(team => {
        if (team.userId !== currentUser.id.toString()) {
          throw new Error('Access denied: Only team owners can remove members');
        }
        
        const updatedTeam = {
          ...team,
          memberIds: team.memberIds.filter(id => id !== memberId)
        };
        return this.updateTeam(teamId, updatedTeam);
      })
    );
  }
} 