const { body, validationResult } = require('express-validator');
const {
  TIME_SLOTS,
  getChicagoTodayIso,
  isBookableDay
} = require('./bookingRules');

const VALID_SERVICES = ['mobile', 'pickup_dropoff'];
const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

const bookingValidationRules = () => {
  return [
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name contains invalid characters'),

    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name contains invalid characters'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail()
      .isLength({ max: 255 }).withMessage('Email too long'),

    body('phone')
      .trim()
      .notEmpty().withMessage('Phone is required')
      .matches(/^[\d\s\-()\.+]+$/).withMessage('Invalid phone number format')
      .isLength({ min: 10, max: 20 }).withMessage('Phone must be 10-20 characters'),

    body('vehicle')
      .trim()
      .notEmpty().withMessage('Vehicle info is required')
      .isLength({ min: 3, max: 255 }).withMessage('Vehicle must be 3-255 characters')
      .matches(/^[a-zA-Z0-9\s,.-]+$/).withMessage('Vehicle contains invalid characters'),

    body('address')
      .trim()
      .notEmpty().withMessage('Address is required')
      .isLength({ min: 5, max: 500 }).withMessage('Address must be 5-500 characters')
      .matches(/^[a-zA-Z0-9\s,.#-]+$/).withMessage('Address contains invalid characters'),

    body('service')
      .notEmpty().withMessage('Service is required')
      .isIn(VALID_SERVICES).withMessage('Invalid service selected'),

    body('dropoffAddress')
      .custom((value, { req }) => {
        const trimmed = (value || '').trim();
        if (req.body.service === 'pickup_dropoff') {
          if (!trimmed || trimmed.length < 5) {
            throw new Error('Drop off address is required for pickup and drop off service');
          }
          if (trimmed.length > 500) {
            throw new Error('Drop off address must be 5 to 500 characters');
          }
          if (!/^[a-zA-Z0-9\s,.#-]+$/.test(trimmed)) {
            throw new Error('Drop off address contains invalid characters');
          }
        } else if (trimmed) {
          if (trimmed.length < 5 || trimmed.length > 500) {
            throw new Error('Drop off address must be 5 to 500 characters');
          }
        }
        return true;
      }),

    body('privacyConsent')
      .custom((value) => {
        if (value !== true && value !== 'true') {
          throw new Error('You must agree to the privacy policy');
        }
        return true;
      }),

    body('date')
      .notEmpty().withMessage('Date is required')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date format')
      .custom((value) => {
        const todayIso = getChicagoTodayIso();
        if (value < todayIso) {
          throw new Error('Cannot book dates in the past');
        }
        if (!isBookableDay(value)) {
          throw new Error('Only Thursday, Friday, and Saturday are available');
        }
        return true;
      }),

    body('time')
      .notEmpty().withMessage('Time is required')
      .isIn(TIME_SLOTS).withMessage('Invalid time selected'),

    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
      .matches(/^[a-zA-Z0-9\s,.\-()]*$/).withMessage('Notes contains invalid characters')
  ];
};

const statusUpdateRules = () => {
  return [
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(VALID_STATUSES.filter((s) => s !== 'pending')).withMessage('Invalid status')
  ];
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

function isValidListStatus(status) {
  return !status || status === 'all' || VALID_STATUSES.includes(status);
}

module.exports = {
  bookingValidationRules,
  statusUpdateRules,
  validate,
  VALID_SERVICES,
  VALID_STATUSES,
  isValidListStatus
};
