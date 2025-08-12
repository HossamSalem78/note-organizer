import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Note } from '../models/note.interface';
import { tap, map, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private apiUrl = 'http://localhost:3000/notes';
  private notesUpdatedSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Observable to listen for note updates
   */
  get notesUpdated$(): Observable<void> {
    return this.notesUpdatedSubject.asObservable();
  }

  /**
   * Notify subscribers that notes have been updated
   */
  private notifyNotesUpdated(): void {
    this.notesUpdatedSubject.next(undefined);
  }

  /**
   * Get all notes for the current user (only notes created by the user)
   */
  getNotes(): Observable<Note[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return new Observable<Note[]>(subscriber => subscriber.next([]));
    }

    // Get only notes created by the current user
    return this.http.get<Note[]>(`${this.apiUrl}?userId=${currentUser.id}`).pipe(
      map(notes => notes.filter(note => note.userId === currentUser.id.toString())),
      catchError(() => of([]))
    );
  }

  /**
   * Get a specific note by ID (only if it belongs to current user)
   */
  getNoteById(id: string): Observable<Note> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return this.http.get<Note>(`${this.apiUrl}/${id}`).pipe(
      map(note => {
        // Check if user owns the note
        if (note.userId === currentUser.id.toString()) {
          return note;
        }
        
        // User can only access notes they created
        throw new Error('Note not found or access denied');
      })
    );
  }

  /**
   * Create a new note with current user's ID
   */
  createNote(noteData: Omit<Note, 'id' | 'userId'>): Observable<Note> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const note: Note = {
      ...noteData,
      id: Date.now().toString(), // Generate unique ID
      userId: currentUser.id.toString()
    };

    return this.http.post<Note>(this.apiUrl, note).pipe(
      tap(() => this.notifyNotesUpdated())
    );
  }

  /**
   * Update an existing note (only if it belongs to current user or user is in assigned team)
   */
  updateNote(noteData: Omit<Note, 'userId'>): Observable<Note> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First get the existing note to check access and get the userId
    return this.getNoteById(noteData.id).pipe(
      switchMap(existingNote => {
        const updatedNote: Note = {
          ...noteData,
          userId: existingNote.userId
        };
        return this.http.put<Note>(`${this.apiUrl}/${noteData.id}`, updatedNote).pipe(
          tap(() => this.notifyNotesUpdated())
        );
      })
    );
  }

  /**
   * Delete a note by ID (only if it belongs to current user)
   */
  deleteNote(id: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First get the note to check ownership, then delete
    return this.getNoteById(id).pipe(
      switchMap(note => {
        // Only allow deletion if user owns the note
        if (note.userId !== currentUser.id.toString()) {
          throw new Error('Access denied: Only note owners can delete notes');
        }
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
          tap(() => this.notifyNotesUpdated())
        );
      })
    );
  }
} 