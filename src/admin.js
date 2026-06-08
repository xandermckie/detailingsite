const crypto = require('crypto');

function secureCompare(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey) {
    return res.status(503).json({
      success: false,
      message: 'Admin access is not configured'
    });
  }

  const apiKey = req.headers['x-api-key'];
  if (!secureCompare(apiKey, expectedKey)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  next();
}

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

module.exports = { requireAdmin, isValidUUID, secureCompare };
