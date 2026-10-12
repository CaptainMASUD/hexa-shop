import SupportTicket from '../models/SupportTicket.js';
import { notifyUser, notifyAdmins } from './notificationService.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Low-level HTTP call to the hexa-ai support ticket agent endpoint
 */
export const callHexaAiTicketAgent = async (payload) => {
  const url = `${AI_SERVICE_URL.replace(/\/$/, '')}/api/support/ticket-agent`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(35000), // 35s timeout
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`AI service returned status ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[aiSupportService] Call to hexa-ai failed:', err.message);
    throw err;
  }
};

/**
 * Format ticket into TicketAgentRequest payload
 */
export const buildTicketAgentPayload = (ticket) => {
  const messages = (ticket.messages || []).map((m) => ({
    sender: m.isAi ? 'ai_agent' : (m.isAdmin ? 'support' : 'user'),
    message: m.message,
    isAdmin: Boolean(m.isAdmin),
    isAi: Boolean(m.isAi),
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
  }));

  let orderInfo = null;
  if (ticket.order) {
    orderInfo = {
      orderId: String(ticket.order._id || ticket.order),
      orderNumber: ticket.order.orderNumber || '',
      status: ticket.order.status || '',
      total: ticket.order.total || 0,
      paymentMethod: ticket.order.payment?.method || '',
      paymentStatus: ticket.order.payment?.status || '',
      trxId: ticket.order.payment?.transactionId || '',
      itemsCount: (ticket.order.items || []).length,
    };
  }

  const user = ticket.user || {};

  return {
    ticket_id: String(ticket._id),
    ticket_number: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category || 'other',
    priority: ticket.priority || 'normal',
    customer_name: user.name || 'Customer',
    customer_email: user.email || '',
    order_info: orderInfo,
    messages,
    account_context: {
      userId: String(user._id || ''),
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
    },
  };
};

/**
 * Autonomous AI processing: receives ticket, generates response, updates ticket, and alerts admin if escalated.
 */
export const processTicketWithAi = async (ticketId) => {
  try {
    const ticket = await SupportTicket.findById(ticketId)
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber status total payment items');

    if (!ticket) {
      console.warn(`[aiSupportService] Ticket ${ticketId} not found`);
      return null;
    }

    if (['closed', 'resolved'].includes(ticket.status)) {
      return null;
    }

    // Guard against auto-reply loops: check if last message was already from admin or AI
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    if (lastMsg && (lastMsg.isAdmin || lastMsg.isAi)) {
      return null;
    }

    const payload = buildTicketAgentPayload(ticket);
    const aiResult = await callHexaAiTicketAgent(payload);

    if (!aiResult || !aiResult.reply_to_user) {
      console.warn(`[aiSupportService] No reply returned for ticket ${ticket.ticketNumber}`);
      return null;
    }

    const isEscalated = Boolean(aiResult.admin_report?.needs_admin_action);

    // Append AI reply
    ticket.messages.push({
      sender: null,
      message: aiResult.reply_to_user,
      isAdmin: true,
      isAi: true,
      createdAt: new Date(),
    });

    // Update diagnosis & escalation report
    if (aiResult.admin_report) {
      ticket.aiReport = {
        needsAdminAction: isEscalated,
        issueSummary: aiResult.admin_report.issue_summary || '',
        recommendedAction: aiResult.admin_report.recommended_action || '',
        escalationReason: aiResult.admin_report.escalation_reason || '',
        sentiment: aiResult.admin_report.sentiment || 'neutral',
        urgency: aiResult.admin_report.urgency || 'normal',
        generatedAt: new Date(),
      };
    }

    if (isEscalated) {
      // Escalated to admin: keep ticket open with high/urgent priority
      ticket.status = 'open';
      ticket.priority = aiResult.suggested_priority === 'urgent' ? 'urgent' : 'high';
    } else {
      ticket.status = aiResult.suggested_status || 'waiting_customer';
      if (aiResult.suggested_priority) {
        ticket.priority = aiResult.suggested_priority;
      }
    }

    ticket.aiHandled = true;
    ticket.lastReplyAt = new Date();
    await ticket.save();

    // Notify user
    const customerId = ticket.user?._id || ticket.user;
    if (customerId) {
      await notifyUser(
        customerId,
        'support',
        '🤖 HEXA AI Support Assistant Replied',
        `New reply on ${ticket.ticketNumber}: "${aiResult.reply_to_user.slice(0, 90)}..."`,
        '/account/support'
      ).catch(() => {});
    }

    // If escalated, alert administrators
    if (isEscalated) {
      await notifyAdmins(
        'support_escalated',
        `⚠️ Support Action Required: ${ticket.ticketNumber}`,
        `AI Agent Escalation: ${ticket.aiReport?.issueSummary || ticket.subject}. Recommended: ${ticket.aiReport?.recommendedAction || 'Admin intervention required'}.`,
        '/admin/features?tab=support',
        { ticketId: ticket._id }
      ).catch(() => {});
    }

    return { ticket, aiResult };
  } catch (err) {
    console.error(`[aiSupportService] Error processing ticket ${ticketId}:`, err.message);
    return null;
  }
};

/**
 * On-demand AI Analysis & Reply Drafting for Admins
 */
export const analyzeTicketForAdmin = async (ticketId) => {
  const ticket = await SupportTicket.findById(ticketId)
    .populate('user', 'name email phone')
    .populate('order', 'orderNumber status total payment items');

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const payload = buildTicketAgentPayload(ticket);
  const aiResult = await callHexaAiTicketAgent(payload);

  if (!aiResult) {
    throw new Error('AI analysis service did not return a response');
  }

  // Update stored aiReport on DB without adding message
  if (aiResult.admin_report) {
    ticket.aiReport = {
      needsAdminAction: Boolean(aiResult.admin_report.needs_admin_action),
      issueSummary: aiResult.admin_report.issue_summary || '',
      recommendedAction: aiResult.admin_report.recommended_action || '',
      escalationReason: aiResult.admin_report.escalation_reason || '',
      sentiment: aiResult.admin_report.sentiment || 'neutral',
      urgency: aiResult.admin_report.urgency || 'normal',
      generatedAt: new Date(),
    };
    await ticket.save();
  }

  return {
    ticket,
    draftReply: aiResult.reply_to_user || '',
    adminReport: ticket.aiReport,
    suggestedStatus: aiResult.suggested_status || 'waiting_customer',
    suggestedPriority: aiResult.suggested_priority || 'normal',
    model: aiResult.model || '',
  };
};
