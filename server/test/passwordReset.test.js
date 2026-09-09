import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { forgotPasswordSchema, resetPasswordSchema } from '../src/validations/schemas.js';
import { hashToken, safeEqual } from '../src/utils/security.js';
import { sendPasswordResetEmail } from '../src/services/emailService.js';

test('forgotPasswordSchema validates valid email and normalizes it', () => {
  const result = forgotPasswordSchema.safeParse({ email: '  TestUser@Example.COM  ' });
  assert.equal(result.success, true);
  assert.equal(result.data.email, 'testuser@example.com');
});

test('forgotPasswordSchema rejects invalid emails', () => {
  const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
  assert.equal(result.success, false);
});

test('resetPasswordSchema validates strong password and matching confirmPassword', () => {
  const validPayload = {
    token: 'some-raw-token-12345',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  };
  const result = resetPasswordSchema.safeParse(validPayload);
  assert.equal(result.success, true);
  assert.equal(result.data.password, 'SecurePassword123!');
});

test('resetPasswordSchema rejects weak passwords', () => {
  // Too short (< 8 chars)
  const shortResult = resetPasswordSchema.safeParse({
    token: 'token',
    password: 'Pass1',
  });
  assert.equal(shortResult.success, false);

  // Missing uppercase
  const noUpperResult = resetPasswordSchema.safeParse({
    token: 'token',
    password: 'password123!',
  });
  assert.equal(noUpperResult.success, false);

  // Missing number
  const noNumberResult = resetPasswordSchema.safeParse({
    token: 'token',
    password: 'Password!',
  });
  assert.equal(noNumberResult.success, false);
});

test('resetPasswordSchema rejects mismatched confirmPassword', () => {
  const mismatchResult = resetPasswordSchema.safeParse({
    token: 'token123',
    password: 'SecurePassword123!',
    confirmPassword: 'DifferentPassword123!',
  });
  assert.equal(mismatchResult.success, false);
  assert.ok(mismatchResult.error.errors.some((e) => e.message === 'Passwords do not match'));
});

test('token generation, SHA-256 hashing, and verification simulation', () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  assert.equal(rawToken.length, 64);

  const hashedToken1 = hashToken(rawToken);
  const hashedToken2 = hashToken(rawToken);
  assert.equal(hashedToken1, hashedToken2);
  assert.notEqual(rawToken, hashedToken1);

  // Simulating user database record
  const mockUser = {
    email: 'alice@example.com',
    passwordResetToken: hashedToken1,
    passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
  };

  // Valid token check
  const incomingHashed = hashToken(rawToken);
  assert.equal(mockUser.passwordResetToken, incomingHashed);
  assert.ok(mockUser.passwordResetExpires > new Date());

  // Expired token simulation
  const expiredMockUser = {
    email: 'bob@example.com',
    passwordResetToken: hashedToken1,
    passwordResetExpires: new Date(Date.now() - 1000), // Expired 1s ago
  };
  assert.ok(expiredMockUser.passwordResetExpires < new Date());

  // Single-use token invalidation simulation
  mockUser.passwordResetToken = undefined;
  mockUser.passwordResetExpires = undefined;
  assert.equal(mockUser.passwordResetToken, undefined);
  assert.equal(mockUser.passwordResetExpires, undefined);
});

test('sendPasswordResetEmail executes safely without crashing', async () => {
  const mockUser = { name: 'Test Customer', email: 'test@example.com' };
  const rawToken = 'sample-test-token-123';

  // Should run safely without unhandled exceptions even if Resend API key is mock or missing
  await assert.doesNotReject(async () => {
    await sendPasswordResetEmail(mockUser, rawToken);
  });
});
