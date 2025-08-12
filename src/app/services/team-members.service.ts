import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TeamMember } from '../models/team-member.interface';

@Injectable({
  providedIn: 'root'
})
export class TeamMembersService {
  private apiUrl = 'http://localhost:3000/teamMembers';

  constructor(private http: HttpClient) {}

  getTeamMembers(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(this.apiUrl);
  }

  getTeamMember(id: string): Observable<TeamMember> {
    return this.http.get<TeamMember>(`${this.apiUrl}/${id}`);
  }

  getTeamMembersByIds(ids: string[]): Observable<TeamMember[]> {
    const queryParams = ids.map(id => `id=${id}`).join('&');
    return this.http.get<TeamMember[]>(`${this.apiUrl}?${queryParams}`);
  }
} 