import { Component, signal, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faPen, faTrashAlt, faSearch, faTimes, faFolder, faTag, faSignOutAlt, faFilter, faExclamationTriangle, faCaretDown, faUser, faCheck, faTable, faMinus, faColumns, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthService } from './services/auth.service';
import { NotesService } from './services/notes.service';
import { TagsService } from './services/tags.service';
import { FoldersService } from './services/folders.service';
import { TeamsService } from './services/teams.service';
import { SearchService } from './services/search.service';
import { ModalService } from './services/modal.service';
import { Note } from './models/note.interface';
import { Folder } from './models/folder.interface';
import { Tag } from './models/tag.interface';
import { Team } from './models/team.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule,
    FormsModule,
    FontAwesomeModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('note-organizer');

  // Font Awesome icons
  faPlus = faPlus;
  faPen = faPen;
  faTrashAlt = faTrashAlt;
  faSearch = faSearch;
  faTimes = faTimes;
  faFolder = faFolder;
  faTag = faTag;
  faSignOutAlt = faSignOutAlt;
  faFilter = faFilter;
  faExclamationTriangle = faExclamationTriangle;
  faCaretDown = faCaretDown;
  faUser = faUser;
  faCheck = faCheck;
  faTable = faTable;
  faMinus = faMinus;
  faColumns = faColumns;
  faTrash = faTrash;

  @ViewChild('tagInput', { static: false }) tagInput!: ElementRef<HTMLInputElement>;
  @ViewChild('linkUrlInput', { static: false }) linkUrlInput!: ElementRef<HTMLInputElement>;
  @ViewChild('titleInput', { static: false }) titleInput!: ElementRef<HTMLInputElement>;

  // Modal and dropdown states
  showCreateNoteModal = false;
  showTagDropdown = false;
  showUserDropdown = false;
  showEditNoteModal = false;
  showViewProfileModal = false;
  showNoFoldersModal = false;
  showNoTagsModal = false;
  showLinkDropdown = false;
  savedCursorRange: Range | null = null;
  showToaster = false;
  toasterMessage = '';
  toasterType = 'success';
  newTagName = '';
  newLinkUrl = '';
  newLinkText = '';
  creatingNote = false;
  updatingNote = false;
  deletingNote = false;

  // Note details modal state
  showNoteDetailsModal = false;
  selectedNote: Note | null = null;
  noteToEdit: Note | null = null;
  noteToDelete: Note | null = null;
  showDeleteConfirmationModal = false;
  
  // Search functionality
  searchTerm = '';
  searchType = 'all';
  
  // Teams search functionality
  teamsSearchTerm = '';
  teamsSearchType = 'all';
  
  // Navigation shortcuts
  lastKeyPressed = '';

  // Team assignment removed - notes are now private to the creator

  // Edit team assignment removed - notes are now private to the creator

  // Teams data
  teams: Team[] = [];
  
  // Team assignment properties
  showTeamDropdown = false;
  selectedTeamToAssign: Team | null = null;
  availableTeams: Team[] = [];
  assignedTeams: Team[] = [];
  
  // Edit team assignment properties
  showEditTeamDropdown = false;
  selectedEditTeamToAssign: Team | null = null;
  availableEditTeams: Team[] = [];
  editAssignedTeams: Team[] = [];

  // Table functionality
  showTableDropdown = false;
  tableRows = 3;
  tableColumns = 3;
  selectedTable: HTMLTableElement | null = null;
  selectedCell: HTMLTableCellElement | null = null;

  // Table size change tracking
  onTableRowsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.tableRows = parseInt(target.value) || 3;
    console.log('Table rows changed to:', this.tableRows); // Debug log
  }

  onTableColumnsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.tableColumns = parseInt(target.value) || 3;
    console.log('Table columns changed to:', this.tableColumns); // Debug log
  }

  // OS detection for keyboard shortcuts
  private isMac(): boolean {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  private getModifierKey(): 'alt' | 'meta' {
    return this.isMac() ? 'meta' : 'alt';
  }
  
  // Form for creating notes
  noteForm: FormGroup;
  editNoteForm: FormGroup;
  folders: Folder[] = [];
  tags: any[] = [];
  
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription = new Subscription();
  private tagsUpdateSubscription: Subscription = new Subscription();
  private notesUpdateSubscription: Subscription = new Subscription();
  private foldersUpdateSubscription: Subscription = new Subscription();
  private authSubscription: Subscription = new Subscription();

  constructor(
    public authService: AuthService,
    private fb: FormBuilder,
    private notesService: NotesService,
    private tagsService: TagsService,
    private foldersService: FoldersService,
    private teamsService: TeamsService,
    private searchService: SearchService,
    private modalService: ModalService,
    private router: Router
  ) {
    this.noteForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      content: ['', [Validators.required, Validators.minLength(1)]],
      folderId: ['', Validators.required],
      tagIds: [[]],
      category: [''],
      assignedTeams: [[]]
    });

    this.editNoteForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      content: ['', [Validators.required, Validators.minLength(1)]],
      folderId: ['', Validators.required],
      tagIds: [[]],
      category: [''],
      assignedTeams: [[]]
    });
    
    // Data loading is now handled in ngOnInit after authentication

    // Subscribe to tag updates
    this.tagsUpdateSubscription = this.tagsService.tagsUpdated$.subscribe(() => {
      this.loadTags();
    });

    // Subscribe to folder updates
    this.foldersUpdateSubscription = this.foldersService.foldersUpdated$.subscribe(() => {
      this.loadFolders();
    });

    // Subscribe to modal service
    this.modalService.noteDetailsModal$.subscribe(({ show, note }) => {
      this.showNoteDetailsModal = show;
      this.selectedNote = note;
    });

    this.modalService.editNoteModal$.subscribe(({ show, note }) => {
      this.showEditNoteModal = show;
      if (show && note) {
        this.noteToEdit = note;
        this.populateEditForm(note);
      } else {
        this.noteToEdit = null;
        this.resetEditNoteForm();
      }
    });

    this.modalService.deleteConfirmationModal$.subscribe(({ show, note }) => {
      this.showDeleteConfirmationModal = show;
      this.noteToDelete = note;
    });
    
    // Initialize table properties
    this.selectedTable = null;
    this.selectedCell = null;
  }

  ngOnInit(): void {
    // Add document click listener to close dropdowns when clicking outside
    document.addEventListener('click', this.onDocumentClick.bind(this));
    
    // Subscribe to authentication changes and load data only when user is authenticated
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        // User is authenticated, load data
        this.loadFolders();
        this.loadTags();
        this.loadTeams();
      } else {
        // User is not authenticated, clear data
        this.folders = [];
        this.tags = [];
        this.teams = [];
      }
    });
  }

  ngOnDestroy(): void {
    // Remove document click listener
    document.removeEventListener('click', this.onDocumentClick.bind(this));
    
    // Clean up subscriptions
    if (this.tagsUpdateSubscription) {
      this.tagsUpdateSubscription.unsubscribe();
    }
    if (this.foldersUpdateSubscription) {
      this.foldersUpdateSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  // Search methods
  onSearchChange(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.searchTerm = searchTerm;
    this.searchService.updateSearchTerm(searchTerm);
  }

  onSearchTypeChange(): void {
    this.searchService.updateSearchType(this.searchType);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchService.updateSearchTerm('');
  }

  getSearchPlaceholder(): string {
    switch (this.searchType) {
      case 'title':
        return 'Search by title...';
      case 'content':
        return 'Search by content...';
      default:
        return 'Search notes...';
    }
  }

  // Teams search methods
  getTeamsSearchPlaceholder(): string {
    switch (this.teamsSearchType) {
      case 'teams':
        return 'Search teams...';
      case 'members':
        return 'Search team members...';
      default:
        return 'Search teams and members...';
    }
  }

  onTeamsSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.teamsSearchTerm = target.value;
    // Emit search event for teams component
    this.searchService.updateTeamsSearchTerm(this.teamsSearchTerm);
  }

  onTeamsSearchTypeChange(): void {
    // Emit search type change for teams component
    this.searchService.updateTeamsSearchType(this.teamsSearchType);
  }

  clearTeamsSearch(): void {
    this.teamsSearchTerm = '';
    this.searchService.updateTeamsSearchTerm('');
  }

  shouldShowHeader(): boolean {
    const currentUrl = this.router.url;
    return !currentUrl.includes('/login') && !currentUrl.includes('/register');
  }

  shouldShowSearchSection(): boolean {
    const currentUrl = this.router.url;
    return currentUrl.includes('/notes') && !currentUrl.includes('/team-members');
  }

  shouldShowTeamsSearchSection(): boolean {
    const currentUrl = this.router.url;
    return currentUrl.includes('/team-members');
  }

  // Modal methods
  openCreateNoteModal(): void {
    // Check if folders exist
    if (this.folders.length === 0) {
      this.showNoFoldersModal = true;
      return;
    }
    
    // Check if tags exist
    if (this.tags.length === 0) {
      this.showNoTagsModal = true;
      return;
    }
    
    // If both folders and tags exist, open the create note modal
    this.showCreateNoteModal = true;
    this.resetNoteForm();
    
    // Reset team assignments
    this.assignedTeams = [];
    this.selectedTeamToAssign = null;
    this.showTeamDropdown = false;
    
    // Reset table selection
    this.selectedTable = null;
    this.selectedCell = null;
    
    setTimeout(() => {
      this.titleInput.nativeElement.focus();
      // Add table event listeners
      this.addTableEventListeners('create');
    }, 0);
  }

  closeCreateNoteModal(): void {
    this.showCreateNoteModal = false;
    this.resetNoteForm();
    // Remove table event listeners
    this.removeTableEventListeners('create');
    // Clear table selection
    this.selectedTable = null;
    this.selectedCell = null;
  }

  openEditNoteModal(note: Note): void {
    this.noteToEdit = note;
    this.showEditNoteModal = true;
    this.populateEditForm(note);
    
    // Reset edit team dropdown state (but keep the populated teams)
    this.selectedEditTeamToAssign = null;
    this.showEditTeamDropdown = false;
    
    // Reset table selection
    this.selectedTable = null;
    this.selectedCell = null;
    
    setTimeout(() => {
      // Add table event listeners
      this.addTableEventListeners('edit');
    }, 0);
  }

  openDeleteConfirmationModal(note: Note): void {
    this.modalService.openDeleteConfirmationModal(note);
  }

  closeEditNoteModal(): void {
    this.modalService.closeEditNoteModal();
    this.resetEditNoteForm();
    // Remove table event listeners
    this.removeTableEventListeners('edit');
    // Clear table selection
    this.selectedTable = null;
    this.selectedCell = null;
  }

  closeDeleteConfirmationModal(): void {
    this.modalService.closeDeleteConfirmationModal();
  }

  confirmDelete(): void {
    if (!this.noteToDelete) return;

    this.deletingNote = true;
    this.notesService.deleteNote(this.noteToDelete.id).subscribe({
      next: () => {
        this.deletingNote = false;
        this.closeDeleteConfirmationModal();
        this.noteToDelete = null;
      },
      error: (error) => {
        console.error('Error deleting note:', error);
        this.deletingNote = false;
      }
    });
  }

  // Tag dropdown methods
  toggleTagDropdown(): void {
    this.showTagDropdown = !this.showTagDropdown;
    if (this.showTagDropdown) {
      setTimeout(() => {
        this.tagInput.nativeElement.focus();
      }, 0);
    }
    if (!this.showTagDropdown) {
      this.newTagName = '';
    }
  }

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
  }

  openEditProfileModal(): void {
    // TODO: Implement edit profile modal
    console.log('Edit profile clicked');
    this.showUserDropdown = false;
  }

  openViewProfileModal(): void {
    this.showViewProfileModal = true;
    this.showUserDropdown = false;
  }

  closeViewProfileModal(): void {
    this.showViewProfileModal = false;
  }

  closeNoFoldersModal(): void {
    this.showNoFoldersModal = false;
  }

  closeNoTagsModal(): void {
    this.showNoTagsModal = false;
  }

  showToasterNotification(message: string, type: 'success' | 'error' = 'success'): void {
    this.toasterMessage = message;
    this.toasterType = type;
    this.showToaster = true;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideToasterNotification();
    }, 5000);
  }

  hideToasterNotification(): void {
    this.showToaster = false;
  }

  // Rich text editor methods
  formatText(command: string): void {
    document.execCommand(command, false);
  }

  onContentChange(event: Event): void {
    const target = event.target as HTMLElement;
    const content = target.innerHTML;
    this.noteForm.patchValue({ content });
  }

  onContentBlur(): void {
    const editorContent = document.querySelector('.editor-content') as HTMLElement;
    if (editorContent) {
      const content = editorContent.innerHTML;
      this.noteForm.patchValue({ content });
    }
  }

  onEditContentChange(event: Event): void {
    const target = event.target as HTMLElement;
    const content = target.innerHTML;
    this.editNoteForm.patchValue({ content });
  }

  onEditContentBlur(): void {
    const editEditorContent = document.querySelector('.edit-note-modal .editor-content') as HTMLElement;
    if (editEditorContent) {
      const content = editEditorContent.innerHTML;
      this.editNoteForm.patchValue({ content });
    }
  }

  insertLink(): void {
    const url = prompt('Enter URL:');
    if (url) {
      const linkText = prompt('Enter link text (optional):') || url;
      const linkHtml = `<a href="${url}" target="_blank">${linkText}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
    }
  }

  insertImage(): void {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const imageDataUrl = e.target.result;
          const imageHtml = `<img src="${imageDataUrl}" alt="" style="max-width: 100%; height: auto; display: block; margin: 10px 0;">`;
          document.execCommand('insertHTML', false, imageHtml);
        };
        reader.readAsDataURL(file);
      }
      // Clean up the file input
      document.body.removeChild(fileInput);
    };
    
    // Add file input to DOM and trigger click
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  toggleLinkDropdown(): void {
    this.showLinkDropdown = !this.showLinkDropdown;
    if (this.showLinkDropdown) {
      // Save current cursor position when opening dropdown
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        this.savedCursorRange = selection.getRangeAt(0).cloneRange();
      } else {
        this.savedCursorRange = null;
      }
      
      setTimeout(() => {
        if (this.linkUrlInput) {
          this.linkUrlInput.nativeElement.focus();
        }
      }, 0);
    }
    if (!this.showLinkDropdown) {
      this.newLinkUrl = '';
      this.newLinkText = '';
      this.savedCursorRange = null; // Clear saved position
    }
  }

  onLinkDropdownClick(event: Event): void {
    // Prevent the dropdown from closing when clicking inside it
    event.stopPropagation();
  }

  createLink(): void {
    if (!this.newLinkUrl.trim()) return;

    const linkText = this.newLinkText.trim() || this.newLinkUrl.trim();
    const linkHtml = `<a href="${this.newLinkUrl.trim()}" target="_blank">${linkText}</a>`;
    
    // Find the active editor based on which modal is open
    let targetEditor: HTMLElement;
    
    if (this.showEditNoteModal) {
      // Edit modal is open - target edit modal editor
      targetEditor = document.querySelector('.edit-note-modal .editor-content') as HTMLElement;
    } else {
      // Create modal is open - target create modal editor
      targetEditor = document.querySelector('.create-note-modal .editor-content') as HTMLElement;
    }
    
    if (targetEditor) {
      // Ensure editor is focused
      targetEditor.focus();
      
      // Restore saved cursor position or move to end
      const selection = window.getSelection();
      if (this.savedCursorRange) {
        selection?.removeAllRanges();
        selection?.addRange(this.savedCursorRange);
      } else {
        // No saved position, move cursor to end
        const range = document.createRange();
        range.selectNodeContents(targetEditor);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      // Insert the link at the current cursor position
      document.execCommand('insertHTML', false, linkHtml);
    }
    
    this.newLinkUrl = '';
    this.newLinkText = '';
    this.showLinkDropdown = false;
    this.savedCursorRange = null; // Clear saved position
  }

  isLinkUrlEmpty(): boolean {
    return !this.newLinkUrl || this.newLinkUrl.trim() === '';
  }

  onLinkUrlChange(event: Event): void {
    // Force change detection
    const target = event.target as HTMLInputElement;
    this.newLinkUrl = target.value;
  }

  onLinkTextChange(event: Event): void {
    // Force change detection
    const target = event.target as HTMLInputElement;
    this.newLinkText = target.value;
  }

  // Table functionality methods
  toggleTableDropdown(): void {
    this.showTableDropdown = !this.showTableDropdown;
    if (this.showTableDropdown) {
      // Save current cursor position when opening dropdown
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        this.savedCursorRange = selection.getRangeAt(0).cloneRange();
      } else {
        this.savedCursorRange = null;
      }
    }
    if (!this.showTableDropdown) {
      this.savedCursorRange = null;
    }
  }

  onTableDropdownClick(event: Event): void {
    // Prevent the dropdown from closing when clicking inside it
    event.stopPropagation();
  }

  insertTable(): void {
    if (this.tableRows < 1 || this.tableColumns < 1) return;

    console.log('Inserting table with dimensions:', this.tableRows, 'x', this.tableColumns); // Debug log
    const tableHtml = this.generateTableHTML(this.tableRows, this.tableColumns);
    console.log('Inserting table:', tableHtml); // Debug log
    
    // Find the active editor based on which modal is open
    let targetEditor: HTMLElement;
    
    if (this.showEditNoteModal) {
      targetEditor = document.querySelector('.edit-note-modal .editor-content') as HTMLElement;
    } else {
      targetEditor = document.querySelector('.create-note-modal .editor-content') as HTMLElement;
    }
    
    if (targetEditor) {
      console.log('Found target editor:', targetEditor); // Debug log
      console.log('Editor HTML before insertion:', targetEditor.innerHTML); // Debug log
      
      // Ensure editor is focused
      targetEditor.focus();
      
      // Restore saved cursor position or move to end
      const selection = window.getSelection();
      if (this.savedCursorRange) {
        selection?.removeAllRanges();
        selection?.addRange(this.savedCursorRange);
      } else {
        // No saved position, move cursor to end
        const range = document.createRange();
        range.selectNodeContents(targetEditor);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      // Insert the table at the current cursor position
      const result = document.execCommand('insertHTML', false, tableHtml);
      console.log('Insert command result:', result); // Debug log
      console.log('Editor HTML after insertion:', targetEditor.innerHTML); // Debug log
      
      // Also try to append the table directly if execCommand fails
      if (!result) {
        console.log('execCommand failed, trying direct append'); // Debug log
        targetEditor.innerHTML += tableHtml;
        console.log('Direct append completed, new HTML:', targetEditor.innerHTML); // Debug log
      }
      
      // Select the newly inserted table to show controls
      setTimeout(() => {
        const newTable = targetEditor.querySelector('table.note-table') as HTMLTableElement;
        if (newTable) {
          this.selectedTable = newTable;
          console.log('Table selected after insertion:', this.selectedTable); // Debug log
        }
      }, 100);
      
      console.log('Table inserted successfully'); // Debug log
    } else {
      console.log('Target editor not found'); // Debug log
    }
    
    this.showTableDropdown = false;
    this.savedCursorRange = null;
  }

  generateTableHTML(rows: number, columns: number): string {
    let tableHtml = '<div class="table-responsive">';
    tableHtml += '<table class="note-table" style="border: 2px solid #333; border-collapse: collapse;">';
    
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < columns; j++) {
        tableHtml += '<td contenteditable="true" class="table-cell" data-row="' + i + '" data-col="' + j + '" style="border: 1px solid #333; padding: 8px; min-width: 80px; min-height: 40px; background-color: #f9f9f9;">Cell ' + (i + 1) + '-' + (j + 1) + '</td>';
      }
      tableHtml += '</tr>';
    }
    
    tableHtml += '</table>';
    tableHtml += '</div>';
    console.log('Generated table HTML:', tableHtml); // Debug log
    return tableHtml;
  }

  addTableRow(): void {
    if (!this.selectedTable) return;
    
    const newRow = document.createElement('tr');
    const columnCount = this.selectedTable.rows[0]?.cells.length || 0;
    
    for (let i = 0; i < columnCount; i++) {
      const newCell = document.createElement('td');
      newCell.contentEditable = 'true';
      newCell.className = 'table-cell';
      newCell.setAttribute('data-row', (this.selectedTable.rows.length).toString());
      newCell.setAttribute('data-col', i.toString());
      newRow.appendChild(newCell);
    }
    
    this.selectedTable.appendChild(newRow);
    this.updateTableDataAttributes();
  }

  removeTableRow(): void {
    if (!this.selectedTable || this.selectedTable.rows.length <= 1) return;
    
    this.selectedTable.deleteRow(-1);
    this.updateTableDataAttributes();
  }

  addTableColumn(): void {
    if (!this.selectedTable) return;
    
    const rows = this.selectedTable.rows;
    const columnCount = rows[0]?.cells.length || 0;
    
    for (let i = 0; i < rows.length; i++) {
      const newCell = document.createElement('td');
      newCell.contentEditable = 'true';
      newCell.className = 'table-cell';
      newCell.setAttribute('data-row', i.toString());
      newCell.setAttribute('data-col', columnCount.toString());
      rows[i].appendChild(newCell);
    }
  }

  removeTableColumn(): void {
    if (!this.selectedTable) return;
    
    const rows = this.selectedTable.rows;
    const columnCount = rows[0]?.cells.length || 0;
    
    if (columnCount <= 1) return;
    
    for (let i = 0; i < rows.length; i++) {
      rows[i].deleteCell(-1);
    }
    
    this.updateTableDataAttributes();
  }

  deleteTable(): void {
    if (!this.selectedTable) return;
    
    this.selectedTable.remove();
    this.selectedTable = null;
    this.selectedCell = null;
  }

  updateTableDataAttributes(): void {
    if (!this.selectedTable) return;
    
    const rows = this.selectedTable.rows;
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].cells;
      for (let j = 0; j < cells.length; j++) {
        cells[j].setAttribute('data-row', i.toString());
        cells[j].setAttribute('data-col', j.toString());
      }
    }
  }

  onTableClick(event: Event): void {
    const target = event.target as HTMLElement;
    console.log('Table click event:', target.tagName, target); // Debug log
    
    if (target.tagName === 'TABLE') {
      this.selectedTable = target as HTMLTableElement;
      this.selectedCell = null;
      console.log('Table selected:', this.selectedTable); // Debug log
    } else if (target.tagName === 'TD') {
      this.selectedTable = target.closest('table') as HTMLTableElement;
      this.selectedCell = target as HTMLTableCellElement;
      console.log('Cell selected:', this.selectedCell, 'Table:', this.selectedTable); // Debug log
    }
    
    // Update the UI to show table controls
    this.updateTableControlsVisibility();
  }

  updateTableControlsVisibility(): void {
    // This method will be called to update the UI when table selection changes
    // The Angular change detection will handle updating the *ngIf="selectedTable" conditions
  }

  addTableEventListeners(modalType: 'create' | 'edit'): void {
    const selector = modalType === 'create' ? '.create-note-modal .editor-content' : '.edit-note-modal .editor-content';
    const editor = document.querySelector(selector) as HTMLElement;
    
    if (editor) {
      // Add click event listener for table selection
      const clickHandler = this.onTableClick.bind(this);
      editor.addEventListener('click', clickHandler);
      
      // Store the handler reference for removal
      (editor as any)._tableClickHandler = clickHandler;
      
      // Add focus event listener for table cells
      const focusHandler = (event: Event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'TD') {
          this.selectedCell = target as HTMLTableCellElement;
          this.selectedTable = target.closest('table') as HTMLTableElement;
          this.updateTableControlsVisibility();
        }
      };
      editor.addEventListener('focusin', focusHandler);
      
      // Store the handler reference for removal
      (editor as any)._tableFocusHandler = focusHandler;
    }
  }

  removeTableEventListeners(modalType: 'create' | 'edit'): void {
    const selector = modalType === 'create' ? '.create-note-modal .editor-content' : '.edit-note-modal .editor-content';
    const editor = document.querySelector(selector) as HTMLElement;
    
    if (editor) {
      // Remove event listeners using stored references
      const clickHandler = (editor as any)._tableClickHandler;
      const focusHandler = (editor as any)._tableFocusHandler;
      
      if (clickHandler) {
        editor.removeEventListener('click', clickHandler);
        delete (editor as any)._tableClickHandler;
      }
      
      if (focusHandler) {
        editor.removeEventListener('focusin', focusHandler);
        delete (editor as any)._tableFocusHandler;
      }
    }
  }

  onTagDropdownClick(event: Event): void {
    // Prevent the dropdown from closing when clicking inside it
    event.stopPropagation();
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Close tag dropdown if clicking outside
    if (!target.closest('.tag-dropdown-container')) {
      this.showTagDropdown = false;
    }
    
    // Close link dropdown if clicking outside
    if (!target.closest('.link-dropdown-container')) {
      this.showLinkDropdown = false;
    }
    
    // Close table dropdown if clicking outside
    if (!target.closest('.table-dropdown-container')) {
      this.showTableDropdown = false;
    }
    
    // Close user dropdown if clicking outside
    if (!target.closest('.user-dropdown-container')) {
      this.showUserDropdown = false;
    }
    
    // Close team dropdowns if clicking outside
    if (!target.closest('.dropdown-container')) {
      this.showTeamDropdown = false;
      this.showEditTeamDropdown = false;
      this.selectedTeamToAssign = null;
      this.selectedEditTeamToAssign = null;
    }

    // Handle table clicks for selection
    if (target.tagName === 'TABLE' || target.tagName === 'TD') {
      this.onTableClick(event);
    }
  }

  createTag(): void {
    if (!this.newTagName.trim()) return;

    const newTag = {
      id: this.generateId(),
      name: this.newTagName.trim()
    };

    this.tagsService.createTag(newTag).subscribe({
      next: () => {
        this.newTagName = '';
        this.showTagDropdown = false;
        // Show success toaster
        this.showToasterNotification(`Created New Tag\nTag '${newTag.name}' created successfully!`);
      },
      error: (error) => {
        console.error('Error creating tag:', error);
        this.showToasterNotification('Failed to create tag. Please try again.', 'error');
      }
    });
  }

  // Note creation methods
  createNote(): void {
    if (this.noteForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.creatingNote = true;
    const formValue = this.noteForm.value;
    
    const noteData = {
      title: formValue.title,
      content: formValue.content,
      folderId: formValue.folderId,
      tagIds: formValue.tagIds || [],
      category: formValue.category || '',
      assignedTeams: this.assignedTeams.map(team => team.id)
    };

    this.notesService.createNote(noteData).subscribe({
      next: () => {
        this.creatingNote = false;
        this.closeCreateNoteModal();
        this.resetNoteForm();
        // Show success toaster
        this.showToasterNotification(`Created New Note\nNote '${formValue.title}' created successfully!`);
      },
      error: (error) => {
        console.error('Error creating note:', error);
        this.creatingNote = false;
        this.showToasterNotification('Failed to create note. Please try again.', 'error');
      }
    });
  }

  updateNote(): void {
    if (this.editNoteForm.invalid || !this.noteToEdit) {
      this.markEditFormGroupTouched();
      return;
    }

    this.updatingNote = true;
    const formValue = this.editNoteForm.value;

    this.notesService.updateNote({
      id: this.noteToEdit.id,
      title: formValue.title,
      content: formValue.content,
      folderId: formValue.folderId,
      tagIds: formValue.tagIds || [],
      category: formValue.category || '',
      assignedTeams: this.editAssignedTeams.map(team => team.id)
    }).subscribe({
      next: () => {
        this.updatingNote = false;
        this.closeEditNoteModal();
        this.resetEditNoteForm();
        // Show success toaster
        this.showToasterNotification(`Note '${formValue.title}' updated successfully!`);
      },
      error: (error) => {
        console.error('Error updating note:', error);
        this.updatingNote = false;
        this.showToasterNotification('Failed to update note. Please try again.', 'error');
      }
    });
  }

  // Helper methods
  private loadFolders(): void {
    this.foldersService.getFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
      },
      error: (error) => {
        console.error('Error loading folders:', error);
      }
    });
  }

  private loadTags(): void {
    this.tagsService.getTags().subscribe({
      next: (tags) => {
        this.tags = tags;
      },
      error: (error) => {
        console.error('Error loading tags:', error);
      }
    });
  }

  private loadTeams(): void {
    this.teamsService.getTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
      },
      error: (error) => {
        console.error('Error loading teams:', error);
      }
    });
  }

  // Tags selection methods
  isTagSelected(tagId: string): boolean {
    const selectedTags = this.noteForm.get('tagIds')?.value || [];
    return selectedTags.includes(tagId);
  }

  toggleTagSelection(tagId: string): void {
    const selectedTags = this.noteForm.get('tagIds')?.value || [];
    const index = selectedTags.indexOf(tagId);
    
    if (index > -1) {
      selectedTags.splice(index, 1);
    } else {
      selectedTags.push(tagId);
    }
    
    this.noteForm.patchValue({ tagIds: selectedTags });
  }

  removeTagSelection(tagId: string): void {
    const selectedTags = this.noteForm.get('tagIds')?.value || [];
    const index = selectedTags.indexOf(tagId);
    
    if (index > -1) {
      selectedTags.splice(index, 1);
      this.noteForm.patchValue({ tagIds: selectedTags });
    }
  }

  getSelectedTags(): any[] {
    const selectedTagIds = this.noteForm.get('tagIds')?.value || [];
    return this.tags.filter(tag => selectedTagIds.includes(tag.id));
  }

  isEditTagSelected(tagId: string): boolean {
    const selectedTags = this.editNoteForm.get('tagIds')?.value || [];
    return selectedTags.includes(tagId);
  }

  toggleEditTagSelection(tagId: string): void {
    const selectedTags = this.editNoteForm.get('tagIds')?.value || [];
    const index = selectedTags.indexOf(tagId);

    if (index > -1) {
      selectedTags.splice(index, 1);
    } else {
      selectedTags.push(tagId);
    }

    this.editNoteForm.patchValue({ tagIds: selectedTags });
  }

  removeEditTagSelection(tagId: string): void {
    const selectedTags = this.editNoteForm.get('tagIds')?.value || [];
    const index = selectedTags.indexOf(tagId);

    if (index > -1) {
      selectedTags.splice(index, 1);
      this.editNoteForm.patchValue({ tagIds: selectedTags });
    }
  }

  getSelectedEditTags(): any[] {
    const selectedTagIds = this.editNoteForm.get('tagIds')?.value || [];
    return this.tags.filter(tag => selectedTagIds.includes(tag.id));
  }

  private resetNoteForm(): void {
    this.noteForm.reset({
      title: '',
      content: '',
      folderId: '',
      tagIds: [],
      category: '',
      assignedTeams: []
    });
    
    // Reset team assignments
    this.assignedTeams = [];
    this.selectedTeamToAssign = null;
    this.showTeamDropdown = false;
  }

  private populateEditForm(note: Note): void {
    this.editNoteForm.patchValue({
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      tagIds: note.tagIds || [],
      category: note.category || ''
    });

    // Populate team assignments
    this.editAssignedTeams = [];
    if (note.assignedTeams && note.assignedTeams.length > 0) {
      this.editAssignedTeams = this.teams.filter(team => 
        note.assignedTeams!.includes(team.id)
      );
    }

    // Populate the rich text editor content
    setTimeout(() => {
      const editEditor = document.querySelector('.edit-note-modal .editor-content') as HTMLElement;
      if (editEditor) {
        editEditor.innerHTML = note.content || '';
      }
    }, 0);
  }

  private resetEditNoteForm(): void {
    this.editNoteForm.reset({
      title: '',
      content: '',
      folderId: '',
      tagIds: [],
      category: '',
      assignedTeams: []
    });
    
    // Reset team assignments
    this.editAssignedTeams = [];
    this.selectedEditTeamToAssign = null;
    this.showEditTeamDropdown = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.noteForm.controls).forEach(key => {
      const control = this.noteForm.get(key);
      control?.markAsTouched();
    });
  }

  private markEditFormGroupTouched(): void {
    Object.keys(this.editNoteForm.controls).forEach(key => {
      const control = this.editNoteForm.get(key);
      control?.markAsTouched();
    });
  }

  private generateId(): string {
    return Date.now().toString();
  }

  // Form getters
  get titleControl() { return this.noteForm.get('title'); }
  get contentControl() { return this.noteForm.get('content'); }
  get folderIdControl() { return this.noteForm.get('folderId'); }
  get categoryControl() { return this.noteForm.get('category'); }

  // Edit form getters
  get editTitleControl() { return this.editNoteForm.get('title'); }
  get editContentControl() { return this.editNoteForm.get('content'); }
  get editFolderIdControl() { return this.editNoteForm.get('folderId'); }
  get editCategoryControl() { return this.editNoteForm.get('category'); }

  // Note details modal methods
  closeNoteDetailsModal(): void {
    this.modalService.closeNoteDetailsModal();
  }

  ngAfterViewChecked(): void {
    // Force max-width on all images in note details modal
    if (this.showNoteDetailsModal) {
      setTimeout(() => {
        const modalImages = document.querySelectorAll('.note-details-modal img');
        modalImages.forEach((img: any) => {
          img.style.setProperty('max-width', '100%', 'important');
          img.style.setProperty('width', 'auto', 'important');
          img.style.setProperty('height', 'auto', 'important');
          img.style.setProperty('display', 'block', 'important');
          img.style.setProperty('margin', '10px 0', 'important');
        });
      }, 100);
    }
  }

  getNoteTags(note: Note): Tag[] {
    return this.tags.filter(tag => note.tagIds?.includes(tag.id));
  }

  getNoteTeams(note: Note): Team[] {
    return this.teams.filter(team => note.assignedTeams?.includes(team.id));
  }



  getFolderName(folderId: string): string {
    const folder = this.folders.find(f => f.id === folderId);
    return folder ? folder.name : `Folder ${folderId}`;
  }

  // Team-related methods removed - notes are now private to the creator

  deleteNote(noteId: string | undefined): void {
    if (!noteId) return;
    
    this.notesService.deleteNote(noteId).subscribe({
      next: () => {
        this.showToasterNotification('Note deleted successfully!');
      },
      error: (error) => {
        console.error('Error deleting note:', error);
        this.showToasterNotification('Failed to delete note. Please try again.', 'error');
      }
    });
  }

    // Team assignment methods
  toggleTeamDropdown(): void {
    this.showTeamDropdown = !this.showTeamDropdown;
    if (this.showTeamDropdown) {
      this.availableTeams = this.teams.filter(team => 
        !this.assignedTeams.some(assignedTeam => assignedTeam.id === team.id)
      );
    }
  }

  selectTeamToAssign(team: Team): void {
    this.selectedTeamToAssign = team;
    this.showTeamDropdown = false;
    this.addAssignedTeam(team);
  }

  addAssignedTeam(team: Team): void {
    if (!this.assignedTeams.some(assignedTeam => assignedTeam.id === team.id)) {
      this.assignedTeams.push(team);
      this.availableTeams = this.teams.filter(t => 
        !this.assignedTeams.some(assignedTeam => assignedTeam.id === t.id)
      );
    }
    this.selectedTeamToAssign = null;
  }

  removeAssignedTeam(teamId: string): void {
    this.assignedTeams = this.assignedTeams.filter(team => team.id !== teamId);
    this.availableTeams = this.teams.filter(team => 
      !this.assignedTeams.some(assignedTeam => assignedTeam.id === team.id)
    );
  }

  getAssignedTeams(): Team[] {
    return this.assignedTeams;
  }

  // Edit team assignment methods
  toggleEditTeamDropdown(): void {
    this.showEditTeamDropdown = !this.showEditTeamDropdown;
    if (this.showEditTeamDropdown) {
      this.availableEditTeams = this.teams.filter(team => 
        !this.editAssignedTeams.some(assignedTeam => assignedTeam.id === team.id)
      );
    }
  }

  selectEditTeamToAssign(team: Team): void {
    this.selectedEditTeamToAssign = team;
    this.showEditTeamDropdown = false;
    this.addEditAssignedTeam(team);
  }

  addEditAssignedTeam(team: Team): void {
    if (!this.editAssignedTeams.some(assignedTeam => assignedTeam.id === team.id)) {
      this.editAssignedTeams.push(team);
      this.availableEditTeams = this.teams.filter(t => 
        !this.editAssignedTeams.some(assignedTeam => assignedTeam.id === t.id)
      );
    }
    this.selectedEditTeamToAssign = null;
  }

  removeEditAssignedTeam(teamId: string): void {
    this.editAssignedTeams = this.editAssignedTeams.filter(team => team.id !== teamId);
    this.availableEditTeams = this.teams.filter(team => 
      !this.editAssignedTeams.some(assignedTeam => assignedTeam.id === team.id)
    );
  }

  getEditAssignedTeams(): Team[] {
    return this.editAssignedTeams;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Escape key to close modals/dropdowns
    if (event.key === 'Escape') {
      if (this.showCreateNoteModal) {
        this.closeCreateNoteModal();
      } else if (this.showEditNoteModal) {
        this.closeEditNoteModal();
      } else if (this.showNoteDetailsModal) {
        this.closeNoteDetailsModal();
      } else if (this.showDeleteConfirmationModal) {
        this.closeDeleteConfirmationModal();
      } else if (this.showViewProfileModal) {
        this.closeViewProfileModal();
      } else if (this.showNoFoldersModal) {
        this.closeNoFoldersModal();
      } else if (this.showNoTagsModal) {
        this.closeNoTagsModal();
      } else if (this.showTagDropdown) {
        this.showTagDropdown = false;
        this.newTagName = '';
      } else if (this.showUserDropdown) {
        this.showUserDropdown = false;
      } else if (this.showLinkDropdown) {
        this.showLinkDropdown = false;
        this.newLinkUrl = '';
        this.newLinkText = '';
        this.savedCursorRange = null;
      } else if (this.showTeamDropdown) {
        this.showTeamDropdown = false;
        this.selectedTeamToAssign = null;
      } else if (this.showEditTeamDropdown) {
        this.showEditTeamDropdown = false;
        this.selectedEditTeamToAssign = null;
      }
      return;
    }

    // Only allow shortcuts when no modal/dropdown is open
    if (this.showCreateNoteModal || this.showEditNoteModal || this.showNoteDetailsModal || 
        this.showDeleteConfirmationModal || this.showViewProfileModal || this.showNoFoldersModal || 
        this.showNoTagsModal || this.showTagDropdown || this.showUserDropdown || this.showLinkDropdown ||
        this.showTeamDropdown || this.showEditTeamDropdown) {
      return;
    }

    // Modifier + Shift + S: Focus search bar
    if (event.shiftKey && event.key.toLowerCase() === 's' && 
        (this.isMac() ? event.metaKey : event.altKey)) {
      event.preventDefault();
      const searchInput = document.querySelector('.search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }

    // Modifier + Shift + N: Open create new note modal
    if (event.shiftKey && event.key.toLowerCase() === 'n' && 
        (this.isMac() ? event.metaKey : event.altKey)) {
      event.preventDefault();
      this.openCreateNoteModal();
    }

    // Modifier + Shift + F: Open create new folder dropdown
    if (event.shiftKey && event.key.toLowerCase() === 'f' && 
        (this.isMac() ? event.metaKey : event.altKey)) {
      event.preventDefault();
      // Dispatch custom event to trigger folder dropdown
      document.dispatchEvent(new CustomEvent('openCreateFolderDropdown'));
    }

    // Modifier + Shift + G: Open create new tag dropdown
    if (event.shiftKey && event.key.toLowerCase() === 'g' && 
        (this.isMac() ? event.metaKey : event.altKey)) {
      event.preventDefault();
      this.toggleTagDropdown();
    }

    // Modifier + Shift + T: Open create new team modal
    if (event.shiftKey && event.key.toLowerCase() === 't' && 
        (this.isMac() ? event.metaKey : event.altKey)) {
      event.preventDefault();
      // Dispatch custom event to trigger team creation
      document.dispatchEvent(new CustomEvent('openCreateTeamModal'));
    }

    // N + O: Navigate to notes page
    if (event.key.toLowerCase() === 'o' && this.lastKeyPressed === 'n') {
      event.preventDefault();
      this.router.navigate(['/notes']);
      this.lastKeyPressed = '';
    }

    // N + T: Navigate to teams page
    if (event.key.toLowerCase() === 't' && this.lastKeyPressed === 'n') {
      event.preventDefault();
      this.router.navigate(['/team-members']);
      this.lastKeyPressed = '';
    }

    // Track 'n' key press for navigation shortcuts
    if (event.key.toLowerCase() === 'n' && !event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      this.lastKeyPressed = 'n';
      // Reset after a short delay
      setTimeout(() => {
        this.lastKeyPressed = '';
      }, 1000);
    }
  }
}
