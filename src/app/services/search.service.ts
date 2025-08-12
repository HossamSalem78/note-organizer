import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SearchState {
  term: string;
  type: string;
}

export interface TeamsSearchState {
  term: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchStateSubject = new BehaviorSubject<SearchState>({
    term: '',
    type: 'all'
  });

  private teamsSearchStateSubject = new BehaviorSubject<TeamsSearchState>({
    term: '',
    type: 'all'
  });

  public searchState$ = this.searchStateSubject.asObservable();
  public teamsSearchState$ = this.teamsSearchStateSubject.asObservable();

  constructor() { }

  updateSearchTerm(term: string): void {
    const currentState = this.searchStateSubject.value;
    this.searchStateSubject.next({
      ...currentState,
      term
    });
  }

  updateSearchType(type: string): void {
    const currentState = this.searchStateSubject.value;
    this.searchStateSubject.next({
      ...currentState,
      type
    });
  }

  getCurrentState(): SearchState {
    return this.searchStateSubject.value;
  }

  // Teams search methods
  updateTeamsSearchTerm(term: string): void {
    const currentState = this.teamsSearchStateSubject.value;
    this.teamsSearchStateSubject.next({
      ...currentState,
      term
    });
  }

  updateTeamsSearchType(type: string): void {
    const currentState = this.teamsSearchStateSubject.value;
    this.teamsSearchStateSubject.next({
      ...currentState,
      type
    });
  }

  getCurrentTeamsState(): TeamsSearchState {
    return this.teamsSearchStateSubject.value;
  }
} 