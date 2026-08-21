import AuditLog from '../models/AuditLog.js';

export const writeAudit = async (req, action, resourceType, resourceId = null, metadata = {}) => {
  const safeMetadata = { ...metadata };
  for (const key of ['password', 'adminCode', 'token', 'refreshToken', 'credentials', 'delivery']) delete safeMetadata[key];
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      action,
      resourceType,
      resourceId,
      metadata: safeMetadata,
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
};
