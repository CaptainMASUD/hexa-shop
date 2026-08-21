export const success = (res, { status = 200, message = 'Success', data = null, meta = undefined } = {}) =>
  res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });
