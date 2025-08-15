import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPen, faTrashAlt, faPlus, faTag } from '@fortawesome/free-solid-svg-icons';
import { Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { Note } from '../../models/note.interface';
import { Tag } from '../../models/tag.interface';
import { Team } from '../../models/team.interface';
import { NotesService } from '../../services/notes.service';
import { TagsService } from '../../services/tags.service';
import { TeamsService } from '../../services/teams.service';
import { FoldersService } from '../../services/folders.service';
import { SearchService } from '../../services/search.service';
import { ModalService } from '../../services/modal.service';
import { FolderSidebarComponent } from '../../components/folder-sidebar/folder-sidebar.component';
import { App } from '../../app';

@Component({
  selector: 'app-note-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule, FolderSidebarComponent],
  templateUrl: './note-list.component.html',
  styleUrl: './note-list.component.css'
})
export class NoteListComponent implements OnInit, OnDestroy {
  // Font Awesome icons
  faPen = faPen;
  faTrashAlt = faTrashAlt;
  faPlus = faPlus;
  faTag = faTag;

  notes: Note[] = [];
  filteredNotes: Note[] = [];
  tags: Tag[] = [];
  teams: Team[] = [];
  folders: any[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  selectedFolderId: string | null = null;
  selectedTagIds: string[] = [];
  
  // Filter properties
  selectedFilterTags: string[] = [];
  selectedCategory: string = '';
  selectedTeam: string = '';
  availableCategories: string[] = [];
  availableTeams: Team[] = [];
  searchType: string = 'all';
  showFilters: boolean = false;
  
  // Sorting properties
  sortBy: string = '';
  
  // Tag dropdown properties
  showTagDropdown = false;
  newTagName = '';
  
  @ViewChild('tagInput') tagInput!: ElementRef<HTMLInputElement>;

  // OS detection for keyboard shortcuts
  private isMac(): boolean {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription;
  private tagsUpdateSubscription: Subscription;
  private notesUpdateSubscription: Subscription = new Subscription();

  constructor(
    private notesService: NotesService,
    private tagsService: TagsService,
    private teamsService: TeamsService,
    private foldersService: FoldersService,
    private searchService: SearchService,
    private modalService: ModalService,
    private app: App,
    private elementRef: ElementRef
  ) {
    // Set up debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.filterNotes(searchTerm);
      });

    // Subscribe to search service
    this.searchSubscription = this.searchService.searchState$.subscribe(state => {
      this.searchTerm = state.term;
      this.searchType = state.type;
      this.filterNotes(state.term);
    });

    // Subscribe to tag updates
    this.tagsUpdateSubscription = this.tagsService.tagsUpdated$.subscribe(() => {
      this.loadTags();
    });

    // Subscribe to notes updates
    this.notesUpdateSubscription = this.notesService.notesUpdated$.subscribe(() => {
      this.loadNotes();
    });
  }

  ngOnInit(): void {
    this.loadNotes();
    this.loadTags();
    this.loadTeams();
    this.loadFolders();
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.tagsUpdateSubscription) {
      this.tagsUpdateSubscription.unsubscribe();
    }
    if (this.notesUpdateSubscription) {
      this.notesUpdateSubscription.unsubscribe();
    }
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  loadNotes(): void {
    this.loading = true;
    this.error = null;
    
    this.notesService.getNotes().subscribe({
      next: (notes) => {
        this.notes = notes;
        this.updateAvailableFilters();
        this.filterNotes(this.searchTerm);
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load notes';
        this.loading = false;
        console.error('Error loading notes:', error);
      }
    });
  }

  loadTags(): void {
    this.tagsService.getTags().subscribe({
      next: (tags) => {
        this.tags = tags;
        this.updateAvailableFilters();
      },
      error: (error) => {
        console.error('Error loading tags:', error);
      }
    });
  }

  loadTeams(): void {
    this.teamsService.getTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.updateAvailableFilters();
      },
      error: (error) => {
        console.error('Error loading teams:', error);
      }
    });
  }

  loadFolders(): void {
    this.foldersService.getFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
      },
      error: (error) => {
        console.error('Error loading folders:', error);
      }
    });
  }

  onSearchChange(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  onSearchTypeChange(): void {
    // Re-filter notes when search type changes
    this.filterNotes(this.searchTerm);
  }

  onFolderSelected(folderId: string | null): void {
    this.selectedFolderId = folderId;
    this.filterNotes(this.searchTerm);
  }

  getNoteTags(note: Note): Tag[] {
    return this.tags.filter(tag => note.tagIds.includes(tag.id));
  }

  private filterNotes(searchTerm: string): void {
    let filtered = this.notes;

    // Filter by folder first
    if (this.selectedFolderId !== null) {
      filtered = filtered.filter(note => note.folderId === this.selectedFolderId);
    }

    // Filter by tags (filter section)
    if (this.selectedFilterTags.length > 0) {
      filtered = filtered.filter(note => 
        this.selectedFilterTags.some(tagId => note.tagIds.includes(tagId))
      );
    }

    // Filter by category
    if (this.selectedCategory) {
      filtered = filtered.filter(note => note.category === this.selectedCategory);
    }

    // Filter by team
    if (this.selectedTeam) {
      filtered = filtered.filter(note => 
        note.assignedTeams &&
        note.assignedTeams.includes(this.selectedTeam)
      );
    }

    // Then filter by search term based on search type
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      
      switch (this.searchType) {
        case 'title':
          filtered = filtered.filter(note => 
            note.title.toLowerCase().includes(term)
          );
          break;
        case 'content':
          filtered = filtered.filter(note => 
            note.content.toLowerCase().includes(term)
          );
          break;
        default: // 'all'
          filtered = filtered.filter(note => 
            note.title.toLowerCase().includes(term) ||
            note.content.toLowerCase().includes(term)
          );
          break;
      }
    }

    this.filteredNotes = filtered;
    this.sortNotes();
  }

  deleteNote(noteId: string): void {
    // Find the note to delete
    const noteToDelete = this.notes.find(note => note.id === noteId);
    if (noteToDelete) {
      this.modalService.openDeleteConfirmationModal(noteToDelete);
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredNotes = this.notes;
  }

  // Filter methods
  toggleAllTags(): void {
    this.selectedFilterTags = [];
    this.filterNotes(this.searchTerm);
  }

  toggleTagFilter(tagId: string): void {
    const index = this.selectedFilterTags.indexOf(tagId);
    if (index > -1) {
      this.selectedFilterTags.splice(index, 1);
    } else {
      this.selectedFilterTags.push(tagId);
    }
    this.filterNotes(this.searchTerm);
  }

  onCategoryFilterChange(): void {
    this.filterNotes(this.searchTerm);
  }

  onTeamFilterChange(): void {
    this.filterNotes(this.searchTerm);
  }

  private updateAvailableFilters(): void {
    // Get unique categories from notes
    const categories = new Set<string>();
    
    this.notes.forEach(note => {
      if (note.category) {
        categories.add(note.category);
      }
    });
    
    this.availableCategories = Array.from(categories).sort();
    this.availableTeams = this.teams; // Use all available teams
  }

  hasActiveFilters(): boolean {
    return this.selectedFilterTags.length > 0 || 
                 this.selectedCategory !== '' ||
      this.selectedTeam !== '';
  }

  clearAllFilters(): void {
    this.selectedFilterTags = [];
    this.selectedCategory = '';
    this.selectedTeam = '';
    this.filterNotes(this.searchTerm);
  }

  getSelectedTagNames(): string {
    if (this.selectedFilterTags.length === 0) return '';
    
    const selectedTagNames = this.tags
      .filter(tag => this.selectedFilterTags.includes(tag.id))
      .map(tag => tag.name);
    
    return selectedTagNames.join(', ');
  }

  getTagName(tagId: string): string {
    const tag = this.tags.find(t => t.id === tagId);
    return tag ? tag.name : '';
  }

  getTeamName(teamId: string): string {
    const team = this.teams.find(t => t.id === teamId);
    return team ? team.name : '--';
  }

  getValidTeams(teamIds: string[]): string[] {
    return teamIds.filter(teamId => {
      const team = this.teams.find(t => t.id === teamId);
      return team !== undefined;
    });
  }

  clearTagFilter(tagId: string): void {
    const index = this.selectedFilterTags.indexOf(tagId);
    if (index > -1) {
      this.selectedFilterTags.splice(index, 1);
      this.filterNotes(this.searchTerm);
    }
  }

  clearCategoryFilter(): void {
    this.selectedCategory = '';
    this.filterNotes(this.searchTerm);
  }

  clearTeamFilter(): void {
    this.selectedTeam = '';
    this.filterNotes(this.searchTerm);
  }

  onSortChange(): void {
    this.sortNotes();
  }

  private sortNotes(): void {
    if (!this.sortBy) {
      // Default sorting - no change needed
      return;
    }

    this.filteredNotes.sort((a, b) => {
      switch (this.sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        
        case 'category':
          const categoryA = a.category || '';
          const categoryB = b.category || '';
          return categoryA.localeCompare(categoryB);
        
        case 'tags':
          const tagsA = this.getNoteTags(a).map(tag => tag.name).join(', ');
          const tagsB = this.getNoteTags(b).map(tag => tag.name).join(', ');
          return tagsA.localeCompare(tagsB);
        
        default:
          return 0;
      }
    });
  }

  // Modal methods
  openNoteDetailsModal(note: Note): void {
    this.modalService.openNoteDetailsModal(note);
  }

  openEditNoteModal(note: Note): void {
    this.modalService.openEditNoteModal(note);
  }

  closeNoteDetailsModal(): void {
    console.log('Closing modal');
    this.modalService.closeNoteDetailsModal();
  }

  getFolderName(folderId: string): string {
    const folder = this.folders.find(f => f.id === folderId);
    return folder ? folder.name : '--';
  }

  getNoteContentPreview(content: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (plainText.length > 100) {
      return plainText.substring(0, 100) + '...';
    }
    return plainText;
  }

  // Create New Note functionality
  openCreateNoteModal(): void {
    this.app.openCreateNoteModal();
  }

  // Create New Tag functionality
  toggleTagDropdown(): void {
    this.showTagDropdown = !this.showTagDropdown;
    if (this.showTagDropdown) {
      setTimeout(() => {
        if (this.tagInput && this.tagInput.nativeElement) {
          this.tagInput.nativeElement.focus();
        }
      }, 100);
    }
    if (!this.showTagDropdown) {
      this.newTagName = '';
    }
  }

  onTagDropdownClick(event: Event): void {
    event.stopPropagation();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.showTagDropdown) {
      const target = event.target as HTMLElement;
      const tagDropdownContainer = this.elementRef.nativeElement.querySelector('.tag-dropdown-container');
      
      if (tagDropdownContainer && !tagDropdownContainer.contains(target)) {
        this.showTagDropdown = false;
        this.newTagName = '';
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Check if any modal or dropdown is open
    const isAnyModalOpen = this.modalService.isAnyModalOpen();
    const isTagDropdownOpen = this.showTagDropdown;
    
    // Escape key to close modals/dropdowns
    if (event.key === 'Escape') {
      if (isAnyModalOpen) {
        this.modalService.closeAllModals();
      } else if (isTagDropdownOpen) {
        this.showTagDropdown = false;
        this.newTagName = '';
      }
      return;
    }

    // Only allow shortcuts when no modal/dropdown is open
    if (isAnyModalOpen || isTagDropdownOpen) {
      return;
    }

    // Modifier + Shift + S: Focus search bar
    if (event.shiftKey && event.key.toLowerCase() === 's' && 
        (this.isMac() ? event.altKey : event.altKey)) {
      event.preventDefault();
      const searchInput = this.elementRef.nativeElement.querySelector('.search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }

    // Modifier + Shift + F: Open create new folder dropdown
    if (event.shiftKey && event.key.toLowerCase() === 'f' && 
        (this.isMac() ? event.altKey : event.altKey)) {
      event.preventDefault();
      // This will be handled by the folder sidebar component
      // We'll emit an event to trigger it
      this.openCreateFolderDropdown();
    }

    // Modifier + Shift + G: Open create new tag dropdown
    if (event.shiftKey && event.key.toLowerCase() === 'g' && 
        (this.isMac() ? event.altKey : event.altKey)) {
      event.preventDefault();
      this.toggleTagDropdown();
    }

    // Modifier + Shift + N: Open create new note modal
    if (event.shiftKey && event.key.toLowerCase() === 'n' && 
        (this.isMac() ? event.altKey : event.altKey)) {
      event.preventDefault();
      this.openCreateNoteModal();
    }
  }

  openCreateFolderDropdown(): void {
    // Emit an event that the folder sidebar can listen to
    // For now, we'll use a custom event
    const folderEvent = new CustomEvent('openCreateFolderDropdown');
    document.dispatchEvent(folderEvent);
  }

  createTag(): void {
    if (!this.newTagName.trim()) return;

    const newTag = {
      id: Date.now().toString(),
      name: this.newTagName.trim(),
      userId: this.app.authService.getCurrentUser()?.id?.toString() || ''
    };

    this.tagsService.createTag(newTag).subscribe({
      next: () => {
        this.newTagName = '';
        this.showTagDropdown = false;
        this.app.showToasterNotification(`Created New Tag\nTag '${newTag.name}' created successfully!`);
      },
      error: (error) => {
        console.error('Error creating tag:', error);
        this.app.showToasterNotification('Failed to create tag. Please try again.', 'error');
      }
    });
  }
} 