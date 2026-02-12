import axios from 'axios';
import type {
  FileItem,
  Task,
  TaskStep,
  Message,
  AIRequest,
  AIResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

type ApiTaskStep = Partial<TaskStep> & {
  task_id?: string;
  started_at?: string;
  completed_at?: string;
};

type ApiTask = Partial<Task> & {
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  steps?: ApiTaskStep[];
};

type FileDeleteResult = {
  path: string;
  success: boolean;
  error?: string;
};

type RenameOperationResult = {
  source: string;
  target?: string;
  success: boolean;
  error?: string;
};

type RenameResponse = {
  results: RenameOperationResult[];
  renamedCount: number;
  failedCount: number;
};

const generateFallbackId = (): string => Math.random().toString(36).slice(2);

const normalizeTaskStep = (step: ApiTaskStep): TaskStep => ({
  id: step.id ?? generateFallbackId(),
  description: step.description ?? '',
  status: step.status ?? 'pending',
  order: step.order ?? 0,
  result: step.result,
  error: step.error,
});

const normalizeTask = (task: ApiTask): Task => {
  const createdAt = task.createdAt ?? task.created_at ?? new Date().toISOString();
  const updatedAt = task.updatedAt ?? task.updated_at ?? createdAt;

  return {
    id: task.id ?? generateFallbackId(),
    title: task.title ?? 'Untitled Task',
    description: task.description ?? '',
    status: task.status ?? 'pending',
    progress: typeof task.progress === 'number' ? task.progress : 0,
    steps: Array.isArray(task.steps) ? task.steps.map(normalizeTaskStep) : [],
    createdAt,
    updatedAt,
    completedAt: task.completedAt ?? task.completed_at,
    error: task.error,
  };
};

// File API
export const fileApi = {
  scanDirectory: async (path: string): Promise<FileItem[]> => {
    const response = await api.post('/files/scan', null, { params: { path } });
    return response.data;
  },

  listFiles: async (path?: string): Promise<FileItem[]> => {
    const response = await api.get('/files/', { params: { path } });
    return response.data;
  },

  organizeFiles: async (path: string, strategy: string): Promise<Task> => {
    const response = await api.post('/files/organize', null, {
      params: { path, strategy },
    });
    return normalizeTask(response.data);
  },

  renameFiles: async (
    operations: { source: string; target: string }[]
  ): Promise<RenameResponse> => {
    const response = await api.post('/files/rename', operations);
    const data = response.data ?? {};
    return {
      results: Array.isArray(data.results) ? data.results : [],
      renamedCount: typeof data.renamed_count === 'number' ? data.renamed_count : 0,
      failedCount: typeof data.failed_count === 'number' ? data.failed_count : 0,
    };
  },

  deleteFiles: async (paths: string[]): Promise<FileDeleteResult[]> => {
    const response = await api.post('/files/delete', paths);
    return response.data;
  },

  uploadFiles: async (files: File[], path: string, onProgress?: (progress: number) => void): Promise<FileItem[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('path', path);

    const response = await api.post('/files/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  downloadFile: async (path: string): Promise<Blob> => {
    const response = await api.get('/files/download/', {
      params: { path },
      responseType: 'blob',
    });
    return response.data;
  },
};

// Task API
export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    const response = await api.get('/tasks/');
    return Array.isArray(response.data) ? response.data.map(normalizeTask) : [];
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`);
    return normalizeTask(response.data);
  },

  pauseTask: async (id: string): Promise<Task> => {
    const response = await api.post(`/tasks/${id}/pause`);
    return normalizeTask(response.data);
  },

  resumeTask: async (id: string): Promise<Task> => {
    const response = await api.post(`/tasks/${id}/resume`);
    return normalizeTask(response.data);
  },

  cancelTask: async (id: string): Promise<void> => {
    await api.post(`/tasks/${id}/cancel`);
  },

  seedDemoTasks: async (): Promise<{ message: string; count: number }> => {
    const response = await api.post('/tasks/seed');
    return response.data;
  },
};

// Chat API
export const chatApi = {
  sendMessage: async (request: AIRequest): Promise<AIResponse> => {
    const response = await api.post('/chat/', request);
    return response.data;
  },

  getConversations: async (): Promise<{ id: string; title: string; updatedAt: string }[]> => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  getConversation: async (id: string): Promise<Message[]> => {
    const response = await api.get(`/chat/conversations/${id}`);
    return response.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/chat/conversations/${id}`);
  },
};

// AI API
export const aiApi = {
  analyzeFiles: async (paths: string[]): Promise<{
    categories: { [key: string]: string[] };
    duplicates: string[][];
    suggestions: string[];
  }> => {
    const response = await api.post('/ai/analyze', { paths });
    return response.data;
  },

  generatePlan: async (goal: string, files?: string[]): Promise<Task> => {
    const response = await api.post('/ai/plan', { goal, files });
    return response.data;
  },

  synthesizeDocuments: async (paths: string[], prompt: string): Promise<{
    summary: string;
    keyPoints: string[];
    document: string;
  }> => {
    const response = await api.post('/ai/synthesize', { paths, prompt });
    return response.data;
  },
};

export default api;
