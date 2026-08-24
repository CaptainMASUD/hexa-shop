import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDynamicCustomerInputs } from '../src/utils/dynamicFieldValidator.js';
import { providerFactory } from '../src/services/fulfillment/ProviderAdapterFactory.js';

test('dynamic customer input validator correctly validates required and typed fields', () => {
  const fields = [
    { name: 'userId', label: 'User ID', type: 'text', required: true, validation: { minLength: 6 } },
    { name: 'zoneId', label: 'Zone ID', type: 'number', required: true, validation: { min: 1000, max: 99999 } },
    { name: 'email', label: 'Account Email', type: 'email', required: false },
    { name: 'server', label: 'Server Region', type: 'select', required: true, options: ['Asia', 'America', 'Europe'] },
  ];

  // Missing required field
  assert.throws(() => {
    validateDynamicCustomerInputs(fields, { zoneId: 2045, server: 'Asia' }, { strict: true });
  }, /User ID is required/);

  // minLength failure
  assert.throws(() => {
    validateDynamicCustomerInputs(fields, { userId: '123', zoneId: 2045, server: 'Asia' }, { strict: true });
  }, /User ID must be at least 6 characters/);

  // Invalid email failure
  assert.throws(() => {
    validateDynamicCustomerInputs(fields, { userId: '12345678', zoneId: 2045, email: 'not-an-email', server: 'Asia' }, { strict: true });
  }, /Account Email must be a valid email address/);

  // Invalid select option failure
  assert.throws(() => {
    validateDynamicCustomerInputs(fields, { userId: '12345678', zoneId: 2045, server: 'Antarctica' }, { strict: true });
  }, /Please select a valid option for Server Region/);

  // Valid inputs
  const result = validateDynamicCustomerInputs(fields, {
    userId: '12345678',
    zoneId: '2045',
    email: 'PLAYER@EXAMPLE.COM',
    server: 'Asia',
  }, { strict: true });

  assert.equal(result.valid, true);
  assert.equal(result.sanitizedInputs.userId, '12345678');
  assert.equal(result.sanitizedInputs.zoneId, 2045);
  assert.equal(result.sanitizedInputs.email, 'player@example.com');
  assert.equal(result.sanitizedInputs.server, 'Asia');
  assert.equal(result.fieldSnapshots.length, 4);
});

test('provider adapter factory retrieves registered top-up adapters and processes top-ups', async () => {
  const adapter = providerFactory.get('mock');
  assert.ok(adapter);

  const res = await adapter.processTopUp({
    order: { orderNumber: 'HEXA-2026-000001' },
    item: { productName: 'Mobile Legends', variantName: '86 Diamonds', variantSku: 'ML_86' },
    accountInfo: { userId: '12345678', zoneId: '2045' },
    config: { serviceCode: 'ML_86' },
  });

  assert.equal(res.success, true);
  assert.ok(res.referenceId.startsWith('MOCK-TXN-'));
});
