import test from 'node:test';
import assert from 'node:assert/strict';
import { profileSchema } from '../src/validations/schemas.js';

test('profileSchema validates valid profile payload with optional avatar', () => {
  const payloadWithAvatar = {
    name: 'Jane Doe',
    phone: '+8801700000000',
    avatar: {
      url: 'https://res.cloudinary.com/hexa/image/upload/v123456/hexa/avatars/users/user123.jpg',
      publicId: 'hexa/avatars/users/user123',
    },
  };

  const parsed = profileSchema.parse(payloadWithAvatar);
  assert.equal(parsed.name, 'Jane Doe');
  assert.equal(parsed.phone, '+8801700000000');
  assert.equal(parsed.avatar?.url, payloadWithAvatar.avatar.url);
  assert.equal(parsed.avatar?.publicId, payloadWithAvatar.avatar.publicId);
});

test('profileSchema validates profile payload without avatar (backward compatible)', () => {
  const payloadWithoutAvatar = {
    name: 'John Doe',
    phone: '01800000000',
  };

  const parsed = profileSchema.parse(payloadWithoutAvatar);
  assert.equal(parsed.name, 'John Doe');
  assert.equal(parsed.phone, '01800000000');
  assert.equal(parsed.avatar, undefined);
});

test('User avatar lifecycle simulation handles replacement and removal', () => {
  const mockUser = {
    _id: 'user_123',
    name: 'Captain Masud',
    role: 'admin',
    avatar: { url: '', publicId: '' },
  };

  // 1. Initial avatar upload
  const uploaded1 = {
    url: 'https://res.cloudinary.com/hexa/avatars/admins/admin_photo_1.png',
    publicId: 'hexa/avatars/admins/admin_photo_1',
  };
  mockUser.avatar = uploaded1;
  assert.equal(mockUser.avatar.publicId, 'hexa/avatars/admins/admin_photo_1');

  // 2. Avatar replacement - record old publicId for Cloudinary deletion
  const oldPublicId = mockUser.avatar.publicId;
  const uploaded2 = {
    url: 'https://res.cloudinary.com/hexa/avatars/admins/admin_photo_2.png',
    publicId: 'hexa/avatars/admins/admin_photo_2',
  };
  mockUser.avatar = uploaded2;
  assert.equal(oldPublicId, 'hexa/avatars/admins/admin_photo_1');
  assert.equal(mockUser.avatar.publicId, 'hexa/avatars/admins/admin_photo_2');

  // 3. Avatar removal
  mockUser.avatar = { url: '', publicId: '' };
  assert.equal(mockUser.avatar.url, '');
  assert.equal(mockUser.avatar.publicId, '');
});
