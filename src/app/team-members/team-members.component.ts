import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faPen, faTrashAlt, faTimes, faCheck, faMinus, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Team } from '../models/team.interface';
import { TeamMember } from '../models/team-member.interface';
import { TeamsService } from '../services/teams.service';
import { TeamMembersService } from '../services/team-members.service';
import { SearchService } from '../services/search.service';
import { App } from '../app';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-team-members',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule],
  templateUrl: './team-members.component.html',
  styleUrls: ['./team-members.component.css']
})
export class TeamMembersComponent implements OnInit, OnDestroy, AfterViewChecked {
  teams: Team[] = [];
  teamMembers: TeamMember[] = [];
  loading = false;
  error: string | null = null;
  faPlus = faPlus;
  faPen = faPen;
  faTrashAlt = faTrashAlt;
  faTimes = faTimes;
  faCheck = faCheck;
  faMinus = faMinus;
  faExclamationTriangle = faExclamationTriangle;
  
  // Modal properties
  showTeamMembersModal = false;
  selectedTeam: Team | null = null;
  showEditTeamModal = false;
  editingTeam: Team = { id: '', name: '', userId: '', memberIds: [] };
  isCreatingTeam = false;
  
  // Delete confirmation modal properties
  showDeleteConfirmationModal = false;
  teamToDelete: Team | null = null;
  deletingTeam = false;
  
  // New properties for dropdown
  showMemberDropdown = false;
  selectedMemberToAdd: TeamMember | null = null;
  
  // Search functionality
  filteredTeams: Team[] = [];

  // ViewChild for auto-focus
  @ViewChild('teamNameInput') teamNameInput!: ElementRef<HTMLInputElement>;

  private teamsSubscription: Subscription = new Subscription();
  private teamMembersSubscription: Subscription = new Subscription();

  constructor(
    private teamsService: TeamsService,
    private teamMembersService: TeamMembersService,
    private searchService: SearchService,
    private app: App,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTeams();
    this.loadTeamMembers();
    this.filteredTeams = [...this.teams];
    
    // Subscribe to global teams search
    this.searchService.teamsSearchState$.subscribe(searchState => {
      this.filterTeams(searchState.term, searchState.type);
    });
  }

  ngOnDestroy(): void {
    this.teamsSubscription.unsubscribe();
    this.teamMembersSubscription.unsubscribe();
  }

  ngAfterViewChecked(): void {
    // Auto-focus on team name input when edit modal is opened
    if (this.showEditTeamModal && this.teamNameInput) {
      setTimeout(() => {
        this.teamNameInput.nativeElement.focus();
      }, 0);
    }
  }

