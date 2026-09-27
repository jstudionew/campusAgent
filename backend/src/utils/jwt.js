import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const getSecret = (name, devFallback) => {
  const value = process.env[name];
  if (value && String(value).trim()) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required production environment variable: ${name}`);
  }
  return devFallback || crypto.randomBytes(32).toString('hex');
};

export const signAccessToken = (payload, options = {}) => {
  const secret = getSecret('JWT_SECRET', 'local-dev-access-secret-change-me');
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(payload, secret, { expiresIn, ...options });
};

export const signRefreshToken = (payload, options = {}) => {
  const secret = getSecret('REFRESH_SECRET', 'local-dev-refresh-secret-change-me');
  const expiresIn = process.env.REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn, ...options });
};

export const verifyAccessToken = (token) => jwt.verify(token, getSecret('JWT_SECRET', 'local-dev-access-secret-change-me'));
export const verifyRefreshToken = (token) => jwt.verify(token, getSecret('REFRESH_SECRET', 'local-dev-refresh-secret-change-me'));
