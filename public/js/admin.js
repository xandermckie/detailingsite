'use strict';

const RAILWAY_API_ORIGIN = window.RAILWAY_API_ORIGIN || 'https://detailingsite-production.up.railway.app';
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? window.location.origin + '/api'
  : RAILWAY_API_ORIGIN + '/api';

const SERVICE_LABELS = {
  mobile: 'Mobile Detail ($175)',
  pickup_dropoff: 'Pickup & Drop-off ($200)'
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedBookingId = null;
let bookings = [];

// API key is stored in sessionStorage for the session only.
// Any XSS on this page could exfiltrate it — keep CSP strict and rotate keys if compromised.
function getApiKey() {
  try {
    return sessionStorage.getItem('adminApiKey') || '';
  } catch (e) {
    return '';
  }
}

function setApiKey(key) {
  try {
    sessionStorage.setItem('adminApiKey', key);
  } catch (e) { /* ignore */ }
}

function clearApiKey() {
  try {
    sessionStorage.removeItem('adminApiKey');
  } catch (e) { /* ignore */ }
}

function adminFetch(path, options = {}) {
  return fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getApiKey(),
      ...(options.headers || {})
    }
  });
}

function showLogin() {
  document.getElementById('loginView').style.display = '';
  document.getElementById('dashboardView').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashboardView').style.display = '';
  updateMonthLabel();
  loadBookings();
}

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent = MONTHS[currentMonth] + ' ' + currentYear;
}

const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

function statusBadge(status) {
  const safeStatus = escapeHtml(status);
  const badgeClass = VALID_STATUSES.includes(status) ? status : 'pending';
  return `<span class="badge badge-${badgeClass}">${safeStatus}</span>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

async function login() {
  const key = document.getElementById('apiKey').value.trim();
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  if (!key) {
    errorEl.textContent = 'API key is required';
    errorEl.style.display = 'block';
    return;
  }

  setApiKey(key);

  try {
    const res = await adminFetch(`/admin/bookings?year=${currentYear}&month=${currentMonth + 1}`);
    if (res.status === 401) {
      clearApiKey();
      errorEl.textContent = 'Invalid API key';
      errorEl.style.display = 'block';
      return;
    }
    if (!res.ok) throw new Error('Failed to connect');
    document.getElementById('apiKey').value = '';
    showDashboard();
  } catch (err) {
    clearApiKey();
    errorEl.textContent = 'Could not connect to API. Check your connection.';
    errorEl.style.display = 'block';
  }
}

async function loadBookings() {
  const tbody = document.getElementById('bookingsTable');
  tbody.innerHTML = '<tr><td colspan="5" class="empty">Loading...</td></tr>';

  const status = document.getElementById('statusFilter').value;
  let url = `/admin/bookings?year=${currentYear}&month=${currentMonth + 1}`;
  if (status !== 'all') url += `&status=${status}`;

  try {
    const res = await adminFetch(url);
    if (res.status === 401) {
      clearApiKey();
      showLogin();
      return;
    }
    const data = await res.json();
    bookings = data.data || [];

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No bookings this month</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map((b) => `
      <tr data-id="${b.id}" class="${b.id === selectedBookingId ? 'selected' : ''}">
        <td>${formatDate(b.date)}</td>
        <td>${b.time}</td>
        <td>${escapeHtml(b.vehicle)}</td>
        <td>${SERVICE_LABELS[b.service] || b.service}</td>
        <td>${statusBadge(b.status)}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('click', () => loadDetails(row.dataset.id));
    });

    if (selectedBookingId) {
      const stillExists = bookings.some((b) => b.id === selectedBookingId);
      if (stillExists) loadDetails(selectedBookingId);
      else {
        selectedBookingId = null;
        document.getElementById('detailPanel').innerHTML = '<p class="empty" style="padding:1rem;">Select a booking to view details</p>';
      }
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Failed to load bookings</td></tr>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadDetails(bookingId) {
  selectedBookingId = bookingId;
  document.querySelectorAll('#bookingsTable tr').forEach((r) => {
    r.classList.toggle('selected', r.dataset.id === bookingId);
  });

  const panel = document.getElementById('detailPanel');
  panel.innerHTML = '<p class="empty" style="padding:1rem;">Loading...</p>';

  try {
    const res = await adminFetch(`/admin/bookings/${bookingId}/details`);
    const data = await res.json();
    if (!data.success) throw new Error('Not found');

    const b = data.data;
    panel.innerHTML = `
      <h3>Booking Details</h3>
      <div class="detail-row"><strong>Name</strong>${escapeHtml(b.first_name)} ${escapeHtml(b.last_name)}</div>
      <div class="detail-row"><strong>Email</strong>${escapeHtml(b.email)}</div>
      <div class="detail-row"><strong>Phone</strong>${escapeHtml(b.phone)}</div>
      <div class="detail-row"><strong>Vehicle</strong>${escapeHtml(b.vehicle)}</div>
      <div class="detail-row"><strong>Service</strong>${SERVICE_LABELS[b.service] || b.service}</div>
      <div class="detail-row"><strong>Date</strong>${formatDate(b.date)}</div>
      <div class="detail-row"><strong>Time</strong>${b.time}</div>
      <div class="detail-row"><strong>Location</strong>${escapeHtml(b.address)}</div>
      ${b.dropoff_address ? `<div class="detail-row"><strong>Drop-off</strong>${escapeHtml(b.dropoff_address)}</div>` : ''}
      ${b.notes ? `<div class="detail-row"><strong>Notes</strong>${escapeHtml(b.notes)}</div>` : ''}
      <div class="detail-row"><strong>Status</strong>${statusBadge(b.status)}</div>
      <div class="detail-row"><strong>ID</strong><span style="font-size:0.75rem;word-break:break-all;">${b.id}</span></div>
      <div class="detail-actions">
        ${b.status === 'pending' ? '<button class="btn btn-green btn-sm" data-action="confirmed">Confirm</button>' : ''}
        ${b.status !== 'cancelled' && b.status !== 'completed' ? '<button class="btn btn-yellow btn-sm" data-action="cancelled">Cancel</button>' : ''}
        ${b.status === 'confirmed' ? '<button class="btn btn-gray btn-sm" data-action="completed">Mark Complete</button>' : ''}
        <button class="btn btn-ghost btn-sm" data-action="export">Export JSON</button>
        <button class="btn btn-ghost btn-sm" data-action="delete" style="color:#ff6b6b;border-color:rgba(255,107,107,0.3);">Delete</button>
      </div>
    `;

    panel.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAction(bookingId, btn.dataset.action);
      });
    });
  } catch (err) {
    panel.innerHTML = '<p class="empty" style="padding:1rem;color:#ff6b6b;">Failed to load details</p>';
  }
}

