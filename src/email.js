const nodemailer = require('nodemailer');

let transporter = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

function serviceLabel(service) {
  if (service === 'pickup_dropoff') return 'Pickup & Drop-off — $200';
  return 'Mobile Detail — $175';
}

async function sendMail(options) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email not configured — skipping send');
    return false;
  }
  try {
    await transport.sendMail({
      from: process.env.SMTP_USER,
      ...options
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

async function sendBookingCreated({ bookingId, vehicle, date, time, service, customerEmail, customerName }) {
  const label = serviceLabel(service);
  const ownerEmail = process.env.OWNER_EMAIL || process.env.SMTP_USER;
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  await sendMail({
    to: ownerEmail,
    subject: `New booking request — ${vehicle}`,
    text: [
      'A new detailing appointment has been requested.',
      '',
      `Booking ID: ${bookingId}`,
      `Vehicle: ${vehicle}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Service: ${label}`,
      '',
      `View in admin: ${siteUrl}/admin.html`
    ].join('\n')
  });

  if (customerEmail) {
    await sendMail({
      to: customerEmail,
      subject: 'Appointment request received — 2 The Xtreme Detailing',
      text: [
        `Hi ${customerName},`,
        '',
        'Thank you for booking with 2 The Xtreme Detailing!',
        '',
        `Vehicle: ${vehicle}`,
        `Date: ${date}`,
        `Time: ${time}`,
        `Service: ${label}`,
        '',
        'We will reach out within 24 hours to confirm your appointment.',
        '',
        '— 2 The Xtreme Detailing (2nd Chances INC.)'
      ].join('\n')
    });
  }
}

async function sendStatusChange({ customerEmail, customerName, status, vehicle, date, time }) {
  if (!customerEmail) return;

  const statusMessages = {
    confirmed: 'Your appointment has been confirmed!',
    cancelled: 'Your appointment has been cancelled.',
    completed: 'Thank you — your detail is marked complete.'
  };

  const message = statusMessages[status];
  if (!message) return;

  await sendMail({
    to: customerEmail,
    subject: `Appointment ${status} — 2 The Xtreme Detailing`,
    text: [
      `Hi ${customerName},`,
      '',
      message,
      '',
      `Vehicle: ${vehicle}`,
      `Date: ${date}`,
      `Time: ${time}`,
      '',
      '— 2 The Xtreme Detailing'
    ].join('\n')
  });
}

module.exports = {
  isConfigured,
  sendBookingCreated,
  sendStatusChange
};
