import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTicketAgentPayload } from '../src/services/aiSupportService.js';

test('buildTicketAgentPayload structures ticket, user, messages, and order appropriately', () => {
  const fakeTicket = {
    _id: '64d1234567890abcdef12345',
    ticketNumber: 'HX-000123',
    subject: 'Cannot login to my streaming subscription',
    category: 'account',
    priority: 'high',
    user: {
      _id: '64d9999999999abcdef99999',
      name: 'Rahim Uddin',
      email: 'rahim@example.com',
      phone: '+8801711223344',
    },
    order: {
      _id: '64daaaaaaaa1234567890123',
      orderNumber: 'HEXA-ORD-8821',
      status: 'delivered',
      total: 1250,
      payment: {
        method: 'bkash',
        status: 'verified',
        transactionId: 'BKASH987XYZ',
      },
      items: [{ productId: 'p1' }, { productId: 'p2' }],
    },
    messages: [
      {
        sender: '64d9999999999abcdef99999',
        message: 'The password sent in email says invalid credentials.',
        isAdmin: false,
        isAi: false,
        createdAt: new Date('2026-10-11T10:00:00Z'),
      },
      {
        sender: null,
        message: 'Hello Rahim, I see this is for order HEXA-ORD-8821.',
        isAdmin: true,
        isAi: true,
        createdAt: new Date('2026-10-11T10:01:00Z'),
      },
    ],
  };

  const payload = buildTicketAgentPayload(fakeTicket);

  assert.equal(payload.ticket_id, '64d1234567890abcdef12345');
  assert.equal(payload.ticket_number, 'HX-000123');
  assert.equal(payload.subject, 'Cannot login to my streaming subscription');
  assert.equal(payload.category, 'account');
  assert.equal(payload.priority, 'high');
  assert.equal(payload.customer_name, 'Rahim Uddin');
  assert.equal(payload.customer_email, 'rahim@example.com');

  assert.equal(payload.order_info.orderNumber, 'HEXA-ORD-8821');
  assert.equal(payload.order_info.status, 'delivered');
  assert.equal(payload.order_info.paymentMethod, 'bkash');
  assert.equal(payload.order_info.trxId, 'BKASH987XYZ');
  assert.equal(payload.order_info.itemsCount, 2);

  assert.equal(payload.messages.length, 2);
  assert.equal(payload.messages[0].sender, 'user');
  assert.equal(payload.messages[0].isAdmin, false);
  assert.equal(payload.messages[0].isAi, false);

  assert.equal(payload.messages[1].sender, 'ai_agent');
  assert.equal(payload.messages[1].isAdmin, true);
  assert.equal(payload.messages[1].isAi, true);

  assert.equal(payload.account_context.name, 'Rahim Uddin');
  assert.equal(payload.account_context.phone, '+8801711223344');
});
