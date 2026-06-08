const BOOKING_TIMEZONE = 'America/Chicago';
const ALLOWED_DAYS = [4, 5, 6];
const TIME_SLOTS = ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'];

const WEEKDAY_TO_NUM = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function parseChicagoParts(isoDate) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });
  const parts = formatter.formatToParts(new Date(isoDate + 'T12:00:00'));
  const map = {};
  parts.forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    weekday: WEEKDAY_TO_NUM[map.weekday]
  };
}

function getChicagoDayOfWeek(isoDate) {
  return parseChicagoParts(isoDate).weekday;
}

function getChicagoTodayIso() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const map = {};
  formatter.formatToParts(new Date()).forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return `${map.year}-${map.month}-${map.day}`;
}

function isBookableDay(isoDate) {
  return ALLOWED_DAYS.includes(getChicagoDayOfWeek(isoDate));
}

function isoFromParts(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

module.exports = {
  BOOKING_TIMEZONE,
  ALLOWED_DAYS,
  TIME_SLOTS,
  getChicagoDayOfWeek,
  getChicagoTodayIso,
  isBookableDay,
  isoFromParts
};
