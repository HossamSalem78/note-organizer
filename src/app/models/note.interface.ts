export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string; // Add userId to associate notes with users
  folderId: string;
  tagIds: string[];
  category?: string;
  assignedTeams?: string[];
} 