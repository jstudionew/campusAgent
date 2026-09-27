export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
};

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const payload = {
    message: status >= 500 ? 'Internal Server Error' : (err.message || 'Request failed'),
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error('API error:', err.message || 'Unknown error');
    payload.stack = err.stack;
    if (err.code) payload.code = err.code;
    if (err.detail) payload.detail = err.detail;
    if (err.schema) payload.schema = err.schema;
    if (err.table) payload.table = err.table;
    if (err.constraint) payload.constraint = err.constraint;
  }

  if (err.errors) payload.errors = err.errors;
  res.status(status).json(payload);
};
