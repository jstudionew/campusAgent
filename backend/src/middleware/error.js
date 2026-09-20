export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
};

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const payload = {
    message: err.message || 'Internal Server Error',
  };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    // Also log the error to the console in development for quick diagnosis
    // This will reveal DB errors like undefined_table, not_null_violation, etc.
    console.error('API error:', err);
    payload.stack = err.stack;
    // Surface useful DB error fields for debugging in development
    if (err.code) payload.code = err.code;
    if (err.detail) payload.detail = err.detail;
    if (err.schema) payload.schema = err.schema;
    if (err.table) payload.table = err.table;
    if (err.constraint) payload.constraint = err.constraint;
  }
  if (err.errors) payload.errors = err.errors;
  res.status(status).json(payload);
};
