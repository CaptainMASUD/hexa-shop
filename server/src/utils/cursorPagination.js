import mongoose from 'mongoose';

/**
 * Encode cursor into URL-safe base64 string
 */
export const encodeCursor = (id, extra = null) => {
  if (!id) return null;
  const payload = { id: String(id), ...(extra ? { extra } : {}) };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

/**
 * Decode cursor from URL-safe base64 or raw string
 */
export const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && mongoose.isValidObjectId(parsed.id)) {
      return parsed;
    }
  } catch {
    // Fallback: If raw ObjectId is provided
    if (mongoose.isValidObjectId(cursor)) {
      return { id: String(cursor) };
    }
  }
  return null;
};

/**
 * High-performance Keyset (Cursor-Based) Pagination for MongoDB Models
 *
 * @param {mongoose.Model} model - Mongoose model to query
 * @param {Object} filter - MongoDB filter object
 * @param {Object} options - Pagination options
 * @param {number} [options.limit=20] - Max items per page (1 to 100)
 * @param {string} [options.cursor] - Encoded cursor token
 * @param {'next'|'prev'} [options.direction='next'] - Pagination direction
 * @param {Object} [options.sort={ _id: -1 }] - Sort criteria (defaults to newest first)
 * @param {string|Object} [options.select] - Projection fields
 * @param {Array|Object|string} [options.populate] - Populate rules
 * @param {boolean} [options.lean=true] - Return plain JS objects for max speed
 * @param {boolean} [options.includeTotal=false] - Whether to perform countDocuments
 * @returns {Promise<{ data: Array, meta: Object }>}
 */
export const paginateWithCursor = async (model, filter = {}, options = {}) => {
  const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
  const direction = options.direction === 'prev' ? 'prev' : 'next';
  const cursorParam = options.cursor ? String(options.cursor).trim() : null;
  const decoded = decodeCursor(cursorParam);

  const queryFilter = { ...filter };

  if (decoded && decoded.id) {
    const cursorObjectId = new mongoose.Types.ObjectId(decoded.id);
    if (direction === 'next') {
      queryFilter._id = { ...queryFilter._id, $lt: cursorObjectId };
    } else {
      queryFilter._id = { ...queryFilter._id, $gt: cursorObjectId };
    }
  }

  const querySort = direction === 'prev' ? { _id: 1 } : { _id: -1 };

  let query = model.find(queryFilter).sort(querySort).limit(limit + 1);

  if (options.select) {
    query = query.select(options.select);
  }

  if (options.populate) {
    query = query.populate(options.populate);
  }

  if (options.lean !== false) {
    query = query.lean({ virtuals: options.virtuals || false });
  }

  const [rawItems, totalCount] = await Promise.all([
    query.exec(),
    options.includeTotal ? model.countDocuments(filter).exec() : Promise.resolve(undefined),
  ]);

  const hasMore = rawItems.length > limit;
  let items = hasMore ? rawItems.slice(0, limit) : rawItems;

  if (direction === 'prev') {
    items = items.reverse();
  }

  let hasNextPage = false;
  let hasPrevPage = false;

  if (direction === 'next') {
    hasNextPage = hasMore;
    hasPrevPage = Boolean(decoded);
  } else {
    hasNextPage = true;
    hasPrevPage = hasMore;
  }

  const firstItem = items[0];
  const lastItem = items[items.length - 1];

  const nextCursor = hasNextPage && lastItem ? encodeCursor(lastItem._id) : null;
  const prevCursor = hasPrevPage && firstItem ? encodeCursor(firstItem._id) : null;

  return {
    data: items,
    meta: {
      limit,
      count: items.length,
      hasNextPage,
      hasPrevPage,
      nextCursor,
      prevCursor,
      ...(totalCount !== undefined ? { total: totalCount } : {}),
    },
  };
};
