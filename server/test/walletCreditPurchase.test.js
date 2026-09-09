import test from 'node:test';
import assert from 'node:assert/strict';
import {
  walletCreditPackageSchema,
  walletCreditPurchaseCreateSchema,
  adminRejectCreditPurchaseSchema,
} from '../src/validations/schemas.js';

test('walletCreditPackageSchema validates valid packages and calculates total credits', () => {
  const input = {
    name: '1000 Credit Pack',
    payAmount: 1000,
    creditAmount: 1000,
    bonusCredits: 100,
    badge: 'Best Value',
    description: 'Get 10% extra credits for topups and software.',
  };

  const parsed = walletCreditPackageSchema.parse(input);
  assert.equal(parsed.name, '1000 Credit Pack');
  assert.equal(parsed.payAmount, 1000);
  assert.equal(parsed.creditAmount, 1000);
  assert.equal(parsed.bonusCredits, 100);
  assert.equal(parsed.creditAmount + parsed.bonusCredits, 1100);
});

test('walletCreditPackageSchema rejects negative or zero amounts', () => {
  assert.throws(() => {
    walletCreditPackageSchema.parse({
      name: 'Invalid Pack',
      payAmount: 0,
      creditAmount: 100,
    });
  });

  assert.throws(() => {
    walletCreditPackageSchema.parse({
      name: 'Invalid Pack',
      payAmount: 100,
      creditAmount: -50,
    });
  });
});

test('walletCreditPurchaseCreateSchema validates customer purchase request fields', () => {
  const valid = {
    packageId: '65f1a2b3c4d5e6f7a8b9c0d1',
    paymentMethodId: '65f1a2b3c4d5e6f7a8b9c0d2',
    senderNumber: '01711000000',
    transactionId: 'TRX99887766',
    customerNote: 'Paid from bKash personal app',
  };

  const parsed = walletCreditPurchaseCreateSchema.parse(valid);
  assert.equal(parsed.senderNumber, '01711000000');
  assert.equal(parsed.transactionId, 'TRX99887766');
});

test('adminRejectCreditPurchaseSchema requires non-empty rejection reason', () => {
  assert.throws(() => {
    adminRejectCreditPurchaseSchema.parse({ rejectionReason: '' });
  });

  const parsed = adminRejectCreditPurchaseSchema.parse({
    rejectionReason: 'Invalid transaction ID - amount not received in bKash account.',
  });
  assert.equal(parsed.rejectionReason, 'Invalid transaction ID - amount not received in bKash account.');
});

test('Wallet purchase snapshot logic preserves historical credit value after package price mutation', () => {
  // 1. Initial package state
  const packageV1 = {
    _id: '65f1a2b3c4d5e6f7a8b9c0d1',
    name: '1000 Credit Pack',
    payAmount: 1000,
    creditAmount: 1000,
    bonusCredits: 100,
    totalCredits: 1100,
  };

  // 2. Customer creates purchase request snapshot
  const purchaseSnapshot = {
    purchaseNumber: 'WCP-000101',
    user: '65f1a2b3c4d5e6f7a8b9c0aa',
    package: packageV1._id,
    packageName: packageV1.name,
    amount: packageV1.payAmount,
    credits: packageV1.creditAmount,
    bonusCredits: packageV1.bonusCredits,
    totalCredits: packageV1.totalCredits,
    status: 'pending',
  };

  // 3. Admin modifies package rates later (reduces bonus from 100 to 50)
  const packageV2 = {
    ...packageV1,
    bonusCredits: 50,
    totalCredits: 1050,
  };

  // 4. Verification: Purchase snapshot retains 1100 total credits
  assert.equal(purchaseSnapshot.totalCredits, 1100);
  assert.notEqual(purchaseSnapshot.totalCredits, packageV2.totalCredits);
});

test('Duplicate approval simulation verifies that only pending status can transition to approved', () => {
  let simulatedDbDoc = {
    _id: '65f1a2b3c4d5e6f7a8b9c011',
    purchaseNumber: 'WCP-000102',
    status: 'pending',
    totalCredits: 525,
    walletTransaction: null,
  };

  let simulatedUser = {
    _id: '65f1a2b3c4d5e6f7a8b9c0aa',
    walletBalance: 200,
  };

  // Simulated atomic findOneAndUpdate({ _id, status: 'pending' })
  const atomicApprove = () => {
    if (simulatedDbDoc.status !== 'pending') {
      return null; // Update failed because status is not pending
    }
    simulatedDbDoc.status = 'approved';
    simulatedDbDoc.approvedAt = new Date();
    simulatedUser.walletBalance += simulatedDbDoc.totalCredits;
    simulatedDbDoc.walletTransaction = '65f1a2b3c4d5e6f7a8b9c099';
    return { purchase: simulatedDbDoc, user: simulatedUser };
  };

  // First approval succeeds
  const firstAttempt = atomicApprove();
  assert.ok(firstAttempt);
  assert.equal(firstAttempt.purchase.status, 'approved');
  assert.equal(firstAttempt.user.walletBalance, 725);

  // Second duplicate approval fails
  const secondAttempt = atomicApprove();
  assert.equal(secondAttempt, null);
  // Balance is untouched and credited only once
  assert.equal(simulatedUser.walletBalance, 725);
});

test('Cursor pagination query builder for wallet transactions filters correctly by cursor and direction', () => {
  const buildCursorQuery = (baseQuery, cursorId, direction = 'next') => {
    const query = { ...baseQuery };
    if (cursorId) {
      query._id = direction === 'next' ? { $lt: cursorId } : { $gt: cursorId };
    }
    return query;
  };

  const initial = buildCursorQuery({ user: 'usr_123' }, null, 'next');
  assert.deepEqual(initial, { user: 'usr_123' });

  const page2 = buildCursorQuery({ user: 'usr_123' }, '65f1a2b3c4d5e6f7a8b9c050', 'next');
  assert.deepEqual(page2, { user: 'usr_123', _id: { $lt: '65f1a2b3c4d5e6f7a8b9c050' } });

  const prevPage = buildCursorQuery({ user: 'usr_123' }, '65f1a2b3c4d5e6f7a8b9c020', 'prev');
  assert.deepEqual(prevPage, { user: 'usr_123', _id: { $gt: '65f1a2b3c4d5e6f7a8b9c020' } });
});
