import { Component, OnInit, Output, EventEmitter, OnDestroy, Inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFolder, faTrashAlt, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Folder } from '../../models/folder.interface';
import { FoldersService } from '../../services/folders.service';
import { Subscription } from 'rxjs';
import { App } from '../../app';

@Component({
  selector: 'app-folder-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './folder-sidebar.component.html',
  styleUrl: './folder-sidebar.component.css'
})
export class FolderSidebarComponent implements OnInit, OnDestroy {
  // Font Awesome icons
  faFolder = faFolder;
  faTrashAlt = faTrashAlt;
  faExclamationTriangle = faExclamationTriangle;

  @ViewChild('folderInput', { static: false }) folderInput!: ElementRef<HTMLInputElement>;

  // OS detection for keyboard shortcuts
  private isMac(): boolean {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  folders: Folder[] = [];
  selectedFolderId: string | null = null;
  loading = false;
  error: string | null = null;
  showAddFolder = false;
  newFolderName = '';

  // Delete confirmation modal
  showDeleteConfirmationModal = false;
  folderToDelete: Folder | null = null;
  deletingFolder = false;

  // Inline editing properties
  editingFolderId: string | null = null;
  editingFolderName = '';

  @Output() folderSelected = new EventEmitter<string | null>();

  private foldersUpdateSubscription: Subscription = new Subscription();

  constructor(
    private foldersService: FoldersService,
    @Inject(App) private app: App
  ) {}

  ngOnInit(): void {
    // Add document click listener to close dropdown when clicking outside
    document.addEventListener('click', this.onDocumentClick.bind(this));
    
    // Subscribe to folder updates
    this.foldersUpdateSubscription = this.foldersService.foldersUpdated$.subscribe(() => {
      this.loadFolders();
    });
    
    this.loadFolders();
  }

  ngOnDestroy(): void {
    // Remove document click listener
    document.removeEventListener('click', this.onDocumentClick.bind(this));
    
    // Clean up subscription
    if (this.foldersUpdateSubscription) {
      this.foldersUpdateSubscription.unsubscribe();
    }
  }

  loadFolders(): void {
    this.loading = true;
    this.error = null;

    this.foldersService.getFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load folders';
        this.loading = false;
        console.error('Error loading folders:', error);
      }
    });
  }

  selectFolder(folderId: string | null): void {
    this.selectedFolderId = folderId;
    this.folderSelected.emit(folderId);
  }

  // Inline editing methods
  startEditingFolder(folder: Folder, event: Event): void {
    event.stopPropagation();
    this.editingFolderId = folder.id;
    this.editingFolderName = folder.name;
    
    // Focus the input after a brief delay to ensure it's rendered
    setTimeout(() => {
      const inputElement = document.querySelector(`input[data-folder-id="${folder.id}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 0);
  }

  saveFolderName(folder: Folder): void {
    if (!this.editingFolderName.trim() || this.editingFolderName.trim() === folder.name) {
      this.cancelEditing();
      return;
    }

    const updatedFolder = { ...folder, name: this.editingFolderName.trim() };
    
    this.foldersService.updateFolder(updatedFolder).subscribe({
      next: () => {
        this.editingFolderId = null;
        this.editingFolderName = '';
        this.app.showToasterNotification(`Folder renamed to '${updatedFolder.name}' successfully!`);
      },
      error: (error) => {
        console.error('Error updating folder:', error);
        this.app.showToasterNotification('Failed to rename folder. Please try again.', 'error');
        // Reset to original name on error
        this.editingFolderName = folder.name;
      }
    });
  }

  cancelEditing(): void {
    this.editingFolderId = null;
    this.editingFolderName = '';
  }

  onFolderNameKeyDown(event: KeyboardEvent, folder: Folder): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveFolderName(folder);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditing();
    }
  }

  toggleAddFolder(): void {
    this.showAddFolder = !this.showAddFolder;
    if (!this.showAddFolder) {
      this.newFolderName = '';
    } else {
      // Focus the input when dropdown opens
      setTimeout(() => {
        if (this.folderInput) {
          this.folderInput.nativeElement.focus();
        }
      }, 0);
    }
  }

  addFolder(): void {
    if (!this.newFolderName.trim()) return;

    const newFolderData = {
      name: this.newFolderName.trim()
    };

    this.foldersService.createFolder(newFolderData).subscribe({
      next: () => {
        // The folders list will be automatically refreshed via the subscription
        this.newFolderName = '';
        this.showAddFolder = false;
        // Show success toaster
        this.app.showToasterNotification(`Created New Folder\nFolder '${newFolderData.name}' created successfully!`);
      },
      error: (error) => {
        console.error('Error creating folder:', error);
        this.app.showToasterNotification('Failed to create folder. Please try again.', 'error');
      }
    });
  }

  deleteFolder(folderId: string): void {
    const folder = this.folders.find(f => f.id === folderId);
    if (folder) {
      this.folderToDelete = folder;
      this.showDeleteConfirmationModal = true;
    }
  }

  openDeleteConfirmationModal(folder: Folder): void {
    this.folderToDelete = folder;
    this.showDeleteConfirmationModal = true;
  }

  closeDeleteConfirmationModal(): void {
    this.showDeleteConfirmationModal = false;
    this.folderToDelete = null;
  }

  confirmDeleteFolder(): void {
    if (!this.folderToDelete) return;

    this.deletingFolder = true;
    this.foldersService.deleteFolder(this.folderToDelete.id).subscribe({
      next: () => {
        this.deletingFolder = false;
        this.closeDeleteConfirmationModal();
        // The folders list will be automatically refreshed via the subscription
        if (this.selectedFolderId === this.folderToDelete!.id) {
          this.selectFolder(null);
        }
        // Show success toaster
        this.app.showToasterNotification(`Folder '${this.folderToDelete!.name}' deleted successfully!`);
      },
      error: (error) => {
        console.error('Error deleting folder:', error);
        this.deletingFolder = false;
        this.app.showToasterNotification('Failed to delete folder. Please try again.', 'error');
      }
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private onDocumentClick(event: MouseEvent): void {
    // Close folder dropdown when clicking outside
    const target = event.target as HTMLElement;
    const folderDropdownContainer = target.closest('.folder-dropdown-container');
    
    if (this.showAddFolder && !folderDropdownContainer) {
      this.showAddFolder = false;
      this.newFolderName = '';
    }

    // Close inline editing when clicking outside
    if (this.editingFolderId) {
      const editingInput = target.closest('.folder-name-input');
      if (!editingInput) {
        this.cancelEditing();
      }
    }
  }

  onFolderDropdownClick(event: Event): void {
    event.stopPropagation();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Escape key to close folder dropdown
    if (event.key === 'Escape') {
      if (this.showAddFolder) {
        this.showAddFolder = false;
        this.newFolderName = '';
      } else if (this.showDeleteConfirmationModal) {
        this.closeDeleteConfirmationModal();
      } else if (this.editingFolderId) {
        this.cancelEditing();
      }
      return;
    }

    // Only allow shortcuts when no dropdown/modal is open
    if (this.showAddFolder || this.showDeleteConfirmationModal || this.editingFolderId) {
      return;
    }

    // Modifier + Shift + F: Open create new folder dropdown
    if (event.shiftKey && event.key.toLowerCase() === 'f' && 
        (this.isMac() ? event.metaKey : event.altKey)) {
      event.preventDefault();
      this.toggleAddFolder();
    }
  }

  // Listen for custom event from note-list component
  @HostListener('document:openCreateFolderDropdown')
  onOpenCreateFolderDropdown(): void {
    if (!this.showAddFolder && !this.showDeleteConfirmationModal) {
      this.toggleAddFolder();
    }
  }
} 