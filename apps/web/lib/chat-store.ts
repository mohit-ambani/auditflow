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

export interface FileUploadStatus {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadProgress: number; // 0-100
  processingStage: 'uploading' | 'parsing' | 'classifying' | 'extracting' | 'validating' | 'ready' | 'saved' | 'error';
  documentType?: string;
  confidence?: number;
  extractedData?: any;
  issues?: string[];
  error?: string;
}

export interface ConfirmationRequest {
  id: string;
  action: string; // 'save_invoice', 'save_po', 'accept_match', etc.
  data: any;
  message: string;
  resolved: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
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

  // File processing status
  fileStatuses: Record<string, FileUploadStatus>;
  pendingConfirmations: ConfirmationRequest[];
  quickActions: QuickAction[];

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

  setFileStatus: (fileId: string, status: Partial<FileUploadStatus>) => void;
  removeFileStatus: (fileId: string) => void;
  addConfirmation: (confirmation: ConfirmationRequest) => void;
  resolveConfirmation: (id: string, accepted: boolean) => void;
  setQuickActions: (actions: QuickAction[]) => void;

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
  fileStatuses: {},
  pendingConfirmations: [],
  quickActions: [
    { id: 'upload', label: 'Upload Files', prompt: '', icon: 'Upload' },
    { id: 'unpaid', label: 'Show Unpaid Invoices', prompt: 'Show me all unpaid invoices', icon: 'IndianRupee' },
    { id: 'gst', label: 'GST Status', prompt: 'Show me GST reconciliation status for this month', icon: 'FileText' },
    { id: 'dashboard', label: "Today's Summary", prompt: "Give me today's summary - new uploads, pending reconciliations, and key metrics", icon: 'LayoutDashboard' },
  ],

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

  // File status actions
  setFileStatus: (fileId, status) => set((state) => ({
    fileStatuses: {
      ...state.fileStatuses,
      [fileId]: {
        ...state.fileStatuses[fileId],
        ...status,
        fileId,
      } as FileUploadStatus
    }
  })),
  removeFileStatus: (fileId) => set((state) => {
    const { [fileId]: removed, ...rest } = state.fileStatuses;
    return { fileStatuses: rest };
  }),

  // Confirmation actions
  addConfirmation: (confirmation) => set((state) => ({
    pendingConfirmations: [...state.pendingConfirmations, confirmation]
  })),
  resolveConfirmation: (id, accepted) => set((state) => ({
    pendingConfirmations: state.pendingConfirmations.map(c =>
      c.id === id ? { ...c, resolved: true } : c
    )
  })),

  // Quick actions
  setQuickActions: (actions) => set({ quickActions: actions }),

  // Reset
  reset: () => set({
    messages: [],
    streamingMessage: '',
    isStreaming: false,
    sidePanelData: null,
    sidePanelOpen: false,
    fileStatuses: {},
    pendingConfirmations: []
  })
}));
