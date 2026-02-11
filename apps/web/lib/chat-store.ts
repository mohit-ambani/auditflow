import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  toolCalls?: any[];
  toolResults?: any[];
  attachments?: string[];
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SidePanelData {
  type: 'table' | 'chart' | 'document' | 'json';
  title: string;
  data: any;
}

interface ChatState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Messages
  messages: ChatMessage[];
  streamingMessage: string;
  isStreaming: boolean;

  // Side panel
  sidePanelOpen: boolean;
  sidePanelData: SidePanelData | null;

  // File uploads
  uploadingFiles: File[];
  uploadProgress: Record<string, number>;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string) => void;
  addConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  appendToStreamingMessage: (chunk: string) => void;
  clearStreamingMessage: () => void;
  setStreaming: (isStreaming: boolean) => void;

  setSidePanelData: (data: SidePanelData | null) => void;
  toggleSidePanel: () => void;

  addUploadingFile: (file: File) => void;
  removeUploadingFile: (fileName: string) => void;
  setUploadProgress: (fileName: string, progress: number) => void;

  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Initial state
  conversations: [],
  activeConversationId: null,
  messages: [],
  streamingMessage: '',
  isStreaming: false,
  sidePanelOpen: false,
  sidePanelData: null,
  uploadingFiles: [],
  uploadProgress: {},

  // Conversation actions
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),
  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations],
    activeConversationId: conversation.id
  })),
  deleteConversation: (id) => set((state) => ({
    conversations: state.conversations.filter(c => c.id !== id),
    activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
  })),

  // Message actions
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  appendToStreamingMessage: (chunk) => set((state) => ({
    streamingMessage: state.streamingMessage + chunk
  })),
  clearStreamingMessage: () => set({ streamingMessage: '' }),
  setStreaming: (isStreaming) => set({ isStreaming }),

  // Side panel actions
  setSidePanelData: (data) => set({
    sidePanelData: data,
    sidePanelOpen: data !== null
  }),
  toggleSidePanel: () => set((state) => ({
    sidePanelOpen: !state.sidePanelOpen
  })),

  // Upload actions
  addUploadingFile: (file) => set((state) => ({
    uploadingFiles: [...state.uploadingFiles, file]
  })),
  removeUploadingFile: (fileName) => set((state) => ({
    uploadingFiles: state.uploadingFiles.filter(f => f.name !== fileName)
  })),
  setUploadProgress: (fileName, progress) => set((state) => ({
    uploadProgress: { ...state.uploadProgress, [fileName]: progress }
  })),

  // Reset
  reset: () => set({
    messages: [],
    streamingMessage: '',
    isStreaming: false,
    sidePanelData: null,
    sidePanelOpen: false
  })
}));
