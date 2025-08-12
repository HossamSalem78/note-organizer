import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Note } from '../models/note.interface';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private noteDetailsModalSubject = new BehaviorSubject<{ show: boolean; note: Note | null }>({
    show: false,
    note: null
  });

  private editNoteModalSubject = new BehaviorSubject<{ show: boolean; note: Note | null }>({
    show: false,
    note: null
  });

  private deleteConfirmationModalSubject = new BehaviorSubject<{ show: boolean; note: Note | null }>({
    show: false,
    note: null
  });

  public noteDetailsModal$: Observable<{ show: boolean; note: Note | null }> = this.noteDetailsModalSubject.asObservable();
  public editNoteModal$: Observable<{ show: boolean; note: Note | null }> = this.editNoteModalSubject.asObservable();
  public deleteConfirmationModal$: Observable<{ show: boolean; note: Note | null }> = this.deleteConfirmationModalSubject.asObservable();

  openNoteDetailsModal(note: Note): void {
    this.noteDetailsModalSubject.next({ show: true, note });
  }

  closeNoteDetailsModal(): void {
    this.noteDetailsModalSubject.next({ show: false, note: null });
  }

  openEditNoteModal(note: Note): void {
    this.editNoteModalSubject.next({ show: true, note });
  }

  closeEditNoteModal(): void {
    this.editNoteModalSubject.next({ show: false, note: null });
  }

  openDeleteConfirmationModal(note: Note): void {
    this.deleteConfirmationModalSubject.next({ show: true, note });
  }

  closeDeleteConfirmationModal(): void {
    this.deleteConfirmationModalSubject.next({ show: false, note: null });
  }

  isAnyModalOpen(): boolean {
    const noteDetailsState = this.noteDetailsModalSubject.value;
    const editNoteState = this.editNoteModalSubject.value;
    const deleteConfirmationState = this.deleteConfirmationModalSubject.value;
    
    return noteDetailsState.show || editNoteState.show || deleteConfirmationState.show;
  }

  closeAllModals(): void {
    this.noteDetailsModalSubject.next({ show: false, note: null });
    this.editNoteModalSubject.next({ show: false, note: null });
    this.deleteConfirmationModalSubject.next({ show: false, note: null });
  }
} 