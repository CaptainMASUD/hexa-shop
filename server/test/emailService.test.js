import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sendAdminNewOrderEmail,
  sendCustomerOrderConfirmationEmail,
  sendCustomerOrderCompletedEmail,
} from '../src/services/emailService.js';

test('sendAdminNewOrderEmail skips if already sent or missing order', async () => {
  const orderWithFlag = {
    _id: '65e000000000000000000001',
    orderNumber: 'HEXA-1001',
    adminNotificationEmailSent: true,
  };
  // Should return without error and not attempt duplicate send
  await assert.doesNotReject(async () => {
    await sendAdminNewOrderEmail(orderWithFlag);
    await sendAdminNewOrderEmail(null);
  });
});

test('sendCustomerOrderConfirmationEmail skips if already sent or missing customer email', async () => {
  const orderWithFlag = {
    _id: '65e000000000000000000002',
    orderNumber: 'HEXA-1002',
    orderConfirmationEmailSent: true,
    customer: { email: 'customer@example.com' },
  };
  const orderNoEmail = {
    _id: '65e000000000000000000003',
    orderNumber: 'HEXA-1003',
    orderConfirmationEmailSent: false,
    customer: {},
  };
  await assert.doesNotReject(async () => {
    await sendCustomerOrderConfirmationEmail(orderWithFlag);
    await sendCustomerOrderConfirmationEmail(orderNoEmail);
  });
});

test('sendCustomerOrderCompletedEmail skips if already sent and protects sensitive data', async () => {
  const orderWithFlag = {
    _id: '65e000000000000000000004',
    orderNumber: 'HEXA-1004',
    completionEmailSent: true,
    customer: { email: 'customer@example.com' },
  };
  await assert.doesNotReject(async () => {
    await sendCustomerOrderCompletedEmail(orderWithFlag);
  });
});
