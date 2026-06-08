const crypto = require('crypto');

const COOLDOWN_MINUTES = parseInt(process.env.BOOKING_EMAIL_COOLDOWN_MINUTES || '15', 10);

function hashEmail(email) {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

async function isEmailThrottled(db, email) {
  const emailHash = hashEmail(email);
  const row = await db.get(
    `SELECT submitted_at FROM submission_guard WHERE email_hash = ?`,
    [emailHash]
  );

  if (!row) return false;

  const submittedAt = new Date(row.submitted_at).getTime();
  const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
  return Date.now() - submittedAt < cooldownMs;
}

async function recordEmailSubmission(db, email) {
  const emailHash = hashEmail(email);
  await db.run(
    `INSERT INTO submission_guard (email_hash, submitted_at) VALUES (?, CURRENT_TIMESTAMP)
     ON CONFLICT(email_hash) DO UPDATE SET submitted_at = CURRENT_TIMESTAMP`,
    [emailHash]
  );
}

module.exports = { isEmailThrottled, recordEmailSubmission, hashEmail };
