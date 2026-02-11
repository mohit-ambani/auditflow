import { useChatStore, ChatMessage } from './chat-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Fetch all conversations
 */
export async function fetchConversations() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/chat/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch conversations');
  }

  return result.data;
}

/**
 * Create a new conversation
 */
export async function createConversation() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to create conversation');
  }

  return result.data;
}

/**
 * Fetch conversation history
 */
export async function fetchConversationHistory(conversationId: string) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/chat/conversations/${conversationId}`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch conversation');
  }

  return result.data;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete conversation');
  }

  return result;
}

/**
 * Upload file for chat
 */
export async function uploadChatFile(file: File): Promise<string> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/chat/upload`, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    },
    credentials: 'include',
    body: formData
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to upload file');
  }

  return result.data.file_id;
}

/**
 * Send a message and stream the response using Server-Sent Events
 */
export async function sendChatMessage(
  conversationId: string,
  message: string,
  fileIds: string[] = []
) {
  const {
    addMessage,
    setStreaming,
    appendToStreamingMessage,
    clearStreamingMessage,
    setSidePanelData
  } = useChatStore.getState();

  // Add user message immediately
  addMessage({
    id: crypto.randomUUID(),
    role: 'USER',
    content: message,
    attachments: fileIds,
    createdAt: new Date()
  });

  // Clear any previous streaming message
  clearStreamingMessage();
  setStreaming(true);

  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      conversation_id: conversationId,
      message: message
    });

    if (fileIds.length > 0) {
      params.append('file_ids', fileIds.join(','));
    }

    const eventSource = new EventSource(
      `${API_URL}/api/chat/stream?${params.toString()}`,
      {
        withCredentials: true
      }
    );

    // Note: EventSource doesn't support custom headers, so we pass auth via query or cookie
    // For production, ensure cookies are used for auth or implement WebSocket

    eventSource.onmessage = (event) => {
      const chunk = JSON.parse(event.data);

      if (chunk.type === 'content') {
        // Streaming text content
        appendToStreamingMessage(chunk.text || '');
      } else if (chunk.type === 'tool_call') {
        // Tool is being called - could show loading indicator
        console.log('Tool call:', chunk.toolName);
      } else if (chunk.type === 'tool_result') {
        // Tool result received - display in side panel
        setSidePanelData({
          type: 'json',
          title: chunk.toolName || 'Result',
          data: chunk.toolResult
        });
      } else if (chunk.type === 'done') {
        // Stream complete - add assistant message
        const streamingContent = useChatStore.getState().streamingMessage;
        if (streamingContent) {
          addMessage({
            id: crypto.randomUUID(),
            role: 'ASSISTANT',
            content: streamingContent,
            createdAt: new Date()
          });
        }
        clearStreamingMessage();
        setStreaming(false);
        eventSource.close();
      } else if (chunk.type === 'error') {
        // Error occurred
        console.error('Chat error:', chunk.error);
        addMessage({
          id: crypto.randomUUID(),
          role: 'ASSISTANT',
          content: `Error: ${chunk.error}`,
          createdAt: new Date()
        });
        clearStreamingMessage();
        setStreaming(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setStreaming(false);
      eventSource.close();
    };

  } catch (error) {
    console.error('Send message error:', error);
    setStreaming(false);
    throw error;
  }
}
