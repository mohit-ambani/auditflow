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
    credentials: 'include',
    body: JSON.stringify({})
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
 * Upload and process file (parse + classify)
 */
export async function uploadAndProcessFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<any> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.success) {
            resolve(result.data);
          } else {
            reject(new Error(result.error || 'Upload failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', `${API_URL}/api/chat/upload-and-process`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

/**
 * Send confirmation response for user actions
 */
export async function sendConfirmationResponse(
  conversationId: string,
  confirmationId: string,
  accepted: boolean,
  data?: any
) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/chat/confirmation`, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      conversation_id: conversationId,
      confirmation_id: confirmationId,
      accepted,
      data
    })
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to send confirmation');
  }

  return result.data;
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

    // Add token to query params since EventSource doesn't support headers
    if (token) {
      params.append('token', token);
    }

    const eventSource = new EventSource(
      `${API_URL}/api/chat/stream?${params.toString()}`,
      {
        withCredentials: true
      }
    );

    eventSource.onmessage = (event) => {
      const chunk = JSON.parse(event.data);
      const { setFileStatus, addConfirmation } = useChatStore.getState();

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
      } else if (chunk.type === 'file_uploaded') {
        // File uploaded - initialize status tracking
        if (chunk.file_id) {
          setFileStatus(chunk.file_id, {
            fileId: chunk.file_id,
            fileName: chunk.file_name || 'Uploaded file',
            mimeType: chunk.mime_type || 'application/octet-stream',
            fileSize: chunk.file_size || 0,
            uploadProgress: 100,
            processingStage: 'ready'
          });
        }
      } else if (chunk.type === 'processing_status') {
        // File processing status update
        if (chunk.file_id) {
          setFileStatus(chunk.file_id, {
            fileId: chunk.file_id,
            processingStage: chunk.stage || 'parsing',
            documentType: chunk.document_type,
            confidence: chunk.confidence,
            extractedData: chunk.extracted_data,
            issues: chunk.issues,
            error: chunk.error
          });
        }
      } else if (chunk.type === 'confirmation_request') {
        // AI requesting user confirmation
        addConfirmation({
          id: crypto.randomUUID(),
          action: chunk.action || 'confirm',
          data: chunk.data || {},
          message: chunk.message || 'Please confirm this action',
          resolved: false
        });
      } else if (chunk.type === 'data_table') {
        // Display data table in side panel
        setSidePanelData({
          type: 'table',
          title: chunk.title || 'Data Table',
          data: chunk.data
        });
      } else if (chunk.type === 'review_request') {
        // AI requesting manual review
        if (chunk.file_id) {
          setFileStatus(chunk.file_id, {
            fileId: chunk.file_id,
            processingStage: 'validating',
            issues: chunk.issues || ['Manual review required'],
            confidence: chunk.confidence
          });
        }
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
      // EventSource fires onerror when connection closes, even if successful
      // Only treat as error if readyState is CONNECTING (0) or if we're still streaming
      const isActualError = eventSource.readyState === EventSource.CONNECTING;

      if (isActualError) {
        console.error('SSE connection error:', error);

        // Check if it's an auth error
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ Not authenticated - please login at /login');
          addMessage({
            id: crypto.randomUUID(),
            role: 'ASSISTANT',
            content: '⚠️ Authentication required. Please [login](/login) to use the chat.',
            createdAt: new Date()
          });
        } else {
          console.error('❌ SSE connection failed - check backend logs');
          addMessage({
            id: crypto.randomUUID(),
            role: 'ASSISTANT',
            content: '⚠️ Connection error. Please refresh the page and try again.',
            createdAt: new Date()
          });
        }
      } else {
        // Normal closure after completion - not an error
        console.log('SSE connection closed normally');
      }

      setStreaming(false);
      eventSource.close();
    };

  } catch (error) {
    console.error('Send message error:', error);
    setStreaming(false);
    throw error;
  }
}
