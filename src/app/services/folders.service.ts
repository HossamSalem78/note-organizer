import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Folder } from '../models/folder.interface';
import { tap, map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FoldersService {
  private apiUrl = 'http://localhost:3000/folders';
  private foldersUpdatedSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Observable to listen for folder updates
   */
  get foldersUpdated$(): Observable<void> {
    return this.foldersUpdatedSubject.asObservable();
  }

  /**
   * Notify subscribers that folders have been updated
   */
  private notifyFoldersUpdated(): void {
    this.foldersUpdatedSubject.next(undefined);
  }

  /**
   * Get all folders for the current user
   */
  getFolders(): Observable<Folder[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return new Observable<Folder[]>(subscriber => subscriber.next([]));
    }

    return this.http.get<Folder[]>(`${this.apiUrl}?userId=${currentUser.id}`).pipe(
      map(folders => folders.filter(folder => folder.userId === currentUser.id.toString()))
    );
  }

  /**
   * Get a specific folder by ID (only if it belongs to current user)
   */
  getFolderById(id: string): Observable<Folder> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return this.http.get<Folder>(`${this.apiUrl}/${id}`).pipe(
      map(folder => {
        if (folder.userId !== currentUser.id.toString()) {
          throw new Error('Folder not found or access denied');
        }
        return folder;
      })
    );
  }

  /**
   * Create a new folder with current user's ID
   */
  createFolder(folderData: Omit<Folder, 'id' | 'userId'>): Observable<Folder> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const folder: Folder = {
      ...folderData,
      id: Date.now().toString(), // Generate unique ID
      userId: currentUser.id.toString()
    };

    return this.http.post<Folder>(this.apiUrl, folder).pipe(
      tap(() => this.notifyFoldersUpdated())
    );
  }

  /**
   * Update an existing folder (only if it belongs to current user)
   */
  updateFolder(folderData: Omit<Folder, 'userId'>): Observable<Folder> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First get the existing folder to check ownership and get the userId
    return this.getFolderById(folderData.id).pipe(
      map(existingFolder => {
        const updatedFolder: Folder = {
          ...folderData,
          userId: existingFolder.userId
        };
        return updatedFolder;
      }),
      switchMap(updatedFolder => 
        this.http.put<Folder>(`${this.apiUrl}/${folderData.id}`, updatedFolder)
      ),
      tap(() => this.notifyFoldersUpdated())
    );
  }

  /**
   * Delete a folder by ID (only if it belongs to current user)
   */
  deleteFolder(id: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First check ownership
    return this.getFolderById(id).pipe(
      switchMap(() => this.http.delete<void>(`${this.apiUrl}/${id}`)),
      tap(() => this.notifyFoldersUpdated())
    );
  }
} 