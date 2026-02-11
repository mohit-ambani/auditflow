import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { ChatToolExecutor } from './chat-tool-executor';
import { CHAT_TOOLS } from './chat-tools';
import logger from '../lib/logger';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error';
  text?: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  error?: string;
  usage?: any;
}

/**
 * Orchestrates chat conversations with Claude AI
 * Handles streaming, tool execution, and conversation history
 */
export class ChatOrchestrator {
  private toolExecutor: ChatToolExecutor;

  constructor(private prisma: PrismaClient) {
    this.toolExecutor = new ChatToolExecutor(prisma);
  }

  /**
   * Send a message and stream the response
   */
  async *sendMessage(
    conversationId: string,
    userMessage: string,
    attachments: string[] = [],
    orgId: string,
    userId: string
  ): AsyncGenerator<StreamChunk> {
    try {
      // Save user message to database
      await this.prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'USER',
          content: userMessage,
          attachments: attachments.length > 0 ? attachments : null
        }
      });

      // Get conversation history
      const history = await this.getConversationHistory(conversationId, 50);

      // Build messages for Claude
      const messages: Anthropic.MessageParam[] = history.map(msg => ({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add current message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Stream response from Claude
      let assistantMessage = '';
      let toolCalls: any[] = [];
      let toolResults: any[] = [];

      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages,
        tools: CHAT_TOOLS,
        system: `You are an AI assistant for AuditFlow, an accounting and audit automation platform.

You help users with:
- Querying invoices, purchase orders, vendors, customers, and transactions
- Reconciling documents (PO-Invoice, Invoice-Payment, GST)
- Extracting data from uploaded documents
- Analyzing financial data and generating reports
- Finding discrepancies and anomalies
- Automating accounting workflows

When users upload files or ask about documents:
1. Use the appropriate extraction tool first
2. Summarize the extracted data clearly
3. Offer to save it to the database if it looks accurate

When users ask about reconciliation:
1. Use the query tools to find relevant documents
2. Use reconciliation tools to match and analyze
3. Explain discrepancies in simple terms
4. Provide actionable recommendations

Be concise, professional, and helpful. Always verify data before suggesting actions.
Use Indian accounting terminology (GST, CGST, SGST, IGST, ITC, GSTIN).`
      });

      // Process stream events
      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          // New content block starting
          if (event.content_block.type === 'text') {
            yield { type: 'content', text: '' };
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            // Streaming text content
            assistantMessage += event.delta.text;
            yield { type: 'content', text: event.delta.text };
          }
        } else if (event.type === 'content_block_stop') {
          const block = stream.currentMessage?.content[event.index];

          if (block?.type === 'tool_use') {
            // Tool call detected
            yield {
              type: 'tool_call',
              toolName: block.name,
              toolInput: block.input
            };

            toolCalls.push({
              id: block.id,
              name: block.name,
              input: block.input
            });

            // Execute tool
            try {
              const result = await this.toolExecutor.execute(
                block.name,
                block.input,
                orgId
              );

              toolResults.push({
                tool_use_id: block.id,
                content: JSON.stringify(result)
              });

              yield {
                type: 'tool_result',
                toolName: block.name,
                toolResult: result
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              logger.error({ error, toolName: block.name }, 'Tool execution error');

              toolResults.push({
                tool_use_id: block.id,
                content: `Error: ${errorMessage}`,
                is_error: true
              });

              yield {
                type: 'error',
                toolName: block.name,
                error: errorMessage
              };
            }
          }
        } else if (event.type === 'message_stop') {
          // Message complete
          yield {
            type: 'done',
            usage: stream.currentMessage?.usage
          };
        }
      }

      // If there were tool calls, continue conversation with tool results
      if (toolResults.length > 0) {
        messages.push({
          role: 'assistant',
          content: stream.currentMessage?.content || []
        });

        messages.push({
          role: 'user',
          content: toolResults
        });

        // Get Claude's response after tool execution
        const followUpStream = await client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          messages,
          tools: CHAT_TOOLS
        });

        let followUpMessage = '';

        for await (const event of followUpStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            followUpMessage += event.delta.text;
            yield { type: 'content', text: event.delta.text };
          } else if (event.type === 'message_stop') {
            assistantMessage += '\n\n' + followUpMessage;
            yield {
              type: 'done',
              usage: followUpStream.currentMessage?.usage
            };
          }
        }
      }

      // Save assistant message to database
      await this.prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: assistantMessage,
          toolCalls: toolCalls.length > 0 ? toolCalls : null,
          toolResults: toolResults.length > 0 ? toolResults : null,
          metadata: {
            model: 'claude-sonnet-4-5-20250929',
            usage: stream.currentMessage?.usage
          }
        }
      });

      // Update conversation updated timestamp
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

    } catch (error) {
      logger.error({ error, conversationId }, 'Chat orchestration error');
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string, limit: number = 50) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      toolCalls: msg.toolCalls,
      toolResults: msg.toolResults,
      createdAt: msg.createdAt
    }));
  }

  /**
   * Create a new conversation
   */
  async createConversation(orgId: string, userId: string, title?: string) {
    return await this.prisma.chatConversation.create({
      data: {
        orgId,
        userId,
        title: title || 'New Conversation'
      }
    });
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(orgId: string, userId: string) {
    return await this.prisma.chatConversation.findMany({
      where: { orgId, userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    });
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, orgId: string, userId: string) {
    await this.prisma.chatConversation.deleteMany({
      where: { id: conversationId, orgId, userId }
    });
  }

  /**
   * Generate conversation title from first message
   */
  async generateConversationTitle(conversationId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 2
    });

    if (messages.length === 0) {
      return 'New Conversation';
    }

    const firstUserMessage = messages.find(m => m.role === 'USER');
    if (!firstUserMessage) {
      return 'New Conversation';
    }

    // Generate title from first message (max 50 chars)
    let title = firstUserMessage.content.slice(0, 50);
    if (firstUserMessage.content.length > 50) {
      title += '...';
    }

    // Update conversation title
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { title }
    });

    return title;
  }
}

// Singleton instance
let orchestrator: ChatOrchestrator | null = null;

export function getChatOrchestrator(prisma: PrismaClient): ChatOrchestrator {
  if (!orchestrator) {
    orchestrator = new ChatOrchestrator(prisma);
  }
  return orchestrator;
}
