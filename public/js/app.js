'use strict';

const RAILWAY_API_ORIGIN = window.RAILWAY_API_ORIGIN || 'https://detailingsite-production.up.railway.app';
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? window.location.origin + '/api'
  : RAILWAY_API_ORIGIN + '/api';

const ALL_TIME_SLOTS = ['8:00 AM', '10:00 AM', '12:00 PM'];
const PAGE_IDS = ['home', 'services', 'gallery', 'about', 'booking'];

let selectedDate = null;
let selectedTime = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let unavailableSlots = {};

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
        <p>Mobile hand detailing done right. We come to you, no drop-offs needed. Family-run and proud of every car we touch.</p>
        <span class="inc-tag">A 2nd Chances INC. Brand</span>
        <div class="social-links" style="margin-top:1.25rem;">
          <a href="https://facebook.com/2theXtremeDetailing" target="_blank" rel="noopener noreferrer" class="social-btn fb">
            <svg><use href="#icon-fb"/></svg> Facebook
          </a>
          <a href="https://tiktok.com/@2theXtremeDetailing" target="_blank" rel="noopener noreferrer" class="social-btn tt">
            <svg><use href="#icon-tt"/></svg> TikTok
          </a>
        </div>
      </div>
      <div class="footer-col"><h4>Pages</h4><ul>
        <li><a href="#" data-page="home">Home</a></li>
        <li><a href="#" data-page="services">Services</a></li>
        <li><a href="#" data-page="gallery">Gallery</a></li>
        <li><a href="#" data-page="about">About</a></li>
        <li><a href="#" data-page="booking">Book a Detail</a></li>
      </ul></div>
      <div class="footer-col"><h4>Pricing</h4><ul>
        <li><a href="#" data-page="services">Standard — $175</a></li>
      </ul></div>
      <div class="footer-col"><h4>Follow Us</h4><ul>
        <li><a href="https://facebook.com/2theXtremeDetailing" target="_blank" rel="noopener noreferrer"><svg style="width:14px;height:14px;fill:currentColor;"><use href="#icon-fb"/></svg> Facebook</a></li>
        <li><a href="https://tiktok.com/@2theXtremeDetailing" target="_blank" rel="noopener noreferrer"><svg style="width:14px;height:14px;fill:currentColor;"><use href="#icon-tt"/></svg> TikTok</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 2 The Xtreme Detailing &mdash; A 2nd Chances INC. brand. All rights reserved.</p>
      <div class="social-mini">
        <a href="https://facebook.com/2theXtremeDetailing" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-fb"/></svg> Facebook</a>
        <a href="https://tiktok.com/@2theXtremeDetailing" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-tt"/></svg> TikTok</a>
      </div>
    </div>
  </footer>`;
}

function injectFooters() {
  PAGE_IDS.forEach((p) => {
    const el = document.getElementById('footer-' + p);
    if (el) el.innerHTML = makeFooter();
  });
}

function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (!page) return;
  page.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach((a) => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'booking') {
    fetchAvailability().then(() => renderCalendar());
  }
  initReveals();
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
  const bg = document.documentElement.classList.contains('light')
    ? 'rgba(240,237,232,0.98)'
    : 'rgba(10,10,10,0.97)';
  nav.style.cssText = `position:fixed;top:64px;left:0;right:0;background:${bg};backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.08);z-index:199;padding:1.5rem;display:flex;flex-direction:column;gap:1rem;`;
  [['Home', 'home'], ['Services', 'services'], ['Gallery', 'gallery'], ['About', 'about'], ['Book a Detail', 'booking']].forEach(([label, page]) => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = label;
    a.style.cssText = 'color:#b8b4ac;text-decoration:none;font-size:0.88rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;padding:0.4rem 0;';
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

async function fetchAvailability() {
  try {
    const res = await fetch(`${API_BASE}/availability?year=${currentYear}&month=${currentMonth + 1}`);
    const data = await res.json();
    if (data.success && data.booked) {
      unavailableSlots = data.booked;
    }
  } catch (err) {
    console.error('Availability fetch failed:', err);
  }
}

function isWeekend(d) {
  return d.getDay() === 0 || d.getDay() === 6;
}

function isFullyBooked(date) {
  const key = dateKey(date);
  const blocked = unavailableSlots[key] || [];
  return ALL_TIME_SLOTS.every((slot) => blocked.includes(slot));
}

function renderCalendar() {
  const calMonth = document.getElementById('calMonth');
  const grid = document.getElementById('calDays');
  if (!calMonth || !grid) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
    const date = new Date(currentYear, currentMonth, d);
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;

    if (!isWeekend(date) || date < today || isFullyBooked(date)) {
      el.classList.add('disabled');
    } else {
      if (date.toDateString() === today.toDateString()) el.classList.add('today');
      if (selectedDate && selectedDate.toDateString() === date.toDateString()) el.classList.add('selected');
      el.addEventListener('click', () => selectDate(date));
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
}

async function submitBooking() {
  clearFormError();

  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const vehicle = document.getElementById('vehicle').value.trim();
  const address = document.getElementById('address').value.trim();
  const service = document.getElementById('service').value;
  const notes = document.getElementById('notes').value.trim();

  if (!fname || !lname || !email || !phone || !vehicle || !address || !service) {
    showFormError('Please fill out all required fields.');
    return;
  }
  if (!selectedDate) {
    showFormError('Please select a date.');
    return;
  }
  if (!selectedTime) {
    showFormError('Please select a time slot.');
    return;
  }

  const dateStr = dateKey(selectedDate);
  const submitBtn = document.getElementById('submitBtn');
  const loadingEl = document.getElementById('formLoading');
  submitBtn.disabled = true;
  loadingEl.style.display = 'block';

  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: fname,
        lastName: lname,
        email,
        phone,
        vehicle,
        address,
        service,
        date: dateStr,
        time: selectedTime,
        notes
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      document.getElementById('bookingFormWrap').style.display = 'none';
      loadingEl.style.display = 'none';

      const displayDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      document.getElementById('successDetail').innerHTML =
        "We'll reach out within 24 hours to confirm your detail.<br><br>" +
        '<strong style="color:var(--white);">Date:</strong> <span style="color:#cc2020;">' + displayDate + '</span><br>' +
        '<strong style="color:var(--white);">Time:</strong> <span style="color:#cc2020;">' + selectedTime + '</span><br>' +
        '<strong style="color:var(--white);">Service:</strong> Mobile Detail ($175)';

      document.getElementById('successMsg').style.display = 'block';

      if (!unavailableSlots[dateStr]) unavailableSlots[dateStr] = [];
      if (!unavailableSlots[dateStr].includes(selectedTime)) {
        unavailableSlots[dateStr].push(selectedTime);
      }
    } else {
      const errorMsg = data.errors
        ? data.errors.map((e) => e.message).join(', ')
        : data.message;
      showFormError(errorMsg || 'Failed to submit booking. Please try again.');
      submitBtn.disabled = false;
      loadingEl.style.display = 'none';
    }
  } catch (error) {
    console.error('Form submission error:', error);
    showFormError('Failed to submit booking. Please check your connection and try again.');
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

  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const navToggle = document.querySelector('.nav-toggle');
  if (navToggle) navToggle.addEventListener('click', () => toggleMobileNav(navToggle));

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.addEventListener('click', submitBooking);
}

document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  injectFooters();
  bindEvents();
  applyGalleryFilter('all');
  initReveals();
});
