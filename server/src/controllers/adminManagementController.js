import User from '../models/User.js';
import Role from '../models/Role.js';
import Session from '../models/Session.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { writeAudit } from '../services/auditService.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';

/**
 * List all Admin accounts with cursor pagination, role population & search
 */
export const listAdmins = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = { role: 'admin' };

  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.active === 'false') filter.isActive = false;

  if (req.query.q && req.query.q.trim()) {
    const regex = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { username: regex }, { phone: regex }];
  }

  const result = await paginateWithCursor(User, filter, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    select: '-password -twoFactorSecret -emailVerificationToken -passwordResetToken',
    populate: [{ path: 'roleRef', select: 'name slug permissions active' }],
    includeTotal: true,
  });

  return success(res, result);
});

/**
 * Get single admin profile details
 */
export const getAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: 'admin' })
    .select('-password -twoFactorSecret -emailVerificationToken -passwordResetToken')
    .populate('roleRef', 'name slug permissions active')
    .lean();

  if (!admin) {
    throw new ApiError(404, 'Administrator account not found');
  }

  const activeSessionsCount = await Session.countDocuments({ user: admin._id, revokedAt: null });

  return success(res, {
    data: {
      ...admin,
      activeSessionsCount,
    },
  });
});

/**
 * Create a new Administrator account
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const username = String(req.body.username).trim().toLowerCase();
  const email = String(req.body.email).trim().toLowerCase();

  const existing = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existing) {
    throw new ApiError(
      409,
      existing.username === username
        ? 'An administrator with this username already exists'
        : 'An account with this email already exists'
    );
  }

  let roleRef = null;
  let permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];

  if (req.body.roleId) {
    const roleDoc = await Role.findById(req.body.roleId);
    if (roleDoc) {
      roleRef = roleDoc._id;
      // Inherit permissions from role if not explicitly provided
      if (!permissions.length) {
        permissions = roleDoc.permissions || [];
      }
    }
  }

  const admin = await User.create({
    name: req.body.name,
    username,
    email,
    password: req.body.password,
    phone: req.body.phone || '',
    role: 'admin',
    roleRef,
    permissions,
    isActive: req.body.isActive !== false,
    isEmailVerified: true,
  });

  await writeAudit(req, 'admin_created', 'User', admin._id, {
    username,
    email,
    roleId: roleRef,
  });

  const created = await User.findById(admin._id)
    .select('-password -twoFactorSecret -emailVerificationToken -passwordResetToken')
    .populate('roleRef', 'name slug permissions active')
    .lean();

  return success(res, {
    status: 201,
    message: `Administrator @${admin.username} created successfully`,
    data: created,
  });
});

/**
 * Update an Administrator's details, role, permissions, status, or password
 */
export const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: 'admin' }).select('+password');
  if (!admin) {
    throw new ApiError(404, 'Administrator account not found');
  }

  const isSelf = String(admin._id) === String(req.user._id);

  // Master Admin Protection Guards
  if (admin.isMasterAdmin) {
    if (req.body.isActive === false) {
      throw new ApiError(403, 'The Master Administrator account cannot be deactivated.');
    }
  }

  // Self Deactivation Guard
  if (isSelf && req.body.isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own administrator account.');
  }

  // Unique email check if changing email
  if (req.body.email) {
    const newEmail = String(req.body.email).trim().toLowerCase();
    if (newEmail !== admin.email) {
      const emailTaken = await User.findOne({ email: newEmail, _id: { $ne: admin._id } });
      if (emailTaken) {
        throw new ApiError(409, 'This email address is already in use by another account.');
      }
      admin.email = newEmail;
    }
  }

  if (req.body.name !== undefined) admin.name = String(req.body.name).trim();
  if (req.body.phone !== undefined) admin.phone = String(req.body.phone).trim();
  if (req.body.isActive !== undefined && !admin.isMasterAdmin && !isSelf) {
    admin.isActive = Boolean(req.body.isActive);
  }

  // Custom Role & Permissions Update (if not master admin)
  if (!admin.isMasterAdmin) {
    if (req.body.roleId !== undefined) {
      if (req.body.roleId) {
        const roleDoc = await Role.findById(req.body.roleId);
        if (roleDoc) {
          admin.roleRef = roleDoc._id;
          if (req.body.permissions === undefined) {
            admin.permissions = roleDoc.permissions || [];
          }
        }
      } else {
        admin.roleRef = null;
      }
    }

    if (Array.isArray(req.body.permissions)) {
      admin.permissions = req.body.permissions;
    }
  }

  // Password reset if requested
  let passwordUpdated = false;
  if (req.body.password && String(req.body.password).trim().length > 0) {
    admin.password = String(req.body.password).trim();
    passwordUpdated = true;
  }

  await admin.save();

  // If password was updated or admin was deactivated, revoke all their active sessions
  if (passwordUpdated || admin.isActive === false) {
    await Session.updateMany({ user: admin._id, revokedAt: null }, { revokedAt: new Date() });
  }

  await writeAudit(req, 'admin_updated', 'User', admin._id, {
    username: admin.username,
    passwordUpdated,
    isActive: admin.isActive,
  });

  const updated = await User.findById(admin._id)
    .select('-password -twoFactorSecret -emailVerificationToken -passwordResetToken')
    .populate('roleRef', 'name slug permissions active')
    .lean();

  return success(res, {
    message: `Administrator @${admin.username} updated successfully`,
    data: updated,
  });
});

/**
 * Delete / Remove an Administrator
 */
export const deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!admin) {
    throw new ApiError(404, 'Administrator account not found');
  }

  if (admin.isMasterAdmin) {
    throw new ApiError(403, 'The Master Administrator account cannot be deleted.');
  }

  if (String(admin._id) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own administrator account.');
  }

  // Revoke all sessions before deleting
  await Session.updateMany({ user: admin._id, revokedAt: null }, { revokedAt: new Date() });
  await User.deleteOne({ _id: admin._id });

  await writeAudit(req, 'admin_deleted', 'User', admin._id, {
    username: admin.username,
    email: admin.email,
  });

  return success(res, {
    message: `Administrator @${admin.username} has been permanently deleted.`,
  });
});
