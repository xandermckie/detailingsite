const crypto = require('crypto');

let auditDb = null;

function setAuditDb(db) {
  auditDb = db;
}

function secureCompare(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function logAuthFailure(req) {
  if (!auditDb) return;
  try {
    await auditDb.run(
      `INSERT INTO audit_log (action, booking_id, admin_ip) VALUES (?, ?, ?)`,
      ['ADMIN_AUTH_FAILED', null, req.ip]
    );
  } catch (err) {
    console.error('Failed to log admin auth failure:', err.message);
  }
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
    logAuthFailure(req).finally(() => {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    });
    return;
  }
  next();
}

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

module.exports = { requireAdmin, isValidUUID, secureCompare, setAuditDb };
