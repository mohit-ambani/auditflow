import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

export class PaymentReminderService {
  /**
   * Generate payment reminders for overdue invoices
   */
  async generateReminders(orgId: string): Promise<{
    created: number;
    reminders: any[];
  }> {
    const today = new Date();
    const reminders = [];

    // Get organization settings for reminder configuration
    const settings = await prisma.organizationSettings.findUnique({
      where: { orgId },
    });

    const reminderDays = settings?.customerReminderDays || [7, 15, 30];

    // Get all unpaid/partially paid invoices
    const overdueInvoices = await prisma.salesInvoice.findMany({
      where: {
        orgId,
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { lt: today },
      },
      include: {
        customer: true,
      },
    });

    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we need to send a reminder based on configured days
      const shouldRemind = reminderDays.some((days) => {
        // Send reminder if overdue exactly matches configured day (+/- 1 day tolerance)
        return Math.abs(daysOverdue - days) <= 1;
      });

      if (!shouldRemind) continue;

      // Check if reminder already sent recently (within last 7 days)
      const recentReminder = await prisma.paymentReminder.findFirst({
        where: {
          salesInvoiceId: invoice.id,
          sentAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { sentAt: 'desc' },
      });

      if (recentReminder) continue;

      // Count previous reminders for this invoice
      const reminderCount = await prisma.paymentReminder.count({
        where: { salesInvoiceId: invoice.id },
      });

      const dueAmount = invoice.totalWithGst - invoice.amountReceived;

      const reminder = await prisma.paymentReminder.create({
        data: {
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,
          reminderNumber: reminderCount + 1,
          dueAmount,
          daysOverdue,
          status: 'PENDING',
        },
      });

      reminders.push({
        ...reminder,
        invoice,
        customer: invoice.customer,
      });
    }

    logger.info({ orgId, created: reminders.length }, 'Payment reminders generated');

    return {
      created: reminders.length,
      reminders,
    };
  }

  /**
   * Send payment reminder email
   */
  async sendReminder(reminderId: string, orgId: string): Promise<boolean> {
    const reminder = await prisma.paymentReminder.findFirst({
      where: {
        id: reminderId,
        customer: {
          orgId,
        },
      },
      include: {
        customer: true,
        salesInvoice: true,
      },
    });

    if (!reminder) {
      throw new Error('Reminder not found');
    }

    if (!reminder.customer.email) {
      throw new Error('Customer email not configured');
    }

    // TODO: Implement actual email sending
    // For now, just update status

    await prisma.paymentReminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        emailMessageId: `mock-${reminderId}`,
      },
    });

    logger.info(
      { reminderId, customerEmail: reminder.customer.email },
      'Payment reminder sent'
    );

    return true;
  }

  /**
   * Get overdue summary for organization
   */
  async getOverdueSummary(orgId: string): Promise<{
    totalOverdue: number;
    totalAmount: number;
    by0to7Days: { count: number; amount: number };
    by8to30Days: { count: number; amount: number };
    by31to60Days: { count: number; amount: number };
    by60PlusDays: { count: number; amount: number };
  }> {
    const today = new Date();

    const overdueInvoices = await prisma.salesInvoice.findMany({
      where: {
        orgId,
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { lt: today },
      },
    });

    const summary = {
      totalOverdue: overdueInvoices.length,
      totalAmount: 0,
      by0to7Days: { count: 0, amount: 0 },
      by8to30Days: { count: 0, amount: 0 },
      by31to60Days: { count: 0, amount: 0 },
      by60PlusDays: { count: 0, amount: 0 },
    };

    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const dueAmount = invoice.totalWithGst - invoice.amountReceived;
      summary.totalAmount += dueAmount;

      if (daysOverdue <= 7) {
        summary.by0to7Days.count++;
        summary.by0to7Days.amount += dueAmount;
      } else if (daysOverdue <= 30) {
        summary.by8to30Days.count++;
        summary.by8to30Days.amount += dueAmount;
      } else if (daysOverdue <= 60) {
        summary.by31to60Days.count++;
        summary.by31to60Days.amount += dueAmount;
      } else {
        summary.by60PlusDays.count++;
        summary.by60PlusDays.amount += dueAmount;
      }
    }

    // Round amounts
    summary.totalAmount = Math.round(summary.totalAmount * 100) / 100;
    summary.by0to7Days.amount = Math.round(summary.by0to7Days.amount * 100) / 100;
    summary.by8to30Days.amount = Math.round(summary.by8to30Days.amount * 100) / 100;
    summary.by31to60Days.amount = Math.round(summary.by31to60Days.amount * 100) / 100;
    summary.by60PlusDays.amount = Math.round(summary.by60PlusDays.amount * 100) / 100;

    return summary;
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats(orgId: string): Promise<{
    totalReminders: number;
    pending: number;
    sent: number;
    paymentReceived: number;
    escalated: number;
  }> {
    const reminders = await prisma.paymentReminder.findMany({
      where: {
        customer: { orgId },
      },
    });

    const stats = {
      totalReminders: reminders.length,
      pending: 0,
      sent: 0,
      paymentReceived: 0,
      escalated: 0,
    };

    for (const reminder of reminders) {
      switch (reminder.status) {
        case 'PENDING':
          stats.pending++;
          break;
        case 'SENT':
          stats.sent++;
          break;
        case 'PAYMENT_RECEIVED':
          stats.paymentReceived++;
          break;
        case 'ESCALATED':
          stats.escalated++;
          break;
      }
    }

    return stats;
  }
}

export const paymentReminderService = new PaymentReminderService();
