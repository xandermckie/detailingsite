const { body, validationResult } = require('express-validator');

// Validation rules for booking form
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
      .isIn(['dropoff']).withMessage('Invalid service selected'),

    body('date')
      .notEmpty().withMessage('Date is required')
      .isISO8601().withMessage('Invalid date format')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('Cannot book dates in the past');
        }
        // Only weekends allowed
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          throw new Error('Only weekend dates (Saturday/Sunday) are available');
        }
        return true;
      }),

    body('time')
      .notEmpty().withMessage('Time is required')
      .isIn(['8:00 AM', '10:00 AM', '12:00 PM']).withMessage('Invalid time selected'),

    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
      .matches(/^[a-zA-Z0-9\s,.\-()]*$/).withMessage('Notes contains invalid characters')
  ];
};

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  bookingValidationRules,
  validate
};
