import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileItem, Task, Message, Conversation, UserSettings, Toast } from '../types';

interface AppState {
  // File Manager State
  currentPath: string;
  selectedFiles: string[];
  files: FileItem[];
  isLoadingFiles: boolean;
  fileError: string | null;

  // Task State
  tasks: Task[];
  activeTask: Task | null;
  isLoadingTasks: boolean;

  // Chat State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoadingChat: boolean;
  isStreaming: boolean;

  // UI State
  sidebarOpen: boolean;
  activePanel: 'files' | 'chat' | 'tasks' | 'settings';
  showTaskPanel: boolean;
  toasts: Toast[];

  // Settings
  settings: UserSettings;
}

interface AppActions {
  // File Actions
  setCurrentPath: (path: string) => void;
  setFiles: (files: FileItem[]) => void;
  selectFile: (path: string) => void;
  deselectFile: (path: string) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  setFileLoading: (loading: boolean) => void;
  setFileError: (error: string | null) => void;

  // Task Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  setActiveTask: (task: Task | null) => void;
  setTaskLoading: (loading: boolean) => void;

  // Chat Actions
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setChatLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  clearChat: () => void;

  // UI Actions
  toggleSidebar: () => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  toggleTaskPanel: () => void;

  // Toast Actions
  addToast: (type: Toast['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;

  // Settings Actions
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const initialSettings: UserSettings = {
  theme: 'dark',
  fontSize: 'medium',
  autoOrganize: false,
  notifications: true,
  defaultDirectory: '',
};

export const useStore = create<AppState & AppActions>()(
  persist(
    (set, _get) => ({
      // Initial State
      currentPath: '',
      selectedFiles: [],
      files: [],
      isLoadingFiles: false,
      fileError: null,

      tasks: [],
      activeTask: null,
      isLoadingTasks: false,

      conversations: [],
      currentConversation: null,
      messages: [],
      isLoadingChat: false,
      isStreaming: false,

      sidebarOpen: true,
      activePanel: 'files',
      showTaskPanel: false,
      toasts: [],

      settings: initialSettings,

      // File Actions
      setCurrentPath: (path) => set({ currentPath: path }),
      setFiles: (files) => set({ files }),
      selectFile: (path) => set((state) => ({
        selectedFiles: state.selectedFiles.includes(path)
          ? state.selectedFiles
          : [...state.selectedFiles, path],
      })),
      deselectFile: (path) => set((state) => ({
        selectedFiles: state.selectedFiles.filter((p) => p !== path),
      })),
      selectAllFiles: () => set((state) => ({
        selectedFiles: state.files.map((f) => f.path),
      })),
      deselectAllFiles: () => set({ selectedFiles: [] }),
      setFileLoading: (loading) => set({ isLoadingFiles: loading }),
      setFileError: (error) => set({ fileError: error }),

      // Task Actions
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
      updateTask: (task) => set((state) => ({
        tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
        activeTask: state.activeTask?.id === task.id ? task : state.activeTask,
      })),
      setActiveTask: (task) => set({ activeTask: task }),
      setTaskLoading: (loading) => set({ isLoadingTasks: loading }),

      // Chat Actions
      setConversations: (conversations) => set({ conversations }),
      setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      updateMessage: (id, updates) => set((state) => ({
        messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      })),
      setChatLoading: (loading) => set({ isLoadingChat: loading }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      clearChat: () => set({ messages: [], currentConversation: null }),

      // UI Actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActivePanel: (panel) => set({ activePanel: panel }),
      toggleTaskPanel: () => set((state) => ({ showTaskPanel: !state.showTaskPanel })),

      // Toast Actions
      addToast: (type, message, duration = 5000) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
          toasts: [...state.toasts, { id, type, message, duration }]
        }));
      },
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),

      // Settings Actions
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
    }),
    {
      name: 'nvidia-nexus-storage',
      partialize: (state) => ({ settings: state.settings, sidebarOpen: state.sidebarOpen }),
    }
  )
);
