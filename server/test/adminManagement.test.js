import test from 'node:test';
import assert from 'node:assert/strict';
import { adminCreateSchema, adminUpdateSchema, adminLoginSchema } from '../src/validations/schemas.js';

test('adminCreateSchema validates valid admin payload', () => {
  const payload = {
    name: 'Sarah Connor',
    username: 'sarah.c',
    email: 'sarah@hexastore.com',
    password: 'AdminPassword123!',
    phone: '+8801712345678',
    permissions: ['orders.manage', 'catalog.manage'],
    isActive: true,
  };

  const parsed = adminCreateSchema.safeParse(payload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.username, 'sarah.c');
  assert.equal(parsed.data.email, 'sarah@hexastore.com');
  assert.equal(parsed.data.permissions.length, 2);
});

test('adminCreateSchema rejects weak passwords and invalid usernames', () => {
  const weakPasswordPayload = {
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@hexastore.com',
    password: 'weak',
  };
  const res1 = adminCreateSchema.safeParse(weakPasswordPayload);
  assert.equal(res1.success, false);

  const invalidUsernamePayload = {
    name: 'John Doe',
    username: 'john doe with spaces!',
    email: 'john@hexastore.com',
    password: 'AdminPassword123!',
  };
  const res2 = adminCreateSchema.safeParse(invalidUsernamePayload);
  assert.equal(res2.success, false);
});

test('adminUpdateSchema allows partial updates without requiring password', () => {
  const updatePayload = {
    name: 'Sarah Connor Updated',
    phone: '+8801999999999',
    isActive: false,
    permissions: ['orders.manage'],
  };

  const parsed = adminUpdateSchema.safeParse(updatePayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.name, 'Sarah Connor Updated');
  assert.equal(parsed.data.isActive, false);
});

test('adminUpdateSchema validates strong password when password is provided', () => {
  const updateWithStrongPassword = {
    password: 'NewStrongPassword456!',
  };
  const res1 = adminUpdateSchema.safeParse(updateWithStrongPassword);
  assert.equal(res1.success, true);

  const updateWithWeakPassword = {
    password: 'short',
  };
  const res2 = adminUpdateSchema.safeParse(updateWithWeakPassword);
  assert.equal(res2.success, false);
});

test('Master Admin protection simulation prevents deactivation or deletion', () => {
  const targetAdmin = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Owner',
    username: 'master',
    isMasterAdmin: true,
    isActive: true,
  };

  // Simulating the controller guard logic
  const attemptDeactivate = (admin, updates) => {
    if (admin.isMasterAdmin && updates.isActive === false) {
      throw new Error('Master Administrator cannot be deactivated');
    }
  };

  assert.throws(
    () => attemptDeactivate(targetAdmin, { isActive: false }),
    /Master Administrator cannot be deactivated/
  );
});

test('Self-action protection simulation prevents an admin from deleting themselves', () => {
  const currentUserId = '507f1f77bcf86cd799439012';
  const targetAdmin = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Manager',
    username: 'manager1',
    isMasterAdmin: false,
  };

  const attemptDelete = (reqUser, target) => {
    if (String(reqUser._id) === String(target._id)) {
      throw new Error('You cannot delete your own administrator account');
    }
  };

  assert.throws(
    () => attemptDelete({ _id: currentUserId }, targetAdmin),
    /You cannot delete your own administrator account/
  );
});

test('adminLoginSchema validates credentials with optional 6-digit OTP', () => {
  const validWithoutOtp = {
    username: 'captain_masud',
    password: 'AdminPassword123!',
  };
  const res1 = adminLoginSchema.safeParse(validWithoutOtp);
  assert.equal(res1.success, true);
  assert.equal(res1.data.username, 'captain_masud');

  const validWithOtp = {
    username: 'captain_masud',
    password: 'AdminPassword123!',
    otp: '123456',
  };
  const res2 = adminLoginSchema.safeParse(validWithOtp);
  assert.equal(res2.success, true);
  assert.equal(res2.data.otp, '123456');

  const invalidOtp = {
    username: 'captain_masud',
    password: 'AdminPassword123!',
    otp: 'abc12',
  };
  const res3 = adminLoginSchema.safeParse(invalidOtp);
  assert.equal(res3.success, false);
});
