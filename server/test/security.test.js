import test from 'node:test';
import assert from 'node:assert/strict';
import { safeEqual, hashToken } from '../src/utils/security.js';

test('safeEqual compares same-length secrets without ordinary equality', () => {
  assert.equal(safeEqual('admin-code', 'admin-code'), true);
  assert.equal(safeEqual('admin-code', 'other-code'), false);
});

test('hashToken is deterministic and does not return plaintext', () => {
  assert.equal(hashToken('refresh-token'), hashToken('refresh-token'));
  assert.notEqual(hashToken('refresh-token'), 'refresh-token');
});
