import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  const filter = {};
  if (req.query.action && req.query.action.trim()) filter.action = req.query.action.trim();
  if (req.query.resourceType && req.query.resourceType.trim()) filter.resourceType = req.query.resourceType.trim();

  const result = await paginateWithCursor(AuditLog, filter, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    populate: { path: 'actor', select: 'name email role' },
    includeTotal: true,
  });

  return success(res, result);
});
