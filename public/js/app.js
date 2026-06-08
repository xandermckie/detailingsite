'use strict';

const RAILWAY_API_ORIGIN = window.RAILWAY_API_ORIGIN || 'https://detailingsite-production.up.railway.app';
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? window.location.origin + '/api'
  : RAILWAY_API_ORIGIN + '/api';

const PAGE_IDS = ['home', 'services', 'gallery', 'about', 'booking', 'privacy'];

const SERVICE_LABELS = {
  mobile: 'Mobile Detail ($175)',
  pickup_dropoff: 'Pickup and drop off ($200)'
};

const FACEBOOK_URL = window.FACEBOOK_URL || '';
const TIKTOK_URL = window.TIKTOK_URL || '';
const CONTACT_EMAIL = window.CONTACT_EMAIL || 'secondsfoodtruck@gmail.com';

function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function renderSocialBtn(platform, label, iconId, url) {
  const inner = `<svg><use href="#${iconId}"/></svg> ${label}`;
  if (isSafeUrl(url)) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="social-btn ${platform}">${inner}</a>`;
  }
  return `<span class="social-btn social-btn-disabled ${platform}" aria-disabled="true">${inner}</span>`;
}

function renderSocialListItem(label, iconId, url) {
  const icon = `<svg style="width:14px;height:14px;fill:currentColor;"><use href="#${iconId}"/></svg> `;
  if (isSafeUrl(url)) {
    return `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${icon}${label}</a></li>`;
  }
  return `<li><span class="social-link-disabled">${icon}${label}</span></li>`;
}

function renderSocialMini(label, iconId, url) {
  const inner = `<svg><use href="#${iconId}"/></svg> ${label}`;
  if (isSafeUrl(url)) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
  }
  return `<span class="social-link-disabled">${inner}</span>`;
}

function renderSuccessDetail(displayDate, time, serviceLabel) {
  const el = document.getElementById('successDetail');
  if (!el) return;
  el.textContent = '';

  const intro = document.createElement('span');
  intro.textContent = "We'll reach out within 24 hours to confirm your detail.";
  el.appendChild(intro);
  el.appendChild(document.createElement('br'));
  el.appendChild(document.createElement('br'));

  const addLine = (label, value, highlight) => {
    const strong = document.createElement('strong');
    strong.style.color = 'var(--white)';
    strong.textContent = label + ': ';
    el.appendChild(strong);
    const val = document.createElement('span');
    if (highlight) val.style.color = '#cc2020';
    val.textContent = value;
    el.appendChild(val);
    el.appendChild(document.createElement('br'));
  };

  addLine('Date', displayDate, true);
  addLine('Time', time, true);
  addLine('Service', serviceLabel, false);
}

let selectedDate = null;
let selectedTime = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let unavailableSlots = {};
let calendarLoading = false;

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makeFooter() {
  return `<footer>
    <div class="footer-main">
      <div class="footer-brand">
        <span class="footer-logo">2 The <span>Xtreme</span> Detailing</span>
        <p>Mobile hand detailing done right. We come to you. No drop offs needed. Family run and proud of every car we touch.</p>
        <span class="inc-tag">A 2nd Chances INC. Brand</span>
        <p style="font-size:0.8rem;color:var(--white-muted);margin-top:0.75rem;"><a href="mailto:${CONTACT_EMAIL}" style="color:var(--red);text-decoration:none;">${CONTACT_EMAIL}</a></p>
        <div class="social-links" style="margin-top:1.25rem;">
          ${renderSocialBtn('fb', 'Facebook', 'icon-fb', FACEBOOK_URL)}
          ${renderSocialBtn('tt', 'TikTok', 'icon-tt', TIKTOK_URL)}
        </div>
      </div>
      <div class="footer-col"><h4>Pages</h4><ul>
        <li><a href="#home" data-page="home">Home</a></li>
        <li><a href="#services" data-page="services">Services</a></li>
        <li><a href="#gallery" data-page="gallery">Gallery</a></li>
        <li><a href="#about" data-page="about">About</a></li>
        <li><a href="#booking" data-page="booking">Book a Detail</a></li>
        <li><a href="#privacy" data-page="privacy">Privacy Policy</a></li>
      </ul></div>
      <div class="footer-col"><h4>Pricing</h4><ul>
        <li><a href="#services" data-page="services">Mobile ($175)</a></li>
        <li><a href="#services" data-page="services">Pickup and drop off ($200)</a></li>
      </ul></div>
      <div class="footer-col"><h4>Follow Us</h4><ul>
        ${renderSocialListItem('Facebook', 'icon-fb', FACEBOOK_URL)}
        ${renderSocialListItem('TikTok', 'icon-tt', TIKTOK_URL)}
      </ul></div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 2 The Xtreme Detailing. A 2nd Chances INC. brand. All rights reserved. &middot; <a href="#privacy" data-page="privacy" style="color:var(--white-muted);text-decoration:none;">Privacy</a></p>
      <div class="social-mini">
        ${renderSocialMini('Facebook', 'icon-fb', FACEBOOK_URL)}
        ${renderSocialMini('TikTok', 'icon-tt', TIKTOK_URL)}
      </div>
    </div>
  </footer>`;
}

function injectBookingSocialLinks() {
  const container = document.getElementById('bookingSocialLinks');
  if (!container) return;
  container.innerHTML =
    renderSocialBtn('fb', 'Facebook', 'icon-fb', FACEBOOK_URL) +
    renderSocialBtn('tt', 'TikTok', 'icon-tt', TIKTOK_URL);
}

function injectFooters() {
  PAGE_IDS.forEach((p) => {
    const el = document.getElementById('footer-' + p);
    if (el) el.innerHTML = makeFooter();
  });
}

function showPage(name, pushHash = true) {
  if (!PAGE_IDS.includes(name)) name = 'home';

  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (!page) return;
  page.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach((a) => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');

  if (pushHash && location.hash !== '#' + name) {
    history.pushState(null, '', '#' + name);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'booking') {
    fetchAvailability().then(() => renderCalendar());
  }
  initReveals();
}

function handleHashRoute() {
  const hash = location.hash.replace('#', '') || 'home';
  showPage(hash, false);
}

function toggleMobileNav(btn) {
  const existing = document.getElementById('mobileNav');
  if (existing) {
    existing.remove();
    btn.innerHTML = '&#9776;';
    return;
  }
  btn.innerHTML = '&#10005;';
  const nav = document.createElement('div');
  nav.id = 'mobileNav';
  nav.style.cssText = 'position:fixed;top:64px;left:0;right:0;background:var(--nav-bg);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);z-index:199;padding:1.5rem;display:flex;flex-direction:column;gap:1rem;';
  [['Home', 'home'], ['Services', 'services'], ['Gallery', 'gallery'], ['About', 'about'], ['Book a Detail', 'booking'], ['Privacy', 'privacy']].forEach(([label, page]) => {
    const a = document.createElement('a');
    a.href = '#' + page;
    a.textContent = label;
    a.style.cssText = 'color:var(--white-dim);text-decoration:none;font-size:0.88rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;padding:0.4rem 0;';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      nav.remove();
      btn.innerHTML = '&#9776;';
      showPage(page);
    });
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
}

function initReveals() {
  setTimeout(() => {
    const reveals = document.querySelectorAll('.page.active .reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });

    reveals.forEach((r) => {
      r.classList.remove('visible');
      const rect = r.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        r.classList.add('visible');
      } else {
        obs.observe(r);
      }
    });
  }, 50);
}

function applyGalleryFilter(filter) {
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('#page-gallery .ba-section').forEach((section) => {
    const categories = (section.dataset.category || '').split(',').map((c) => c.trim());
    const show = filter === 'all' || categories.includes(filter);
    section.style.display = show ? '' : 'none';
  });
}

function setCalendarLoading(loading) {
  calendarLoading = loading;
  const loadingEl = document.getElementById('calLoading');
  const grid = document.getElementById('calDays');
  if (loadingEl) loadingEl.style.display = loading ? 'block' : 'none';
  if (grid) grid.classList.toggle('cal-hidden', loading);
}

async function fetchAvailability() {
  setCalendarLoading(true);
  try {
    const res = await fetch(`${API_BASE}/availability?year=${currentYear}&month=${currentMonth + 1}`);
    const data = await res.json();
    if (data.success && data.booked) {
      unavailableSlots = data.booked;
    }
  } catch (err) {
    console.error('Availability fetch failed:', err);
  } finally {
    setCalendarLoading(false);
  }
}

function isFullyBooked(iso) {
  const blocked = unavailableSlots[iso] || [];
  return TIME_SLOTS.every((slot) => blocked.includes(slot));
}

function renderCalendar() {
  const calMonth = document.getElementById('calMonth');
  const grid = document.getElementById('calDays');
  if (!calMonth || !grid) return;

  const todayIso = getChicagoTodayIso();
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  calMonth.textContent = months[currentMonth] + ' ' + currentYear;
  grid.innerHTML = '';

  for (let i = 0; i < firstDay.getDay(); i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const iso = isoFromParts(currentYear, currentMonth, d);
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;

    if (!isBookableDay(iso) || iso < todayIso || isFullyBooked(iso)) {
      el.classList.add('disabled');
    } else {
      if (iso === todayIso) el.classList.add('today');
      if (selectedDate && dateKey(selectedDate) === iso) el.classList.add('selected');
      el.addEventListener('click', () => selectDate(new Date(currentYear, currentMonth, d)));
    }
    grid.appendChild(el);
  }
}

function selectDate(date) {
  selectedDate = date;
  selectedTime = null;
  document.querySelectorAll('.time-slot').forEach((s) => s.classList.remove('selected'));
  renderCalendar();
  updateTimeSlots();
}

function updateTimeSlots() {
  if (!selectedDate) return;
  const key = dateKey(selectedDate);
  const blocked = unavailableSlots[key] || [];
  document.querySelectorAll('.time-slot').forEach((slot) => {
    slot.classList.remove('unavailable', 'selected');
    if (blocked.includes(slot.dataset.time)) slot.classList.add('unavailable');
  });
}

function selectTime(el) {
  if (el.classList.contains('unavailable')) return;
  document.querySelectorAll('.time-slot').forEach((s) => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedTime = el.dataset.time;
}

async function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  await fetchAvailability();
  renderCalendar();
  updateTimeSlots();
}

function clearFieldErrors() {
  document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach((el) => {
    el.classList.remove('error');
  });
  document.querySelectorAll('.field-error').forEach((el) => {
    el.classList.remove('show');
    el.textContent = '';
  });
}

function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(fieldId + 'Error');
  if (field) field.classList.add('error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
}

function clearFormError() {
  const errorEl = document.getElementById('formError');
  if (!errorEl) return;
  errorEl.classList.remove('show');
  errorEl.textContent = '';
}

function showFormError(message) {
  const errorEl = document.getElementById('formError');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.add('show');
  errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function focusFirstFieldError() {
  const firstError = document.querySelector('.form-group input.error, .form-group select.error, .form-group textarea.error');
  if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function validateBookingForm() {
  clearFieldErrors();
  clearFormError();

  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const vehicle = document.getElementById('vehicle').value.trim();
  const address = document.getElementById('address').value.trim();
  const service = document.getElementById('service').value;
  const dropoffAddress = document.getElementById('dropoffAddress').value.trim();
  const consent = document.getElementById('privacyConsent').checked;

  let valid = true;

  if (!fname) { setFieldError('fname', 'First name is required'); valid = false; }
  else if (!/^[a-zA-Z\s'-]+$/.test(fname)) { setFieldError('fname', 'Invalid characters in first name'); valid = false; }

  if (!lname) { setFieldError('lname', 'Last name is required'); valid = false; }
  else if (!/^[a-zA-Z\s'-]+$/.test(lname)) { setFieldError('lname', 'Invalid characters in last name'); valid = false; }

  if (!email) { setFieldError('email', 'Email is required'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('email', 'Invalid email address'); valid = false; }

  if (!phone) { setFieldError('phone', 'Phone is required'); valid = false; }
  else if (!/^[\d\s\-()\.+]+$/.test(phone) || phone.length < 10) { setFieldError('phone', 'Invalid phone number'); valid = false; }

  if (!vehicle) { setFieldError('vehicle', 'Vehicle info is required'); valid = false; }
  else if (vehicle.length < 3) { setFieldError('vehicle', 'Vehicle must be at least 3 characters'); valid = false; }

  if (!address) { setFieldError('address', 'Address is required'); valid = false; }
  else if (address.length < 5) { setFieldError('address', 'Address must be at least 5 characters'); valid = false; }

  if (!service) { setFieldError('service', 'Please select a service'); valid = false; }

  if (service === 'pickup_dropoff' && !dropoffAddress) {
    setFieldError('dropoffAddress', 'Drop off address is required');
    valid = false;
  } else if (dropoffAddress && dropoffAddress.length < 5) {
    setFieldError('dropoffAddress', 'Drop off address must be at least 5 characters');
    valid = false;
  }

  const formErrors = [];
  if (!consent) formErrors.push('You must agree to the privacy policy.');
  if (!selectedDate) {
    formErrors.push('Please select a date (Thursday, Friday, or Saturday).');
  } else if (!isBookableDay(dateKey(selectedDate))) {
    formErrors.push('Only Thursday, Friday, and Saturday are available.');
  }
  if (!selectedTime) formErrors.push('Please select a time slot.');

  if (formErrors.length) {
    showFormError(formErrors.join(' '));
    valid = false;
  }

  if (!valid) {
    focusFirstFieldError();
    return null;
  }

  return { fname, lname, email, phone, vehicle, address, service, dropoffAddress, consent };
}

function toggleDropoffField() {
  const service = document.getElementById('service').value;
  const group = document.getElementById('dropoffGroup');
  if (group) group.classList.toggle('visible', service === 'pickup_dropoff');
}

function resetBookingForm() {
  ['fname', 'lname', 'email', 'phone', 'vehicle', 'address', 'dropoffAddress', 'notes', 'website'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const serviceEl = document.getElementById('service');
  if (serviceEl) serviceEl.value = '';
  const consentEl = document.getElementById('privacyConsent');
  if (consentEl) consentEl.checked = false;

  selectedDate = null;
  selectedTime = null;
  clearFieldErrors();
  clearFormError();
  toggleDropoffField();

  document.getElementById('bookingFormWrap').style.display = '';
  document.getElementById('successMsg').style.display = 'none';
  document.getElementById('formLoading').style.display = 'none';
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = false;

  fetchAvailability().then(() => renderCalendar());
}

async function submitBooking() {
  const data = validateBookingForm();
  if (!data) return;

  const dateStr = dateKey(selectedDate);
  const submitBtn = document.getElementById('submitBtn');
  const loadingEl = document.getElementById('formLoading');
  submitBtn.disabled = true;
  loadingEl.style.display = 'block';

  const payload = {
    firstName: data.fname,
    lastName: data.lname,
    email: data.email,
    phone: data.phone,
    vehicle: data.vehicle,
    address: data.address,
    service: data.service,
    date: dateStr,
    time: selectedTime,
    notes: document.getElementById('notes').value.trim(),
    privacyConsent: true,
    website: document.getElementById('website') ? document.getElementById('website').value : ''
  };

  if (data.service === 'pickup_dropoff') {
    payload.dropoffAddress = data.dropoffAddress;
  }

  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error('Invalid server response');
    }

    if (response.ok && result.success) {
      document.getElementById('bookingFormWrap').style.display = 'none';
      loadingEl.style.display = 'none';

      const displayDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const serviceLabel = SERVICE_LABELS[data.service] || data.service;

      renderSuccessDetail(displayDate, selectedTime, serviceLabel);
      document.getElementById('successMsg').style.display = 'block';

      if (!unavailableSlots[dateStr]) unavailableSlots[dateStr] = [];
      if (!unavailableSlots[dateStr].includes(selectedTime)) {
        unavailableSlots[dateStr].push(selectedTime);
      }
    } else {
      if (result.errors) {
        result.errors.forEach((err) => {
          const fieldMap = {
            firstName: 'fname', lastName: 'lname', dropoffAddress: 'dropoffAddress'
          };
          const fieldId = fieldMap[err.field] || err.field;
          if (document.getElementById(fieldId)) {
            setFieldError(fieldId, err.message);
          }
        });
        showFormError(result.errors.map((e) => e.message).join(', '));
      } else {
        showFormError(result.message || 'Failed to submit booking. Please try again.');
      }
      submitBtn.disabled = false;
      loadingEl.style.display = 'none';
    }
  } catch (error) {
    console.error('Form submission error:', error);
    showFormError(
      'Unable to reach the booking server. Please try again, or email ' +
      CONTACT_EMAIL + ' to schedule your detail.'
    );
    submitBtn.disabled = false;
    loadingEl.style.display = 'none';
  }
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = isLight ? '☀️' : '🌙';
  try { localStorage.setItem('2xtreme-theme', isLight ? 'light' : 'dark'); } catch (e) { /* ignore */ }
}

function applySavedTheme() {
  try {
    if (localStorage.getItem('2xtreme-theme') === 'light') {
      document.documentElement.classList.add('light');
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = '☀️';
    }
  } catch (e) { /* ignore */ }
}

function bindEvents() {
  document.addEventListener('click', (e) => {
    const pageEl = e.target.closest('[data-page]');
    if (pageEl) {
      e.preventDefault();
      showPage(pageEl.dataset.page);
      return;
    }

    const calNav = e.target.closest('[data-cal-nav]');
    if (calNav) {
      e.preventDefault();
      changeMonth(parseInt(calNav.dataset.calNav, 10));
      return;
    }

    const timeSlot = e.target.closest('.time-slot');
    if (timeSlot) {
      selectTime(timeSlot);
      return;
    }

    const filterBtn = e.target.closest('.filter-btn');
    if (filterBtn) {
      applyGalleryFilter(filterBtn.dataset.filter || 'all');
    }
  });

  window.addEventListener('hashchange', handleHashRoute);
  window.addEventListener('popstate', handleHashRoute);

  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const navToggle = document.querySelector('.nav-toggle');
  if (navToggle) navToggle.addEventListener('click', () => toggleMobileNav(navToggle));

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.addEventListener('click', submitBooking);

  const bookAnotherBtn = document.getElementById('bookAnotherBtn');
  if (bookAnotherBtn) bookAnotherBtn.addEventListener('click', resetBookingForm);

  const serviceEl = document.getElementById('service');
  if (serviceEl) serviceEl.addEventListener('change', toggleDropoffField);

  document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach((el) => {
    el.addEventListener('input', () => {
      el.classList.remove('error');
      const errorEl = document.getElementById(el.id + 'Error');
      if (errorEl) errorEl.classList.remove('show');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  injectFooters();
  injectBookingSocialLinks();
  bindEvents();
  applyGalleryFilter('all');
  toggleDropoffField();
  handleHashRoute();
  initReveals();
});
