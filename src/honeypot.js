const HONEYPOT_FIELD = 'website';

function rejectHoneypot(req, res, next) {
  const value = typeof req.body[HONEYPOT_FIELD] === 'string'
    ? req.body[HONEYPOT_FIELD].trim()
    : '';

  if (value) {
    return res.status(400).json({
      success: false,
      message: 'Invalid submission'
    });
  }

  delete req.body[HONEYPOT_FIELD];
  next();
}

module.exports = { rejectHoneypot, HONEYPOT_FIELD };
