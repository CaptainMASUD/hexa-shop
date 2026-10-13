import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFraudBlock } from '../src/middleware/fraudDetection.js';
import FraudBlock from '../src/models/FraudBlock.js';

test('checkFraudBlock blocks requests when IP is blacklisted, including IPv6-mapped IPv4', async () => {
  const originalFindOne = FraudBlock.findOne;
  let queryCaptured = null;
  let savedCalled = false;

  FraudBlock.findOne = async (query) => {
    queryCaptured = query;
    return {
      _id: 'block-1',
      type: 'ip',
      value: '103.204.1.5',
      reason: 'DDoS / Bot abuse',
      blockedCount: 2,
      save: async () => { savedCalled = true; },
    };
  };

  try {
    const req = {
      headers: { 'x-forwarded-for': '::ffff:103.204.1.5' },
      body: {},
      socket: {},
    };
    let errorCaught = null;
    await checkFraudBlock(req, {}, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught, 'Should return an error');
    assert.equal(errorCaught.statusCode, 403);
    assert.ok(errorCaught.message.includes('DDoS / Bot abuse'));
    assert.equal(savedCalled, true, 'Should increment blockedCount');

    // Assert that candidates contained both ::ffff:103.204.1.5 and 103.204.1.5
    const ipCandidates = queryCaptured.$or.filter((c) => c.type === 'ip').map((c) => c.value);
    assert.ok(ipCandidates.includes('::ffff:103.204.1.5'));
    assert.ok(ipCandidates.includes('103.204.1.5'));
  } finally {
    FraudBlock.findOne = originalFindOne;
  }
});

test('checkFraudBlock detects blacklisted customer phone in orders or senderNumber with BD variations', async () => {
  const originalFindOne = FraudBlock.findOne;
  let queryCaptured = null;

  FraudBlock.findOne = async (query) => {
    queryCaptured = query;
    return {
      _id: 'block-2',
      type: 'phone',
      value: '01700000000',
      reason: 'Payment chargeback scammer',
      blockedCount: 0,
      save: async () => {},
    };
  };

  try {
    const req = {
      headers: {},
      body: {
        customer: { email: 'innocent@gmail.com', phone: '01811111111' },
        senderNumber: '+8801700000000', // Used blacklisted bKash sender number
      },
      socket: {},
    };
    let errorCaught = null;
    await checkFraudBlock(req, {}, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught, 'Should block request');
    assert.equal(errorCaught.statusCode, 403);
    assert.ok(errorCaught.message.includes('Payment chargeback scammer'));

    // Check that phone candidates contained both raw and normalized variations
    const phoneCandidates = queryCaptured.$or.filter((c) => c.type === 'phone').map((c) => c.value);
    assert.ok(phoneCandidates.includes('+8801700000000'));
    assert.ok(phoneCandidates.includes('01700000000'));
  } finally {
    FraudBlock.findOne = originalFindOne;
  }
});

test('checkFraudBlock blocks checkout when customer.email is on the blacklist', async () => {
  const originalFindOne = FraudBlock.findOne;

  FraudBlock.findOne = async () => ({
    _id: 'block-3',
    type: 'email',
    value: 'spammer@evil.com',
    reason: 'Fraudulent transactions',
    blockedCount: 5,
    save: async () => {},
  });

  try {
    const req = {
      headers: {},
      body: {
        customer: { email: 'spammer@evil.com', phone: '01799999999' },
      },
      socket: {},
    };
    let errorCaught = null;
    await checkFraudBlock(req, {}, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught);
    assert.equal(errorCaught.statusCode, 403);
    assert.ok(errorCaught.message.includes('Fraudulent transactions'));
  } finally {
    FraudBlock.findOne = originalFindOne;
  }
});

test('checkFraudBlock allows clean request to pass through to next()', async () => {
  const originalFindOne = FraudBlock.findOne;

  FraudBlock.findOne = async () => null; // No match

  try {
    const req = {
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: { email: 'legitimate@user.com' },
      socket: {},
    };
    let nextCalled = false;
    let errorPassed = null;
    await checkFraudBlock(req, {}, (err) => {
      nextCalled = true;
      errorPassed = err;
    });

    assert.equal(nextCalled, true);
    assert.equal(errorPassed, undefined);
  } finally {
    FraudBlock.findOne = originalFindOne;
  }
});
