import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (process.env.NODE_ENV !== 'production') {
      // Minimal diagnostic logging
      console.warn('Validation failed', {
        url: req.originalUrl,
        method: req.method,
        errors: errors.array(),
        body: req.body,
        query: req.query,
      });
    }
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};
