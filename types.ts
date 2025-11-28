
export enum UserRole {
  /**
   * OWNER: Aleks. Full access. Can delete projects.
   */
  OWNER = 'OWNER', 
  
  /**
   * MANAGER: Filip. Admin access but cannot delete projects.
   * Can manage client channels and users.
   */
  MANAGER = 'MANAGER',
  
  /**
   * CLIENT: Limited access to ClientPortal.
   */
  CLIENT = 'CLIENT' 
}

export enum ClientRole {
  /**
   * TEAMLEADER: Can create/edit channels in Client Portal.
   */
  TEAMLEADER = 'TEAMLEADER',
  
  /**
   * USER: Standard read/write access in assigned channels.
   */
  USER = 'USER',

  /**
   * GUEST: Restricted access. Can only view/interact with specifically assigned channels.
   * Read-only on project level data.
   */
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  clientRole?: ClientRole; // Specific permissions for clients
  avatar: string; 
  email: string;
  password?: string; // New password field
  projectId?: string; 
  assignedProjects?: string[]; // IDs of projects a MANAGER manages
  phone?: string;
  availability?: string;
  bio?: string;
  lastSeen?: string; 
  personalNotes?: string; 
  allowedChannels?: string[]; // IDs of channels a GUEST is allowed to access
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeId: string; 
  projectId: string; 
  dueDate?: string; 
  subtasks: SubTask[];
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export type EventType = 'GIG' | 'STUDIO' | 'MEETING' | 'RELEASE' | 'PR' | 'DEADLINE' | 'OTHER';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; 
  startTime?: string; 
  endDate?: string; 
  type: EventType;
  projectId: string;
  location?: string;
  attendees?: string[]; 
}

export interface AppFile {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document' | 'other';
  url: string;
  size: string;
  uploadedBy: string; 
  projectId: string; 
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  room: string; 
  projectId: string; 
  attachment?: AppFile; 
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'GENERAL' | 'GROUP';
  members?: string[]; 
}

// Client Portal Channels (Dynamic)
export interface ClientChannel {
  id: string;
  name: string;
  projectId: string;
  icon?: string; // Icon name as string
}

export interface BroadcastMessage {
  id: string;
  message: string;
  targetProjectId: 'all' | string; 
  createdAt: string;
  authorName: string;
}

export interface MediaMention {
  id: string;
  source: string; 
  title: string;
  url: string;
  date: string;
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  streams: { date: string; value: number }[];
  revenue: { month: string; value: number }[];
  followers: { platform: string; count: number }[];
  mentions: MediaMention[]; 
}

export interface Project {
  id: string;
  name: string;
  members: string[]; 
}

export interface AppNotification {
  id: string;
  type: 'MESSAGE' | 'TASK' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  linkTo?: string; // e.g., tab ID or room ID
}

export interface SearchResult {
  id: string;
  type: 'PROJECT' | 'TASK' | 'FILE' | 'MESSAGE' | 'EVENT';
  title: string;
  subtitle: string;
  data: any; // The original object
  linkTo?: string; // ID to navigate to (e.g. projectId, roomId)
}