/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints
 */

const loginAttempts = new Map();
const passwordResetAttempts = new Map();

// Periodic cleanup of stale tracker entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now > data.resetTime) {
      loginAttempts.delete(key);
    }
  }
  for (const [key, data] of passwordResetAttempts.entries()) {
    if (now > data.resetTime) {
      passwordResetAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Rate limit login failures per IP / account
 * 5 failed attempts per 15 minutes
 */
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const email = (req.body?.email || '').toLowerCase().trim();
  const key = `${ip}:${email}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = loginAttempts.get(key);

  if (record) {
    if (now < record.resetTime) {
      if (record.count >= maxAttempts) {
        const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          message: `Too many failed login attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`
        });
      }
    } else {
      // Window expired, reset
      loginAttempts.set(key, { count: 0, resetTime: now + windowMs });
    }
  } else {
    loginAttempts.set(key, { count: 0, resetTime: now + windowMs });
  }

  // Helper to record a failure or clear upon success
  req.recordLoginFailure = () => {
    const cur = loginAttempts.get(key) || { count: 0, resetTime: now + windowMs };
    cur.count += 1;
    loginAttempts.set(key, cur);
  };

  req.recordLoginSuccess = () => {
    loginAttempts.delete(key);
  };

  next();
};

/**
 * Rate limit password reset requests
 * Max 5 requests per hour per email
 */
const passwordResetLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const email = (req.body?.email || '').toLowerCase().trim();
  const key = email ? `email:${email}` : `ip:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 5;

  const record = passwordResetAttempts.get(key);

  if (record) {
    if (now < record.resetTime) {
      if (record.count >= maxRequests) {
        const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          message: 'Too many password reset requests. Please check your inbox or try again in an hour.'
        });
      }
      record.count += 1;
    } else {
      passwordResetAttempts.set(key, { count: 1, resetTime: now + windowMs });
    }
  } else {
    passwordResetAttempts.set(key, { count: 1, resetTime: now + windowMs });
  }

  next();
};

module.exports = {
  loginRateLimiter,
  passwordResetLimiter
};
