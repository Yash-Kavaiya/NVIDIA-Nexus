// File types
export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  modifiedAt: string;
  createdAt: string;
  category?: string;
  isDirectory: boolean;
  children?: FileItem[];
}

export interface FileOperation {
  id: string;
  type: 'move' | 'copy' | 'delete' | 'rename' | 'organize';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  sourcePath: string;
  targetPath?: string;
  progress: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'planning' | 'executing' | 'completed' | 'failed' | 'paused';
  progress: number;
  steps: TaskStep[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order: number;
  result?: string;
  error?: string;
}

// Chat types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];
  metadata?: {
    taskId?: string;
    files?: string[];
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// AI types
export interface AIRequest {
  message: string;
  conversation_id?: string;
  context?: string;
  files?: string[];
  taskType?: 'chat' | 'organize' | 'analyze' | 'synthesize';
}

export interface AIResponse {
  message: string;
  conversation_id?: string;
  message_id?: string;
  task?: Task;
  suggestions?: string[];
  files?: FileItem[];
}

// User preferences
export interface UserSettings {
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
  autoOrganize: boolean;
  notifications: boolean;
  defaultDirectory: string;
}

// UI Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