async function handleAction(bookingId, action) {
  if (action === 'export') {
    const res = await adminFetch(`/admin/bookings/${bookingId}/export`);
    const data = await res.json();
    if (data.success) {
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `booking-${bookingId}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    return;
  }

  if (action === 'delete') {
    if (!confirm('Permanently delete this booking? This cannot be undone.')) return;
    const res = await adminFetch(`/admin/bookings/${bookingId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      selectedBookingId = null;
      document.getElementById('detailPanel').innerHTML = '<p class="empty" style="padding:1rem;">Booking deleted</p>';
      loadBookings();
    }
    return;
  }

  const res = await adminFetch(`/admin/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: action })
  });
  const data = await res.json();
  if (data.success) {
    loadBookings();
    loadDetails(bookingId);
  }
}

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  updateMonthLabel();
  loadBookings();
}

function updateThemeButtons(isLight) {
  const icon = isLight
    ? '<svg aria-hidden="true"><use href="#icon-sun"/></svg>'
    : '<svg aria-hidden="true"><use href="#icon-moon"/></svg>';
  ['themeBtn', 'themeBtnDash'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.innerHTML = icon;
      btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    }
  });
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  updateThemeButtons(isLight);
  try { localStorage.setItem('2xtreme-theme', isLight ? 'light' : 'dark'); } catch (e) { /* ignore */ }
}

function applySavedTheme() {
  try {
    const isLight = localStorage.getItem('2xtreme-theme') === 'light';
    if (isLight) document.documentElement.classList.add('light');
    updateThemeButtons(isLight);
  } catch (e) { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  ['themeBtn', 'themeBtnDash'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', toggleTheme);
  });

  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('apiKey').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearApiKey();
    showLogin();
  });
  document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
  document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
  document.getElementById('statusFilter').addEventListener('change', loadBookings);
  document.getElementById('refreshBtn').addEventListener('click', loadBookings);

  if (getApiKey()) {
    showDashboard();
  }
});
