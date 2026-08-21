import ApiError from '../utils/ApiError.js';

const formatIssues = (issues) => issues.map((issue) => ({
  path: issue.path.join('.'),
  message: issue.message,
}));

export const validateBody = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return next(new ApiError(422, 'Validation failed', formatIssues(parsed.error.issues)));
  req.body = parsed.data;
  return next();
};

export const validateQuery = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return next(new ApiError(422, 'Invalid query parameters', formatIssues(parsed.error.issues)));
  req.query = parsed.data;
  return next();
};