  loadTeams(): void {
    this.loading = true;
    this.error = null;

    this.teamsSubscription = this.teamsService.getTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.filteredTeams = [...teams];
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load teams';
        this.loading = false;
        console.error('Error loading teams:', error);
      }
    });
  }

  loadTeamMembers(): void {
    this.teamMembersSubscription = this.teamMembersService.getTeamMembers().subscribe({
      next: (teamMembers) => {
        this.teamMembers = teamMembers;
      },
      error: (error) => {
        console.error('Error loading team members:', error);
      }
    });
  }

  getTeamMembers(team: Team): TeamMember[] {
    return this.teamMembers.filter(member => 
      team.memberIds.includes(member.id)
    );
  }

  getCurrentUserId(): string {
    // Get the current user ID from auth service
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      return currentUser.id.toString();
    }
    return '';
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  createNewTeam(): void {
    this.isCreatingTeam = true;
    this.editingTeam = { 
      id: '', 
      name: '', 
      userId: this.getCurrentUserId(), 
      memberIds: [] 
    };
    this.showEditTeamModal = true;
  }

  // Modal methods
  openTeamMembersModal(team: Team): void {
    this.selectedTeam = team;
    this.showTeamMembersModal = true;
  }

  closeTeamMembersModal(): void {
    this.showTeamMembersModal = false;
    this.selectedTeam = null;
  }

  editTeam(): void {
    if (this.selectedTeam) {
      this.openEditTeamModal(this.selectedTeam);
      this.closeTeamMembersModal();
    }
  }

  deleteTeam(): void {
    if (this.selectedTeam) {
      this.openDeleteConfirmationModal(this.selectedTeam);
      this.closeTeamMembersModal();
    }
  }

  editTeamCard(team: Team): void {
    this.openEditTeamModal(team);
  }

  deleteTeamCard(team: Team): void {
    this.openDeleteConfirmationModal(team);
  }

  // Edit Team Modal methods
  openEditTeamModal(team: Team): void {
    this.isCreatingTeam = false;
    this.editingTeam = { ...team };
    this.showEditTeamModal = true;
  }

  closeEditTeamModal(): void {
    this.showEditTeamModal = false;
    this.isCreatingTeam = false;
    this.editingTeam = { id: '', name: '', userId: '', memberIds: [] };
    this.selectedMemberToAdd = null;
  }

  // Delete confirmation modal methods
  openDeleteConfirmationModal(team: Team): void {
    this.teamToDelete = team;
    this.showDeleteConfirmationModal = true;
  }

  closeDeleteConfirmationModal(): void {
    this.showDeleteConfirmationModal = false;
    this.teamToDelete = null;
    this.deletingTeam = false;
  }

  confirmDeleteTeam(): void {
    if (this.teamToDelete && !this.deletingTeam) {
      this.deletingTeam = true;
      
      this.teamsService.deleteTeam(this.teamToDelete.id).subscribe({
        next: () => {
          this.app.showToasterNotification(`Team "${this.teamToDelete!.name}" deleted successfully!`);
          this.closeDeleteConfirmationModal();
          this.loadTeams(); // Refresh the teams list
        },
        error: (error) => {
          console.error('Error deleting team:', error);
          this.app.showToasterNotification('Failed to delete team. Please try again.', 'error');
          this.deletingTeam = false;
        }
      });
    }
  }

  getCurrentTeamMembers(): TeamMember[] {
    return this.teamMembers.filter(member => 
      this.editingTeam.memberIds.includes(member.id)
    );
  }

  getAvailableMembers(): TeamMember[] {
    return this.teamMembers.filter(member => 
      !this.editingTeam.memberIds.includes(member.id)
    );
  }

  addMember(member: TeamMember): void {
    if (!this.editingTeam.memberIds.includes(member.id)) {
      this.editingTeam.memberIds.push(member.id);
    }
    this.selectedMemberToAdd = null; // Reset selected member after adding
  }

  removeMember(member: TeamMember): void {
    this.editingTeam.memberIds = this.editingTeam.memberIds.filter(
      id => id !== member.id
    );
  }

  saveTeamChanges(): void {
    if (this.editingTeam.name.trim()) {
      if (this.isCreatingTeam) {
        // Create new team
        const newTeamData = {
          name: this.editingTeam.name.trim(),
          memberIds: this.editingTeam.memberIds
        };
        
        this.teamsService.createTeam(newTeamData).subscribe({
          next: () => {
            this.app.showToasterNotification(`Team "${newTeamData.name}" created successfully!`);
            this.closeEditTeamModal();
            this.loadTeams(); // Refresh the teams list
          },
          error: (error) => {
            console.error('Error creating team:', error);
            this.app.showToasterNotification('Failed to create team. Please try again.', 'error');
          }
        });
      } else {
        // Update existing team
        this.teamsService.updateTeam(this.editingTeam.id, this.editingTeam).subscribe({
          next: () => {
            this.app.showToasterNotification(`Team "${this.editingTeam.name}" updated successfully!`);
            this.closeEditTeamModal();
            this.loadTeams(); // Refresh the teams list
          },
          error: (error) => {
            console.error('Error updating team:', error);
            this.app.showToasterNotification('Failed to update team. Please try again.', 'error');
          }
        });
      }
    }
  }

  // New methods for dropdown
  toggleMemberDropdown(): void {
    this.showMemberDropdown = !this.showMemberDropdown;
  }

  selectMemberToAdd(member: TeamMember): void {
    this.selectedMemberToAdd = member;
    this.showMemberDropdown = false;
    this.addMember(member);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (dropdownToggle && dropdownMenu) {
      const isClickInsideDropdown = dropdownToggle.contains(event.target as Node) || dropdownMenu.contains(event.target as Node);
      if (!isClickInsideDropdown) {
        this.showMemberDropdown = false;
        this.selectedMemberToAdd = null;
      }
    }
  }

  @HostListener('document:openCreateTeamModal')
  onOpenCreateTeamModal(): void {
    this.createNewTeam();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Escape key to close modals/dropdowns
    if (event.key === 'Escape') {
      if (this.showTeamMembersModal) {
        this.closeTeamMembersModal();
        return;
      }
      if (this.showEditTeamModal) {
        this.closeEditTeamModal();
        return;
      }
      if (this.showDeleteConfirmationModal) {
        this.closeDeleteConfirmationModal();
        return;
      }
      if (this.showMemberDropdown) {
        this.showMemberDropdown = false;
        this.selectedMemberToAdd = null;
        return;
      }
    }

    // Only allow shortcuts when no modal/dropdown is open
    if (this.showTeamMembersModal || this.showEditTeamModal || this.showMemberDropdown || this.showDeleteConfirmationModal) {
      return;
    }

    // Modifier + Shift + T: Open create new team modal
    if (event.shiftKey && event.key.toLowerCase() === 't' && 
        (this.isMac() ? event.metaKey : event.altKey)) {
      event.preventDefault();
      this.createNewTeam();
    }
  }

  // OS detection for keyboard shortcuts
  private isMac(): boolean {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  // Search functionality methods
  filterTeams(searchTerm: string, searchType: string): void {
    if (!searchTerm.trim()) {
      this.filteredTeams = [...this.teams];
      return;
    }

    const term = searchTerm.toLowerCase();
    
    switch (searchType) {
      case 'teams':
        this.filteredTeams = this.teams.filter(team => 
          team.name.toLowerCase().includes(term)
        );
        break;
      case 'members':
        this.filteredTeams = this.teams.filter(team => 
          this.getTeamMembers(team).some(member => 
            member.name.toLowerCase().includes(term)
          )
        );
        break;
      default: // 'all'
        this.filteredTeams = this.teams.filter(team => 
          team.name.toLowerCase().includes(term) ||
          this.getTeamMembers(team).some(member => 
            member.name.toLowerCase().includes(term)
          )
        );
        break;
    }
  }
} 