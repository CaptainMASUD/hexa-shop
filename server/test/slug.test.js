import test from 'node:test';
import assert from 'node:assert/strict';
import { toSlug } from '../src/utils/slug.js';

test('toSlug creates stable product/category slugs', () => {
  assert.equal(toSlug(' Netflix Premium 1 Month '), 'netflix-premium-1-month');
  assert.equal(toSlug('AI Tools & Software'), 'ai-tools-software');
});
