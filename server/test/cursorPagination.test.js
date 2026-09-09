import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { encodeCursor, decodeCursor } from '../src/utils/cursorPagination.js';

test('encodeCursor and decodeCursor encode and decode valid ObjectIds', () => {
  const objectId = new mongoose.Types.ObjectId().toString();
  const encoded = encodeCursor(objectId);
  assert.equal(typeof encoded, 'string');
  assert.notEqual(encoded, objectId);

  const decoded = decodeCursor(encoded);
  assert.ok(decoded);
  assert.equal(decoded.id, objectId);
});

test('decodeCursor handles raw ObjectId string fallback safely', () => {
  const objectId = new mongoose.Types.ObjectId().toString();
  const decoded = decodeCursor(objectId);
  assert.ok(decoded);
  assert.equal(decoded.id, objectId);
});

test('decodeCursor returns null for null, empty or invalid cursor', () => {
  assert.equal(decodeCursor(null), null);
  assert.equal(decodeCursor(''), null);
  assert.equal(decodeCursor('not-a-valid-cursor'), null);
});
