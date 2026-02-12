import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { ChatToolExecutor } from './chat-tool-executor';
import { CHAT_TOOLS } from './chat-tools';
import logger from '../lib/logger';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error'
      | 'processing_status' | 'file_uploaded' | 'confirmation_request'
      | 'data_table' | 'review_request';
  text?: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  error?: string;
  usage?: any;
  // New fields for file processing
  fileId?: string;
  fileName?: string;
  documentType?: string;
  confidence?: number;
  stage?: string;
  progress?: number;
  // New fields for data presentation
  tableData?: {
    title: string;
    columns?: any[];
    rows: any[];
    summary?: any;
  };
  // New fields for confirmations
  confirmationData?: {
    action: string;
    data: any;
    message: string;
  };
  reviewData?: {
    issues: string[];
    data: any;
  };
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
      const messages: Anthropic.MessageParam[] = history.map(msg => {
        // For assistant messages with tool calls, reconstruct the content properly
        if (msg.role === 'ASSISTANT' && msg.toolCalls && Array.isArray(msg.toolCalls)) {
          const content: any[] = [];

          // Add text content if present
          if (msg.content) {
            content.push({ type: 'text', text: msg.content });
          }

          // Add tool use blocks
          for (const toolCall of msg.toolCalls) {
            content.push({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.input
            });
          }

          return {
            role: 'assistant',
            content
          };
        }

        // For user messages with tool results, format as tool result blocks
        if (msg.role === 'USER' && msg.toolResults && Array.isArray(msg.toolResults)) {
          return {
            role: 'user',
            content: msg.toolResults
          };
        }

        // For regular messages, use simple string content
        return {
          role: msg.role === 'USER' ? 'user' : 'assistant',
          content: msg.content
        };
      });

      // Inject file context if attachments present
      let enhancedMessage = userMessage;
      if (attachments.length > 0) {
        const fileContext = await this.buildFileContext(attachments, orgId);
        enhancedMessage = `[Files attached: ${fileContext}]\n\n${userMessage || 'I uploaded some files. Please process them.'}`;

        // Emit file_uploaded events for each attachment
        for (const fileId of attachments) {
          const file = await this.prisma.uploadedFile.findUnique({
            where: { id: fileId }
          });
          if (file) {
            yield {
              type: 'file_uploaded',
              fileId: file.id,
              fileName: file.originalName,
              documentType: file.documentType || undefined,
              confidence: undefined
            };
          }
        }
      }

      // Add current message
      messages.push({
        role: 'user',
        content: enhancedMessage
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
        system: `You are the AI assistant for AuditFlow, an Indian accounting and audit automation platform.

YOU ARE AN ACTION-ORIENTED AI - When users ask you to DO something, you EXECUTE it using tools, not just explain it.

═══════════════════════════════════════════════════════════════════
CRITICAL: EXECUTE, DON'T JUST EXPLAIN
═══════════════════════════════════════════════════════════════════
When a user asks "reconcile X" or "find Y" or "show me Z":
❌ DON'T: Explain how to do it or what fields are needed
✅ DO: Immediately call the appropriate tool(s) and show results

Example:
User: "Reconcile invoice INV-001 with payment"
❌ Bad: "I can help reconcile that. I'll need the invoice ID first..."
✅ Good: [Calls query_purchase_invoices with invoice_number="INV-001", then reconcile_invoice_payment with the invoice_id, then presents results]

═══════════════════════════════════════════════════════════════════
WORKFLOW EXECUTION PATTERNS (MEMORIZE THESE)
═══════════════════════════════════════════════════════════════════

1. FILE UPLOAD WORKFLOW (AUTOMATIC):
   User uploads file → You MUST:
   ├─ classify_and_process_file(file_id)
   ├─ present_data_table with extracted data
   ├─ Ask: "Shall I save this?"
   ├─ [User confirms] → save_extracted_data(file_id, data)
   └─ auto_reconcile_after_save(file_id) → show matches found

2. RECONCILIATION WORKFLOWS (EXECUTE IMMEDIATELY):

   A. "Reconcile invoice X with PO Y":
      ├─ query_purchase_invoices(invoice_number=X) → get invoice_id
      ├─ query_purchase_orders(po_number=Y) → get po_id
      ├─ reconcile_po_invoice(po_id, invoice_id)
      └─ Explain discrepancies + recommend action

   B. "Find which PO matches invoice X":
      ├─ query_purchase_invoices(invoice_number=X) → get invoice_id
      ├─ find_po_matches(invoice_id, top_n=5)
      └─ Show top matches with scores + Ask: "Shall I reconcile with the top match?"

   C. "Reconcile invoice X with payment":
      ├─ query_purchase_invoices(invoice_number=X) → get invoice_id
      ├─ reconcile_invoice_payment(invoice_id)
      └─ Show matching bank transactions + payment status

   D. "Run GST reconciliation for January 2025":
      ├─ reconcile_gst(month=1, year=2025)
      └─ Show matched, unmatched, and discrepancies with ITC impact

   E. "Check vendor ledger for ABC Suppliers":
      ├─ query_vendors(search="ABC Suppliers") → get vendor_id
      ├─ generate_vendor_ledger(vendor_id, from_date, to_date)
      └─ Show opening balance, transactions, closing balance

   F. "Find duplicate payments":
      ├─ find_duplicate_payments()
      └─ Show duplicates with amounts, dates, parties

   G. "Show me unpaid invoices":
      ├─ query_purchase_invoices(payment_status="UNPAID")
      ├─ present_data_table with results
      └─ Ask: "Want me to reconcile any of these with payments?"

3. PROACTIVE RECONCILIATION (OFFER AUTOMATICALLY):

   After saving invoice → ALWAYS ask:
   "I saved the invoice. Shall I find matching POs and payments?"

   After saving bank statement → ALWAYS ask:
   "Shall I match these transactions with unpaid invoices?"

   After saving PO → ALWAYS ask:
   "Want me to check if matching invoices exist?"

═══════════════════════════════════════════════════════════════════
TOOL SELECTION INTELLIGENCE
═══════════════════════════════════════════════════════════════════

User says "reconcile" → Determine type:
├─ "reconcile PO" → reconcile_po_invoice OR find_po_matches
├─ "reconcile payment" → reconcile_invoice_payment
├─ "reconcile GST" → reconcile_gst
├─ "reconcile inventory" → reconcile_inventory
└─ "reconcile vendor" → generate_vendor_ledger

User says "show" or "find" → Use query tools:
├─ "unpaid invoices" → query_purchase_invoices(payment_status="UNPAID")
├─ "vendor X" → query_vendors(search=X)
├─ "invoices from Jan" → query_purchase_invoices(from_date, to_date)
├─ "bank payments" → query_bank_transactions(transaction_type="DEBIT")
└─ "duplicates" → find_duplicate_payments OR find_duplicate_invoices

User says "create" or "add" → Use action tools:
├─ "add vendor" → create_vendor(name, gstin, ...)
├─ "create customer" → create_customer(name, ...)
└─ "send reminder" → send_payment_reminder(invoice_id)

═══════════════════════════════════════════════════════════════════
DATA PRESENTATION RULES
═══════════════════════════════════════════════════════════════════
- Use present_data_table for 3+ rows (invoices, transactions, matches)
- Currency: ₹1,18,000.00 (Indian format with commas)
- Dates: 15-Jan-2025 (DD-MMM-YYYY)
- Always show confidence scores for AI data
- Highlight discrepancies in RED severity terms
- Match scores: EXACT (100%), HIGH (>90%), PARTIAL (70-90%), LOW (<70%)

═══════════════════════════════════════════════════════════════════
CONFIRMATION PROTOCOL (ACCOUNTING ACCURACY)
═══════════════════════════════════════════════════════════════════
✅ ASK before saving extracted data
✅ WARN if arithmetic_verified = false
✅ REQUIRE review if confidence < 70%
✅ EXPLAIN discrepancies before accepting matches
❌ NEVER auto-save without user confirmation
❌ NEVER skip validation for financial data

═══════════════════════════════════════════════════════════════════
RECONCILIATION MATCH CRITERIA (BE SPECIFIC)
═══════════════════════════════════════════════════════════════════

PO-Invoice Match:
├─ EXACT: PO number matches, vendor matches, amounts match within ₹1
├─ PARTIAL: Vendor + date range match, but quantity/amount differs
└─ FUZZY: Similar vendor, similar amount, timeframe overlap

Invoice-Payment Match:
├─ EXACT: Invoice amount = transaction amount, vendor account matches
├─ PARTIAL: Multiple invoices paid together (split payment)
└─ OVERPAID: Transaction > invoice (advance or overpayment)

GST Match:
├─ MATCHED: Invoice GSTIN + amount in GSTR-2A
├─ UNMATCHED: Invoice exists but not in GSTR-2A (ITC risk!)
└─ MISMATCH: Different amounts (investigation needed)

═══════════════════════════════════════════════════════════════════
EXPLAIN DISCREPANCIES CLEARLY
═══════════════════════════════════════════════════════════════════

Good example:
"Found 3 discrepancies:
1. Item: Steel Rods - Qty variance (PO: 100, Invoice: 95, -5 units)
2. Unit Price: ₹850 vs ₹900 (+₹50/unit, ₹4,750 total impact)
3. GST Rate: 18% vs 12% (₹3,000 tax difference)
Total Impact: ₹7,750 excess charged
Recommendation: Raise dispute with vendor"

Bad example:
"There are some differences in the data"

═══════════════════════════════════════════════════════════════════
TONE & PERSONALITY
═══════════════════════════════════════════════════════════════════
- Concise and action-oriented ("Running reconciliation..." not "I can run...")
- Proactive: Always suggest next logical step
- Use Indian terminology: GST, CGST, SGST, IGST, ITC, GSTIN, IRN, e-Way Bill
- Enthusiastic when data looks good: "Perfect! 98% confidence, all verified ✓"
- Cautious when low confidence: "⚠️ Only 65% confidence - please review carefully"
- Specific in recommendations: "Accept match" or "Dispute with vendor" or "Investigate payment date"

═══════════════════════════════════════════════════════════════════
COMMON USER INTENTS → TOOL SEQUENCES
═══════════════════════════════════════════════════════════════════

"Reconcile everything for January" →
├─ reconcile_gst(1, 2025)
├─ query_purchase_invoices(payment_status=UNPAID, from_date, to_date)
├─ For each unpaid: reconcile_invoice_payment(invoice_id)
└─ reconcile_inventory(snapshot_date)

"Monthly closing for February" →
├─ reconcile_gst(2, 2025)
├─ vendor_aging_analysis()
├─ customer_aging_analysis()
├─ query_purchase_invoices(payment_status=UNPAID)
└─ find_duplicate_payments()

"Upload and process invoices" →
├─ [Files uploaded] classify_and_process_file(each file_id)
├─ save_extracted_data(each file)
├─ auto_reconcile_after_save(each file)
└─ Summary: "Processed 5 invoices, found 3 PO matches, 2 payments matched"

Remember: YOU ARE AN EXECUTOR, NOT AN EXPLAINER. When asked to reconcile, you RECONCILE and show results.`
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
                type: 'tool_result',
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
                type: 'tool_result',
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

      // Multi-turn tool execution loop
      let iterations = 0;
      const MAX_ITERATIONS = 5;

      while (toolResults.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        logger.info({ iteration: iterations, toolCount: toolResults.length }, 'Multi-turn execution');

        messages.push({
          role: 'assistant',
          content: stream.currentMessage?.content || []
        });

        messages.push({
          role: 'user',
          content: toolResults
        });

        // Reset for next iteration
        toolCalls = [];
        toolResults = [];

        // Get Claude's response after tool execution
        const followUpStream = await client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          messages,
          tools: CHAT_TOOLS
        });

        let followUpMessage = '';

        for await (const event of followUpStream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'text') {
              yield { type: 'content', text: '' };
            }
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            followUpMessage += event.delta.text;
            yield { type: 'content', text: event.delta.text };
          } else if (event.type === 'content_block_stop') {
            const block = followUpStream.currentMessage?.content[event.index];

            if (block?.type === 'tool_use') {
              // Tool call detected in follow-up
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

                // Emit special events for certain tools
                await this.emitToolSpecificEvents(block.name, result, this, orgId);

                toolResults.push({
                  type: 'tool_result',
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
                  type: 'tool_result',
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
            if (toolResults.length === 0) {
              // No more tools, final response
              assistantMessage += (assistantMessage ? '\n\n' : '') + followUpMessage;
              yield {
                type: 'done',
                usage: followUpStream.currentMessage?.usage
              };
            }
          }
        }

        // Update stream reference for next iteration
        stream.currentMessage = followUpStream.currentMessage;
      }

      if (iterations >= MAX_ITERATIONS) {
        logger.warn({ conversationId }, 'Max iterations reached in multi-turn execution');
        yield {
          type: 'content',
          text: '\n\n(Reached maximum processing iterations. Some steps may be incomplete.)'
        };
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

      // Auto-generate conversation title after first exchange
      const conversation = await this.prisma.chatConversation.findUnique({
        where: { id: conversationId }
      });

      logger.info({ conversationId, currentTitle: conversation?.title }, 'Checking if conversation needs auto-naming');

      if (conversation && conversation.title === 'New Conversation') {
        // Generate a meaningful title based on the conversation
        logger.info({ conversationId }, 'Generating conversation title');
        const title = await this.generateConversationTitle(conversationId);
        logger.info({ conversationId, newTitle: title }, 'Generated conversation title');
        await this.prisma.chatConversation.update({
          where: { id: conversationId },
          data: {
            title,
            updatedAt: new Date()
          }
        });
        logger.info({ conversationId, title }, 'Updated conversation title');
      } else {
        // Just update timestamp
        logger.info({ conversationId, title: conversation?.title }, 'Skipping auto-naming - already has title');
        await this.prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() }
        });
      }

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
   * Generate a concise conversation title based on the chat content
   */
  async generateConversationTitle(conversationId: string): Promise<string> {
    try {
      // Get first few messages to understand the conversation
      const messages = await this.prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 6,
        select: {
          role: true,
          content: true
        }
      });

      if (messages.length === 0) {
        return 'New Conversation';
      }

      // Build conversation summary
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Ask Claude to generate a concise title
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001', // Use Haiku for speed
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Based on this conversation, generate a concise 3-5 word title that captures the main topic. Reply with ONLY the title, no quotes or extra text:\n\n${conversationText}`
        }]
      });

      const titleBlock = response.content[0];
      if (titleBlock.type === 'text') {
        let title = titleBlock.text.trim();

        // Remove quotes if present
        title = title.replace(/^["']|["']$/g, '');

        // Truncate if too long
        if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }

        return title || 'New Conversation';
      }

      return 'New Conversation';
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to generate conversation title');
      return 'New Conversation';
    }
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

  /**
   * Build file context string from attachment IDs
   */
  private async buildFileContext(attachmentIds: string[], orgId: string): Promise<string> {
    const files = await this.prisma.uploadedFile.findMany({
      where: {
        id: { in: attachmentIds },
        orgId
      }
    });

    if (files.length === 0) {
      return 'No files found';
    }

    return files.map(f =>
      `${f.originalName} (${f.mimeType}, ${this.formatFileSize(f.fileSize)}${f.documentType ? `, type: ${f.documentType}` : ''})`
    ).join(', ');
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  /**
   * Emit tool-specific events for better UX
   */
  private async emitToolSpecificEvents(
    toolName: string,
    result: any,
    generator: AsyncGenerator<StreamChunk>,
    orgId: string
  ): Promise<void> {
    // Emit processing_status for classify_and_process_file
    if (toolName === 'classify_and_process_file' && result.classification) {
      await generator.next({
        type: 'processing_status',
        stage: 'completed',
        fileId: result.file_id,
        documentType: result.classification.document_type,
        confidence: result.classification.confidence
      } as any);
    }

    // Emit data_table for present_data_table
    if (toolName === 'present_data_table' && result.type === 'data_table') {
      await generator.next({
        type: 'data_table',
        tableData: {
          title: result.title,
          columns: result.columns,
          rows: result.rows,
          summary: result.summary
        }
      } as any);
    }

    // Emit confirmation_request for save operations
    if (toolName === 'save_extracted_data' && result.success) {
      await generator.next({
        type: 'confirmation_request',
        confirmationData: {
          action: 'save_complete',
          data: result,
          message: result.message
        }
      } as any);
    }

    // Emit review_request for low-confidence extractions
    if (toolName === 'classify_and_process_file' && result.needs_manual_review) {
      await generator.next({
        type: 'review_request',
        reviewData: {
          issues: ['Low confidence score', !result.arithmetic_verified && 'Arithmetic verification failed'].filter(Boolean) as string[],
          data: result
        }
      } as any);
    }
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
