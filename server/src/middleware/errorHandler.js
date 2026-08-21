import mongoose from 'mongoose';
import { isProduction } from '../config/env.js';

export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.code === 11000) {
    status = 409;
    const key = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    message = `${key} already exists`;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    message = 'Validation failed';
    details = Object.values(err.errors || {}).map((error) => ({ path: error.path || '', message: error.message }));
  }
  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = 'Invalid resource identifier';
  }
  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded image is too large' : 'Invalid upload';
  }

  if (!isProduction && status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && isProduction ? 'Internal server error' : message,
    ...(details ? { details } : {}),
    ...(!isProduction && status >= 500 ? { stack: err.stack } : {}),
  });
};
