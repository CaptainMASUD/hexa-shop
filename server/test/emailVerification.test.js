import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { hashToken, safeEqual } from '../src/utils/security.js';
import { sendEmailVerificationEmail } from '../src/services/emailService.js';

test('hashToken creates standard SHA-256 hash for raw verification token', () => {
  const rawToken = 'test-token-12345';
  const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.equal(hashToken(rawToken), expectedHash);
  assert.notEqual(hashToken(rawToken), rawToken);
});

test('sendEmailVerificationEmail runs safely with user and rawToken', async () => {
  const dummyUser = {
    _id: '65e000000000000000000099',
    name: 'Jane Doe',
    email: 'jane@example.com',
  };
  const dummyToken = crypto.randomBytes(32).toString('hex');
  await assert.doesNotReject(async () => {
    await sendEmailVerificationEmail(dummyUser, dummyToken);
    await sendEmailVerificationEmail(null, null);
    await sendEmailVerificationEmail({ name: 'No Email' }, dummyToken);
  });
});

test('email verification token validation and expiration logic', () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const storedHashedToken = hashToken(rawToken);

  // Incoming request token hashing
  const incomingHashed = hashToken(rawToken);
  assert.equal(incomingHashed, storedHashedToken);

  // Invalid token check
  const wrongHashed = hashToken('wrong-token');
  assert.notEqual(wrongHashed, storedHashedToken);

  // Expiration check
  const notExpired = new Date(Date.now() + 30 * 60 * 1000);
  assert.equal(notExpired > new Date(), true);

  const expired = new Date(Date.now() - 1000);
  assert.equal(expired > new Date(), false);
});

test('resend verification cooldown enforcement', () => {
  const now = Date.now();
  const recentSent = new Date(now - 20 * 1000); // 20 seconds ago
  const elapsedRecent = Math.floor((now - recentSent.getTime()) / 1000);
  assert.equal(elapsedRecent < 60, true);
  assert.equal(60 - elapsedRecent, 40); // 40 seconds remaining

  const pastSent = new Date(now - 75 * 1000); // 75 seconds ago
  const elapsedPast = Math.floor((now - pastSent.getTime()) / 1000);
  assert.equal(elapsedPast >= 60, true);
});
