import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Tag } from '../models/tag.interface';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TagsService {
  private apiUrl = 'http://localhost:3000/tags';
  private tagsUpdatedSubject = new BehaviorSubject<void>(undefined);

  constructor(private http: HttpClient) { }

  /**
   * Observable to listen for tag updates
   */
  get tagsUpdated$(): Observable<void> {
    return this.tagsUpdatedSubject.asObservable();
  }

  /**
   * Notify subscribers that tags have been updated
   */
  private notifyTagsUpdated(): void {
    this.tagsUpdatedSubject.next(undefined);
  }

  /**
   * Get all tags
   */
  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(this.apiUrl);
  }

  /**
   * Get a specific tag by ID
   */
  getTagById(id: string): Observable<Tag> {
    return this.http.get<Tag>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new tag
   */
  createTag(tag: Tag): Observable<Tag> {
    return this.http.post<Tag>(this.apiUrl, tag).pipe(
      tap(() => this.notifyTagsUpdated())
    );
  }

  /**
   * Update an existing tag
   */
  updateTag(tag: Tag): Observable<Tag> {
    return this.http.put<Tag>(`${this.apiUrl}/${tag.id}`, tag).pipe(
      tap(() => this.notifyTagsUpdated())
    );
  }

  /**
   * Delete a tag by ID
   */
  deleteTag(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.notifyTagsUpdated())
    );
  }

  /**
   * Get tags by IDs
   */
  getTagsByIds(tagIds: string[]): Observable<Tag[]> {
    if (!tagIds || tagIds.length === 0) {
      return new Observable(observer => observer.next([]));
    }
    
    const queryParams = tagIds.map(id => `id=${id}`).join('&');
    return this.http.get<Tag[]>(`${this.apiUrl}?${queryParams}`);
  }
} 