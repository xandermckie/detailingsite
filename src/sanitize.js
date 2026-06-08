const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function stripControlChars(value) {
  if (typeof value !== 'string') return value;
  return value.replace(CONTROL_CHAR_RE, '');
}

const BOOKING_FIELD_KEYS = [
  'firstName', 'lastName', 'email', 'phone', 'vehicle', 'address',
  'dropoffAddress', 'service', 'date', 'time', 'notes', 'privacyConsent'
];

function sanitizeBookingFields(body) {
  const stringFields = [
    'firstName', 'lastName', 'email', 'phone', 'vehicle',
    'address', 'dropoffAddress', 'date', 'time', 'notes'
  ];
  for (const key of stringFields) {
    if (typeof body[key] === 'string') {
      body[key] = stripControlChars(body[key]).trim();
    }
  }
  return body;
}

function rejectExtraFields(allowedKeys) {
  const allowed = new Set(allowedKeys);
  return (req, res, next) => {
    const extras = Object.keys(req.body).filter((key) => !allowed.has(key));
    if (extras.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request fields'
      });
    }
    next();
  };
}

module.exports = {
  stripControlChars,
  sanitizeBookingFields,
  rejectExtraFields,
  BOOKING_FIELD_KEYS
};
