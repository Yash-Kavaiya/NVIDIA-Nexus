import axios from 'axios';
import type { FileItem, Task, Message, AIRequest, AIResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// File API
export const fileApi = {
  scanDirectory: async (path: string): Promise<FileItem[]> => {
    const response = await api.post('/files/scan/', { path });
    return response.data;
  },

  listFiles: async (path?: string): Promise<FileItem[]> => {
    const response = await api.get('/files/', { params: { path } });
    return response.data;
  },

  organizeFiles: async (path: string, strategy: string): Promise<Task> => {
    const response = await api.post('/files/organize/', { path, strategy });
    return response.data;
  },

  renameFiles: async (operations: { source: string; target: string }[]): Promise<Task> => {
    const response = await api.post('/files/rename/', { operations });
    return response.data;
  },

  deleteFiles: async (paths: string[]): Promise<Task> => {
    const response = await api.post('/files/delete/', { paths });
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
    const response = await api.get('/tasks');
    return response.data;
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  pauseTask: async (id: string): Promise<Task> => {
    const response = await api.post(`/tasks/${id}/pause`);
    return response.data;
  },

  resumeTask: async (id: string): Promise<Task> => {
    const response = await api.post(`/tasks/${id}/resume`);
    return response.data;
  },

  cancelTask: async (id: string): Promise<void> => {
    await api.post(`/tasks/${id}/cancel`);
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
