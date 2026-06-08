function createRateLimiter({ maxRequests, windowMs, message }) {
  const counts = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!counts.has(ip)) {
      counts.set(ip, []);
    }

    const timestamps = counts.get(ip).filter((ts) => ts > windowStart);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.'
      });
    }

    timestamps.push(now);
    counts.set(ip, timestamps);
    next();
  };
}

module.exports = { createRateLimiter };
