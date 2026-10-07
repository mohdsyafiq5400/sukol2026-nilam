(function () {
  'use strict';

  var PAGE = window.__PAGE__ === 'admin' ? 'admin' : 'app';

  var state = {
    boot: null, token: null, manager: null, status: null, myTeams: [],
    canRegister: true, canEdit: true, maxTeams: 1, open: true,
    sport: null, team: null, mode: 'create', busy: false,
    atoken: null, admin: null
  };
  var VIEWS = ['auth', 'list', 'directory', 'settings', 'jersey', 'form', 'done', 'alogin', 'admin'];
  state.jinfo = null; state.jmedia = null; state.jsel = { size: '', sleeve: '' }; state.isel = { size: '', budget: '' };
  state.view = 'auth';
  state.dir = null;
  state.dirFilter = { landing: 'all', main: 'all' };

  /* ============================================================
   *  UTILITI
   * ============================================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function call(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    var body = JSON.stringify({ fn: fn, args: args });
    function attempt(left) {
      return fetch(window.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body,
        redirect: 'follow',
        credentials: 'omit'
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.__error) throw new Error(j.__error);
        return j ? j.result : undefined;
      }, function (err) {
        if (left > 0 && !(err && err.__app)) return attempt(left - 1);
        throw err;
      });
    }
    return attempt(1);
  }
  function show(view) {
    $('#loading').hidden = true;
    VIEWS.forEach(function (v) { $('#view-' + v).hidden = (v !== view); });
    state.view = view;
    document.body.classList.remove('sb-open');
    renderNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============================================================
   *  SIDEBAR / NAVIGASI
   * ============================================================ */
  var NAV = {
    public: [
      { id: 'home', icon: '🏠', label: 'Log Masuk / Daftar', go: 'auth' },
      { id: 'dir', icon: '📋', label: 'Senarai Pasukan', go: 'landing-dir', badge: true },
      { id: 'jersey', icon: '👕', label: 'Jersi', go: 'jersey', jersey: true }
    ],
    manager: [
      { id: 'dash', icon: '🏠', label: 'Dashboard', go: 'list' },
      { id: 'dir', icon: '📋', label: 'Senarai Pasukan', go: 'directory', badge: true },
      { id: 'jersey', icon: '👕', label: 'Jersi', go: 'jersey', jersey: true },
      { id: 'settings', icon: '⚙️', label: 'Tetapan', go: 'settings' }
    ],
    admin: [
      { id: 'a-stats', icon: '📊', label: 'Ringkasan', scroll: '#a-stats' },
      { id: 'a-slots', icon: '🗂️', label: 'Status slot', scroll: '#a-sec-slots' },
      { id: 'a-teams', icon: '👥', label: 'Pasukan', scroll: '#a-sec-teams' },
      { id: 'a-managers', icon: '🧑‍💼', label: 'Manager', scroll: '#a-sec-managers' },
      { id: 'a-jersey', icon: '👕', label: 'Jersi', scroll: '#a-sec-jersey' },
      { id: 'a-log', icon: '📜', label: 'Log aktiviti', scroll: '#a-sec-log' },
      { id: 'portal', icon: '↩️', label: 'Portal manager', go: 'portal' }
    ],
    adminpublic: [
      { id: 'portal', icon: '↩️', label: 'Portal manager', go: 'portal' }
    ]
  };
  var VIEW_NAV = { auth: 'home', directory: 'dir', list: 'dash', form: 'dash', done: 'dash', settings: 'settings', jersey: 'jersey', admin: 'a-stats' };

  function navMode() {
    if (PAGE === 'admin') return state.atoken ? 'admin' : 'adminpublic';
    return state.token ? 'manager' : 'public';
  }

  function recruitingBadge() {
    return state.dir && state.dir.totals && state.dir.totals.recruiting ? state.dir.totals.recruiting : 0;
  }

  function renderNav() {
    var nav = $('#sb-nav');
    if (!nav) return;
    var mode = navMode();
    var active = VIEW_NAV[state.view];
    var jz = (state.boot && state.boot.jersey) || {};
    nav.innerHTML = NAV[mode].filter(function (it) { return !it.jersey || jz.show; }).map(function (it) {
      var b = it.badge && recruitingBadge() ? '<span class="nav-badge" title="Pasukan mencari ahli">' + recruitingBadge() + '</span>' : '';
      if (it.jersey && jz.open) b = '<span class="nav-badge go">BUKA</span>';
      return '<button type="button" class="nav-item' + (it.id === active ? ' active' : '') + '" data-nav="' + it.id + '">' +
        '<span class="nav-ico">' + it.icon + '</span><span class="nav-label">' + esc(it.label) + '</span>' + b + '</button>';
    }).join('');
  }

  function scrollToSel(sel) {
    var el = $(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onNavClick(e) {
    var btn = e.target.closest('button[data-nav]');
    if (!btn) return;
    var it = NAV[navMode()].filter(function (x) { return x.id === btn.getAttribute('data-nav'); })[0];
    if (!it) return;
    document.body.classList.remove('sb-open');
    if (it.scroll) { scrollToSel(it.scroll); return; }
    switch (it.go) {
      case 'auth': showAuth(); break;
      case 'landing-dir':
        if (state.view !== 'auth') showAuth();
        setTimeout(function () { scrollToSel('#landing-dir'); }, 80);
        break;
      case 'list': renderDashboard(); show('list'); break;
      case 'directory': openDirectory(); break;
      case 'settings': openSettings(); break;
      case 'jersey': openJersey(); break;
      case 'portal': goManager(); break;
    }
  }

  /* ============================================================
   *  SENARAI PASUKAN (awam + manager)
   * ============================================================ */
  function openDirectory() {
    show('directory');
    renderDirectories();
    loadDirectory();
  }

  function loadDirectory() {
    return call('apiGetDirectory', state.token || null).then(function (d) {
      if (d.authRequired) { state.dir = null; renderDirectories('private'); return; }
      if (!d.ok) { renderDirectories('error'); return; }
      state.dir = d;
      renderDirectories();
      renderNav();
    }).catch(function () { renderDirectories('error'); });
  }

  function renderDirectories(err) {
    renderDirectory($('#dir-landing'), 'landing', err);
    renderDirectory($('#dir-main'), 'main', err);
  }

  function isMyTeam(teamId) {
    return state.myTeams.some(function (t) { return t.teamId === teamId; });
  }

  function dirLine(s, tm, x) {
    if (!x.registered) {
      return '<div class="tl empty"><div class="tl-head"><strong>Pasukan ' + tm + '</strong><span class="pill">Slot kosong</span></div>' +
        '<div class="tl-sub">Belum ada manager. Berminat? ' + (state.token ? 'Daftar dari Dashboard.' : 'Daftar sebagai manager di atas.') + '</div></div>';
    }
    var mine = isMyTeam(x.teamId);
    var pct = x.pax ? Math.round(x.count / x.pax * 100) : 0;
    var status = x.complete ? '<span class="pill ok">✓ Lengkap</span>' : '<span class="pill warn">Mencari ' + x.needs + ' lagi</span>';
    var who = x.contact
      ? '<div class="tl-who"><strong>👤 ' + esc(x.contact.name) + '</strong><span>' + esc(x.contact.faculty) + '</span></div>'
      : '<div class="tl-who muted">Manager tidak memaparkan maklumat hubungan.</div>';
    var wa = '';
    if (x.contact && x.contact.phone && !mine) {
      var msg = 'Salam, saya berminat untuk menyertai pasukan ' + s.name + ' (Pasukan ' + tm + ') ' + state.boot.teamName + '. Masih ada tempat?';
      wa = '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(x.contact.phone) + '?text=' + encodeURIComponent(msg) + '">💬 Hubungi di WhatsApp</a>';
    }
    return '<div class="tl' + (mine ? ' mine' : '') + '"><div class="tl-head"><strong>Pasukan ' + tm + '</strong>' +
      (mine ? '<span class="pill ok">Pasukan anda</span>' : '') + status + '</div>' +
      '<div class="tc-meter"><i style="width:' + pct + '%"></i></div><div class="tl-sub">' + x.count + ' / ' + x.pax + ' atlet</div>' +
      (mine ? '' : who) + wa + '</div>';
  }

  function renderDirectory(el, key, err) {
    if (!el) return;
    if (err === 'private') { el.innerHTML = '<div class="dir-note">Senarai pasukan hanya boleh dilihat oleh manager yang log masuk.</div>'; return; }
    if (err === 'error') { el.innerHTML = '<div class="dir-note">Gagal memuatkan senarai pasukan. Sila cuba lagi (↻).</div>'; return; }
    if (!state.dir) { el.innerHTML = '<div class="dir-note">Memuatkan senarai pasukan…</div>'; return; }

    var d = state.dir, t = d.totals;
    var f = state.dirFilter[key] || 'all';
    function tile(v, l) { return '<div class="stat"><b>' + v + '</b><span>' + l + '</span></div>'; }
    var stats = '<div class="stats dir-stats">' + tile(t.teams + ' / ' + t.slots, 'Pasukan didaftar') + tile(t.recruiting, 'Pasukan mencari ahli') +
      tile(t.openSeats, 'Tempat atlet kosong') + tile(t.emptySlots, 'Slot belum diambil') + '</div>';
    var chips = '<div class="dir-filters">' + [['all', 'Semua'], ['recruiting', 'Mencari ahli'], ['complete', 'Lengkap'], ['empty', 'Slot kosong']].map(function (c) {
      return '<button type="button" class="fchip' + (f === c[0] ? ' on' : '') + '" data-dirfilter="' + c[0] + '" data-dirkey="' + key + '">' + c[1] + '</button>';
    }).join('') + '</div>';

    function show1(x) {
      if (f === 'recruiting') return x.registered && !x.complete;
      if (f === 'complete') return x.registered && x.complete;
      if (f === 'empty') return !x.registered;
      return true;
    }
    var cards = d.sports.map(function (s) {
      var lines = d.teams.filter(function (tm) { return show1(s.teams[tm]); }).map(function (tm) { return dirLine(s, tm, s.teams[tm]); });
      if (!lines.length) return '';
      var c = colorsOf(s.sportId);
      return '<article class="card" style="--c1:' + c[0] + ';--c2:' + c[1] + '">' +
        '<div class="card-top"><div class="card-icon">' + s.icon + '</div><div><h3>' + esc(s.name) + '</h3><div class="meta">' + s.pax + ' atlet / pasukan</div></div></div>' +
        lines.join('') + '</article>';
    }).join('');
    if (!cards) cards = '<div class="dir-note dir-empty">Tiada pasukan untuk penapis ini.</div>';
    el.innerHTML = stats + chips + '<div class="grid dir-grid">' + cards + '</div>';
  }

  /* ============================================================
   *  TETAPAN (emel, PIN, paparan awam)
   * ============================================================ */
  function openSettings() {
    renderSettings();
    show('settings');
  }
  function renderSettings() {
    renderEmailCard();
    closePinForm();
    renderPrivacyCard();
  }
  function renderPrivacyCard() {
    var on = !!state.manager.publicContact;
    $('#pv-toggle').checked = on;
    $('#pv-text').textContent = on ? 'Dipaparkan (semasa pasukan belum lengkap)' : 'Tidak dipaparkan';
    renderErrorBox('privacy-error', []);
  }
  function onTogglePrivacy() {
    if (state.busy) return;
    var box = $('#pv-toggle');
    var want = box.checked;
    state.busy = true;
    call('apiUpdatePrivacy', state.token, want).then(function (res) {
      if (res.authRequired) return sessionExpired();
      if (res.ok) { applyDashboard(res); renderPrivacyCard(); state.dir = null; banner(res.message, 'ok', 5000); }
      else { box.checked = !want; renderErrorBox('privacy-error', res.errors); }
    }).catch(function (err) {
      box.checked = !want;
      renderErrorBox('privacy-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; });
  }
  var bannerTimer = null;
  function banner(msg, type, autoHideMs) {
    var b = $('#banner');
    clearTimeout(bannerTimer);
    if (!msg) { b.hidden = true; return; }
    b.className = 'banner ' + (type || 'info');
    b.textContent = msg;
    b.hidden = false;
    if (autoHideMs) bannerTimer = setTimeout(function () { b.hidden = true; }, autoHideMs);
  }
  function findSport(id) {
    return state.boot.sports.filter(function (s) { return s.id === id; })[0];
  }
  function cleanSpaces(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function normalizePhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.indexOf('0') === 0) d = '6' + d;
    return d;
  }
  function fmtPhone(p) {
    var d = String(p || '');
    if (d.indexOf('60') !== 0) return d;
    var local = '0' + d.slice(2);
    return local.slice(0, 3) + '-' + local.slice(3);
  }
  function initials(name) {
    var parts = cleanSpaces(name).split(' ').filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length > 2 ? 1 : parts.length - 1][0] : '')).toUpperCase();
  }
  function firstName(name) {
    var f = cleanSpaces(name).split(' ')[0] || '';
    return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
  }
  var PALETTE = {
    BOLA_JARING: ['#ff7a59', '#ff3d81'], BOLA_TAMPAR: ['#ffb830', '#ff7a1a'], CATUR: ['#a78bfa', '#6c5ce7'],
    ML: ['#38bdf8', '#2563eb'], PUBG: ['#34d399', '#059669'], ROAD_RELAY: ['#f472b6', '#db2777'], TARIK_TALI: ['#fbbf24', '#ef4444']
  };
  function colorsOf(sportId) { return PALETTE[sportId] || ['#7c5cff', '#22d3ee']; }
  function setBtn(btn, busy, busyText, idleText) {
    btn.disabled = busy;
    btn.textContent = busy ? busyText : idleText;
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Simpanan token (sessionStorage, fallback memori) ---------- */
  function makeStore(key) {
    var mem = null;
    return {
      get: function () { try { return window.sessionStorage.getItem(key) || mem; } catch (e) { return mem; } },
      set: function (t) { mem = t; try { window.sessionStorage.setItem(key, t); } catch (e) {} },
      clear: function () { mem = null; try { window.sessionStorage.removeItem(key); } catch (e) {} }
    };
  }
  var store = makeStore('sk_token');
  var adminStore = makeStore('sk_admin_token');

  /* ---------- Ralat ---------- */
  function renderErrorBox(boxId, errs) {
    var box = $('#' + boxId);
    if (!errs || !errs.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = '<strong>Sila betulkan perkara berikut:</strong><ul>' +
      errs.map(function (e) { return '<li>' + esc(e.message) + '</li>'; }).join('') + '</ul>';
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearInvalid(scope) { $$('input.invalid, select.invalid', scope || document).forEach(function (i) { i.classList.remove('invalid'); }); }
  function markFields(containers, errs, single) {
    errs.forEach(function (e) {
      var c = containers[single ? 0 : e.row];
      if (c && e.field) {
        var input = $('[name="' + e.field + '"]', c);
        if (input) input.classList.add('invalid');
      }
    });
  }
  function checkPerson(p, prefix, row, errs) {
    var idRe = new RegExp(state.boot.config.studentIdPattern);
    function bad(f, m) { errs.push({ row: row, field: f, message: prefix + m }); }
    var id = String(p.studentId || '').replace(/\s/g, '');
    var name = cleanSpaces(p.name);
    var prog = String(p.program || '').replace(/\s/g, '').toUpperCase();
    var fac = cleanSpaces(p.faculty);
    var phone = normalizePhone(p.phone);
    if (!id) bad('studentId', 'Nombor pelajar diperlukan.');
    else if (!idRe.test(id)) bad('studentId', 'Format nombor pelajar tidak sah (' + state.boot.config.studentIdHint + ').');
    if (name.length < 3) bad('name', 'Nama pelajar diperlukan.');
    if (!/^[A-Za-z0-9]{3,12}$/.test(prog)) bad('program', 'Kod program tidak sah (cth: CS110).');
    if (!fac) bad('faculty', 'Sila pilih fakulti.');
    else if (state.boot.faculties.indexOf(fac) < 0) bad('faculty', 'Sila pilih fakulti daripada senarai.');
    if (!/^601\d{8,9}$/.test(phone)) bad('phone', 'Nombor telefon tidak sah (cth: 012-3456789).');
    return id;
  }
  function personFromForm(container) {
    function v(n) { var el = $('[name="' + n + '"]', container); return el ? el.value : ''; }
    var o = { studentId: v('studentId'), name: v('name'), program: v('program'), faculty: v('faculty'), phone: v('phone') };
    if ($('input[name="email"]', container)) o.email = v('email');
    return o;
  }

  /* ---------- Dropdown fakulti ---------- */
  function buildFacultyOptions(list) {
    var html = '<option value="" selected>Pilih fakulti…</option>' +
      list.map(function (f) { return '<option value="' + esc(f) + '">' + esc(f) + '</option>'; }).join('');
    $$('select[name="faculty"]').forEach(function (sel) { sel.innerHTML = html; });
    var tplSel = $('#tpl-player').content.querySelector('select[name="faculty"]');
    if (tplSel) tplSel.innerHTML = html;
  }

  /* ---------- PIN (4 kotak) ---------- */
  function pinBoxes(id) { return $$('.pin[data-pin="' + id + '"] input'); }
  function pinValue(id) { return pinBoxes(id).map(function (i) { return i.value; }).join(''); }
  function markPin(id, on) {
    var el = $('.pin[data-pin="' + id + '"]');
    if (!el) return;
    el.classList.toggle('invalid', !!on);
    if (on) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  }
  function pinClear(id, focus) {
    pinBoxes(id).forEach(function (i) { i.value = ''; i.classList.remove('filled'); });
    if (focus) { var f = pinBoxes(id)[0]; if (f) f.focus({ preventScroll: true }); }
  }
  function weakPin(pin, phone) {
    if (!(state.boot && state.boot.config && state.boot.config.blockWeakPins)) return false;   // tiada sekatan PIN (lalai)
    if (/^(\d)\1{3}$/.test(pin)) return true;
    if ('0123456789'.indexOf(pin) >= 0 || '9876543210'.indexOf(pin) >= 0) return true;
    if (phone && String(phone).slice(-4) === pin) return true;
    return ['1212', '2580', '1004', '1122', '2024', '2025', '2026'].indexOf(pin) >= 0;
  }
  function initPins() {
    $$('.pin').forEach(function (el) {
      el.innerHTML = [0, 1, 2, 3].map(function (i) {
        return '<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" aria-label="Digit PIN ' + (i + 1) + '" data-i="' + i + '">';
      }).join('');
      el.addEventListener('input', function (e) {
        var t = e.target;
        t.value = t.value.replace(/\D/g, '').slice(-1);
        t.classList.toggle('filled', !!t.value);
        el.classList.remove('invalid');
        var i = Number(t.getAttribute('data-i'));
        if (t.value && i < 3) el.querySelectorAll('input')[i + 1].focus();
      });
      // pilih digit apabila fokus supaya menaip semula menggantikan digit sedia ada
      el.addEventListener('focusin', function (e) { if (e.target.select) e.target.select(); });
      el.addEventListener('click', function (e) { if (e.target.select) e.target.select(); });
      el.addEventListener('keydown', function (e) {
        var t = e.target, i = Number(t.getAttribute('data-i'));
        var inputs = el.querySelectorAll('input');
        if (e.key === 'Backspace' && !t.value && i > 0) { inputs[i - 1].value = ''; inputs[i - 1].classList.remove('filled'); inputs[i - 1].focus(); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' && i > 0) inputs[i - 1].focus();
        else if (e.key === 'ArrowRight' && i < 3) inputs[i + 1].focus();
      });
      el.addEventListener('paste', function (e) {
        var txt = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, 4);
        if (!txt) return;
        e.preventDefault();
        var inputs = el.querySelectorAll('input');
        for (var k = 0; k < 4; k++) { inputs[k].value = txt[k] || ''; inputs[k].classList.toggle('filled', !!txt[k]); }
        inputs[Math.min(txt.length, 3)].focus();
        el.classList.remove('invalid');
      });
    });
  }
  function mapPinErrors(errs, map) {
    errs.forEach(function (e) { if (e.field && map[e.field]) markPin(map[e.field], true); });
  }

  /* ============================================================
   *  INIT
   * ============================================================ */
  function showLoadError(title, detail) {
    var l = $('#loading');
    l.hidden = false;
    l.innerHTML = '<p><strong>' + esc(title) + '</strong></p>' +
      (detail ? '<p><small>' + esc(detail) + '</small></p>' : '') +
      '<button type="button" class="btn" id="btn-reload">Cuba lagi</button>';
    $('#btn-reload').addEventListener('click', function () { window.location.reload(); });
  }

  window.addEventListener('error', function (e) {
    var l = $('#loading');
    if (l && !l.hidden) showLoadError('Ralat pada halaman', e.message);
  });

  function applyBranding() {
    var b = state.boot;
    $$('[data-bind="team"]').forEach(function (el) { el.textContent = b.teamName; });
    $$('[data-bind="college"]').forEach(function (el) { el.textContent = b.college; });
    $$('[data-bind="title"]').forEach(function (el) { el.textContent = b.title; });
    var parts = String(b.teamName).split(' ');
    var h = $('#hero-title');
    if (h) {
      h.innerHTML = parts.length > 1
        ? esc(parts[0]) + ' <span class="grad-text">' + esc(parts.slice(1).join(' ')) + '</span>'
        : '<span class="grad-text">' + esc(parts[0]) + '</span>';
    }
  }

  /**
   * Tentukan halaman (manager / admin). Utama: nilai dari pelayan (?page=admin).
   * Sandaran: baca parameter URL pelayar melalui google.script.url.getLocation.
   */
  function resolvePage(done) { done(); }

  function startApp() {
    var token = store.get();
    if (!token) return showAuth();
    return call('apiGetDashboard', token).then(function (d) {
      if (d.ok) { state.token = token; enterDashboard(d); } else { store.clear(); showAuth(); }
    });
  }

  function goAdmin() {
    PAGE = 'admin';
    $('#session-bar').hidden = true;
    banner('');
    startAdmin();
  }
  function goManager() {
    PAGE = 'app';
    clearInterval(adminTimer); adminTimer = null;
    $('#session-bar').hidden = true;
    banner('');
    startApp();
  }

  var started = false;
  function init() {
    if (started) return;
    started = true;

    // Manager: auth
    $$('.tab').forEach(function (t) { t.addEventListener('click', function () { switchTab(t.getAttribute('data-tab')); }); });
    $$('[data-tab-link]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); switchTab(a.getAttribute('data-tab-link')); });
    });
    initPins();
    $('#login-form').addEventListener('submit', function (e) { e.preventDefault(); onLogin(); });
    $('#forgot-form').addEventListener('submit', function (e) { e.preventDefault(); onForgot(); });
    $('#forgot-phone').addEventListener('input', function (e) { e.target.classList.remove('invalid'); });
    $('#btn-pin-edit').addEventListener('click', openPinForm);
    $('#btn-pin-cancel').addEventListener('click', closePinForm);
    $('#pin-form').addEventListener('submit', function (e) { e.preventDefault(); onSavePin(); });
    $('#register-form').addEventListener('submit', function (e) { e.preventDefault(); onRegister(); });
    $('#register-form').addEventListener('input', onFieldInput);
    $('#register-form').addEventListener('change', onFieldInput);
    $('#register-form').addEventListener('focusout', onFieldBlur);
    $('#login-phone').addEventListener('input', function (e) { e.target.classList.remove('invalid'); });
    $('#btn-logout').addEventListener('click', function () { PAGE === 'admin' ? adminLogout() : logout(); });

    // Manager: dashboard
    $('#sports-grid').addEventListener('click', onGridClick);
    $('#my-teams').addEventListener('click', onMyTeamsClick);
    $('#btn-refresh').addEventListener('click', refreshDashboard);
    $('#btn-back').addEventListener('click', function () { renderDashboard(); show('list'); });
    $('#btn-again').addEventListener('click', function () { renderDashboard(); show('list'); });
    $('#btn-add-more').addEventListener('click', function () {
      var sid = this.getAttribute('data-sport'), tm = this.getAttribute('data-team');
      var team = state.myTeams.filter(function (t) { return t.sportId === sid && t.team === tm; })[0];
      if (team) openForm(sid, tm, team.players);
    });
    $('#btn-email-edit').addEventListener('click', openEmailForm);
    $('#btn-email-cancel').addEventListener('click', closeEmailForm);
    $('#email-form').addEventListener('submit', function (e) { e.preventDefault(); onSaveEmail(); });

    // Manager: borang pasukan
    $('#btn-copy').addEventListener('click', copyFromFirst);
    $('#team-form').addEventListener('submit', function (e) { e.preventDefault(); onSubmit(); });
    $('#players').addEventListener('input', onFieldInput);
    $('#players').addEventListener('input', updateProgress);
    $('#players').addEventListener('change', updateProgress);
    $('#players').addEventListener('change', onFieldInput);
    $('#players').addEventListener('focusout', onFieldBlur);

    // Sidebar, senarai pasukan, tetapan
    $('#sb-nav').addEventListener('click', onNavClick);
    $('#btn-menu').addEventListener('click', function () { document.body.classList.toggle('sb-open'); });
    $('#sb-backdrop').addEventListener('click', function () { document.body.classList.remove('sb-open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.body.classList.remove('sb-open'); });
    $('#btn-dir-refresh').addEventListener('click', loadDirectory);
    $('#pv-toggle').addEventListener('change', onTogglePrivacy);
    $('#view-jersey').addEventListener('click', onJerseyClick);
    $('#j-form').addEventListener('submit', onJerseySubmit);
    $('#j-lookup-form').addEventListener('submit', onJerseyLookup);
    $('#ji-form').addEventListener('submit', onInterestSubmit);
    $('#j-qty').addEventListener('input', updateJTotal);
    $('#j-form').elements.printName.addEventListener('input', function (e) { var c = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(c, c); });
    $('#j-form').elements.number.addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });
    $('#lightbox').addEventListener('click', function () { $('#lightbox').hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#lightbox').hidden = true; });
    $('#view-admin').addEventListener('change', function (e) {
      var sel = e.target.closest('select[data-jid]');
      if (!sel) return;
      adminAction('apiAdminSetJerseyStatus', { id: sel.getAttribute('data-jid'), status: sel.value });
    });
    document.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-dirfilter]');
      if (chip) { state.dirFilter[chip.getAttribute('data-dirkey')] = chip.getAttribute('data-dirfilter'); renderDirectories(); return; }
      if (e.target.closest('[data-goto-register]')) { showAuth(); switchTab('register'); }
      if (e.target.closest('[data-goto-jersey]')) { document.body.classList.remove('sb-open'); openJersey(); }
    });

    // Admin
    $('#link-admin').addEventListener('click', function (e) { e.preventDefault(); goAdmin(); });
    $('#link-manager').addEventListener('click', function (e) { e.preventDefault(); goManager(); });
    $('#alogin-form').addEventListener('submit', function (e) { e.preventDefault(); onAdminLogin(); });
    $('#view-admin').addEventListener('click', onAdminClick);
    $('#a-refresh').addEventListener('click', function () { refreshAdmin(false); });

    var slowTimer = setTimeout(function () {
      showLoadError('Sistem lambat membalas',
        'Pelayan tidak menjawab dalam 20 saat. Pastikan anda log masuk dengan SATU akaun Google sahaja dan menggunakan URL deployment terkini (berakhir /exec).');
    }, 20000);

    call('apiGetBootstrap').then(function (b) {
      clearTimeout(slowTimer);
      state.boot = b;
      applyBranding();
      applyLogo(b.logo, b.logoTile);
      renderJerseyPromo();
      buildFacultyOptions(b.faculties);
      $('#foot-admin').hidden = (b.showAdminLink === false);
      $('#landing-dir').hidden = !b.config.publicDirectory;
      $('#reg-public').checked = !!b.config.contactDefaultPublic;
      return new Promise(resolvePage).then(function () {
        return PAGE === 'admin' ? startAdmin() : startApp();
      });
    }).catch(function (err) {
      clearTimeout(slowTimer);
      showLoadError('Gagal memuatkan sistem', err && err.message ? err.message : String(err));
    });
  }

  /* ============================================================
   *  MANAGER: AUTH
   * ============================================================ */
  function applyLogo(uri, tile) {
    if (!uri || uri.indexOf('data:image/') !== 0) return;     // tiada logo -> kekal emoji
    $$('.logo:not([data-keep])').forEach(function (el) {
      var img = new Image();
      img.alt = 'Logo ' + (state.boot && state.boot.teamName ? state.boot.teamName : '');
      img.decoding = 'async';
      img.onerror = function () { el.classList.remove('has-img', 'tile'); el.textContent = '🏆'; };   // jika rosak, kembali ke emoji
      img.src = uri;
      el.textContent = '';
      el.appendChild(img);
      el.classList.add('has-img');
      if (tile === true) el.classList.add('tile');
    });
  }

  /* ============================================================
   *  JERSI
   * ============================================================ */
  function rm(n) { return 'RM ' + Number(n || 0).toFixed(2); }

  function openJersey() {
    show('jersey');
    $('#j-done').hidden = true;
    $('#ji-done').hidden = true;
    renderJersey();
    if (!state.jmedia) {
      call('apiGetJerseyMedia').then(function (m) { if (m && m.ok) { state.jmedia = m; renderJerseyMedia(); } }).catch(function () {});
    } else renderJerseyMedia();
    call('apiGetJersey').then(function (info) {
      if (!info || !info.ok) throw new Error('fail');
      state.jinfo = info;
      state.boot.jersey = Object.assign(state.boot.jersey || {}, { show: info.show, open: info.open, reason: info.reason,
                                        interestOpen: !!(info.interest && info.interest.open), price: info.price });
      renderJersey();
      renderNav();
      renderJerseyPromo();
    }).catch(function () {
      $('#j-status').innerHTML = '<span class="js-ico">⚠️</span><div><strong>Gagal memuatkan maklumat jersi</strong><p>Sila cuba lagi sebentar.</p></div>';
    });
  }

  /** Kad promosi jersi (halaman utama) + butang 'Jersi' di bar atas telefon. */
  function renderJerseyPromo() {
    var jz = (state.boot && state.boot.jersey) || {};
    var promo = $('#jersey-promo'), tb = $('#tb-jersey');
    var visible = !!jz.show && jz.reason !== 'ended' && jz.reason !== 'hidden';
    promo.hidden = !visible;
    tb.hidden = !jz.show || jz.reason === 'hidden';
    $('#tb-dot').hidden = !(jz.open || jz.interestOpen);
    if (!visible) return;
    if (jz.thumb && $('#jp-thumb').getAttribute('src') !== jz.thumb) $('#jp-thumb').src = jz.thumb;
    $('#jp-thumb').hidden = !jz.thumb;
    if (jz.open) {
      $('#jp-sub').innerHTML = 'Tempahan kini <b>DIBUKA</b>' + (jz.price != null ? ' &middot; RM ' + Number(jz.price).toFixed(2) + ' seunit' : '');
      $('#jp-cta').innerHTML = 'Tempah sekarang &rarr;';
    } else if (jz.interestOpen) {
      $('#jp-sub').textContent = 'Tempahan belum dibuka. Berminat? Daftar minat anda dahulu.';
      $('#jp-cta').innerHTML = 'Daftar minat &rarr;';
    } else {
      $('#jp-sub').textContent = 'Lihat rekaan jersi rasmi. Tempahan akan dibuka tidak lama lagi.';
      $('#jp-cta').innerHTML = 'Lihat jersi &rarr;';
    }
  }

  function setImg(el, uri, alt) {
    if (!uri) { el.innerHTML = '<span class="j-ph">Gambar belum tersedia</span>'; el.removeAttribute('data-src'); return; }
    var img = new Image(); img.alt = alt; img.decoding = 'async'; img.src = uri;
    el.innerHTML = ''; el.appendChild(img); el.setAttribute('data-src', uri);
  }
  function renderJerseyMedia() {
    setImg($('#j-design'), state.jmedia.design, 'Rekaan jersi ' + state.boot.teamName);
    setImg($('#j-mockup'), state.jmedia.mockup, 'Mockup pemain memakai jersi');
  }

  function jUnit() {
    var i = state.jinfo, s = state.jsel;
    if (!i || i.price == null) return null;
    var sl = i.sleeves.filter(function (x) { return x.name === s.sleeve; })[0];
    return i.price + Number((i.sizeExtra || {})[s.size] || 0) + Number(sl ? sl.extra : 0);
  }
  function jQty() {
    var q = parseInt($('#j-qty').value, 10);
    return isNaN(q) ? 1 : Math.max(1, Math.min(state.jinfo ? state.jinfo.maxQty : 1, q));
  }
  function updateJTotal() {
    var u = jUnit(), q = jQty();
    $('#j-total').textContent = u == null ? '—' : rm(u * q);
    $('#j-unit').textContent = u == null ? '' : (state.jsel.size && state.jsel.sleeve ? rm(u) + ' × ' + q : 'Pilih saiz & lengan');
  }

  function renderJChips() {
    var i = state.jinfo, s = state.jsel;
    $('#j-sizes').innerHTML = i.sizes.map(function (z) {
      var ex = Number((i.sizeExtra || {})[z] || 0);
      return '<button type="button" class="j-chip' + (s.size === z ? ' on' : '') + '" data-val="' + esc(z) + '">' + esc(z) +
        (ex ? '<small>+' + rm(ex) + '</small>' : '') + '</button>';
    }).join('');
    $('#j-sleeves').innerHTML = i.sleeves.map(function (x) {
      return '<button type="button" class="j-chip' + (s.sleeve === x.name ? ' on' : '') + '" data-val="' + esc(x.name) + '">' + esc(x.name) +
        (x.extra ? '<small>+' + rm(x.extra) + '</small>' : '') + '</button>';
    }).join('');
  }

  function renderJersey() {
    var i = state.jinfo;
    var st = $('#j-status');
    if (!i) {
      st.className = 'j-status';
      st.innerHTML = '<span class="js-ico">⏳</span><div><strong>Memuatkan…</strong></div>';
      $('#j-info').innerHTML = ''; $('#j-form').hidden = true; $('#j-lookup').hidden = true;
      return;
    }
    var msg = i.open
      ? ['✅', 'Tempahan dibuka', i.closeAtText ? 'Tempahan ditutup pada ' + i.closeAtText + '. Isi borang di bawah.' : 'Isi borang di bawah untuk membuat tempahan.']
      : ({ ended: ['⛔', 'Tempahan telah ditutup', 'Terima kasih kepada semua yang telah membuat tempahan.'] }[i.reason] ||
         ['🔒', 'Tempahan belum dibuka', (i.note || 'Tempahan akan dibuka tidak lama lagi.')]);
    var it = i.interest || {};
    if (!i.open && it.open) msg[2] += ' Berminat? Daftar minat anda di bawah.';
    var cnt = (it.count ? '<span class="j-count">👥 ' + it.count + ' pelajar berminat &middot; ' + it.pieces + ' helai</span>' : '');
    st.className = 'j-status' + (i.open ? ' open' : '');
    st.innerHTML = '<span class="js-ico">' + msg[0] + '</span><div><strong>' + esc(msg[1]) + '</strong><p>' + esc(msg[2]) + '</p>' + (i.open ? '' : cnt) + '</div>';

    var tbc = '<b class="tbc">Akan dimaklumkan</b>';
    var sleeves = i.sleeves.map(function (x) { return esc(x.name) + (x.extra ? ' (+' + rm(x.extra) + ')' : ''); }).join(' / ');
    var printing = [i.allowName ? 'Nama' : '', i.allowNumber ? 'Nombor' : ''].filter(Boolean).join(' &amp; ') || 'Tiada';
    $('#j-info').innerHTML =
      '<div class="j-card"><span>Harga seunit</span>' + (i.price != null ? '<b>' + rm(i.price) + '</b>' : tbc) + '</div>' +
      '<div class="j-card"><span>Saiz</span><b>' + esc(i.sizes[0] + ' – ' + i.sizes[i.sizes.length - 1]) + '</b></div>' +
      '<div class="j-card"><span>Lengan</span><b>' + sleeves + '</b></div>' +
      '<div class="j-card"><span>Cetakan belakang</span><b>' + printing + '</b></div>' +
      (i.paymentInfo ? '<div class="j-card j-pay"><span>Pembayaran</span><p>' + esc(i.paymentInfo) + '</p></div>' : '');

    var form = $('#j-form');
    form.hidden = !i.open || !$('#j-done').hidden;
    if (i.open) {
      var oneSleeve = i.sleeves.length === 1;
      if (oneSleeve) state.jsel.sleeve = i.sleeves[0].name;          // satu pilihan sahaja -> tidak perlu dipilih
      $('#j-sleeves').parentNode.hidden = oneSleeve;
      renderJChips();
      $('#j-f-name').hidden = !i.allowName;
      $('#j-f-num').hidden = !i.allowNumber;
      $('#j-print').hidden = !i.allowName && !i.allowNumber;
      form.elements.printName.maxLength = i.nameMax || 12;
      var m = state.manager;
      if (m) {
        [['name', m.name], ['studentId', m.studentId], ['phone', fmtPhone(m.phone)], ['email', m.email], ['faculty', m.faculty]]
          .forEach(function (p) { var el = form.elements[p[0]]; if (el && !el.value && p[1]) el.value = p[1]; });
      }
      updateJTotal();
    }
    $('#j-lookup').hidden = !i.lookup;

    // daftar minat (semasa tempahan belum dibuka)
    var jf = $('#ji-form');
    jf.hidden = !it.open || !$('#ji-done').hidden;
    if (it.open) {
      renderIChips();
      var mm = state.manager;
      if (mm) {
        [['name', mm.name], ['studentId', mm.studentId], ['phone', fmtPhone(mm.phone)], ['email', mm.email], ['faculty', mm.faculty]]
          .forEach(function (p) { var el = jf.elements[p[0]]; if (el && !el.value && p[1]) el.value = p[1]; });
      }
    }
  }

  function renderIChips() {
    var it = state.jinfo.interest, s = state.isel;
    $('#ji-sizes').innerHTML = it.sizes.map(function (z) {
      return '<button type="button" class="j-chip' + (s.size === z ? ' on' : '') + '" data-val="' + esc(z) + '">' + esc(z) + '</button>';
    }).join('');
    $('#ji-budget').innerHTML = it.budgets.map(function (b) {
      return '<button type="button" class="j-chip' + (s.budget === b ? ' on' : '') + '" data-val="' + esc(b) + '">' + esc(b) + '</button>';
    }).join('');
    $('#ji-budget').parentNode.hidden = !it.budgets.length;
  }

  function onInterestSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    var f = $('#ji-form');
    clearInvalid(f); $('#ji-sizes').classList.remove('invalid'); $('#ji-budget').classList.remove('invalid');
    renderErrorBox('ji-error', []);
    var p = { name: f.elements.name.value, studentId: f.elements.studentId.value, phone: f.elements.phone.value,
              email: f.elements.email.value, faculty: f.elements.faculty.value,
              size: state.isel.size, budget: state.isel.budget, qty: f.elements.qty.value };
    var btn = $('#btn-ji-submit');
    state.busy = true; btn.disabled = true; btn.textContent = 'Menghantar…';
    call('apiSubmitInterest', p).then(function (res) {
      if (res.ok) {
        if (state.jinfo && state.jinfo.interest && res.count != null) { state.jinfo.interest.count = res.count; state.jinfo.interest.pieces = res.pieces; }
        $('#ji-done').innerHTML = '<div class="eyebrow">' + (res.updated ? 'Dikemaskini ✅' : 'Terima kasih! 🎉') + '</div>' +
          '<h3 class="form-h">' + esc(res.message) + '</h3>' +
          '<p class="muted">Anda akan dimaklumkan apabila tempahan dibuka' + (p.email ? ' (emel: ' + esc(p.email) + ')' : '') + '. Ini bukan tempahan &mdash; tiada bayaran diperlukan sekarang.</p>' +
          (res.count ? '<p><span class="j-count">👥 ' + res.count + ' pelajar berminat &middot; ' + res.pieces + ' helai</span></p>' : '') +
          '<button type="button" class="btn btn-ghost" id="btn-ji-edit">Ubah jawapan saya</button>';
        $('#ji-done').hidden = false; f.hidden = true;
        renderJersey();
        $('#ji-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (res.closed) {
        state.jinfo = null; openJersey(); banner(res.errors[0].message, 'info', 6000);
      } else {
        markFields([f], res.errors, true);
        res.errors.forEach(function (x) {
          if (x.field === 'size') $('#ji-sizes').classList.add('invalid');
          if (x.field === 'budget') $('#ji-budget').classList.add('invalid');
        });
        renderErrorBox('ji-error', res.errors);
      }
    }).catch(function (err) {
      renderErrorBox('ji-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; btn.disabled = false; btn.textContent = 'Daftar minat'; });
  }

  function receiptHtml(o) {
    var rows = [['ID Tempahan', o.id], ['Status', o.status], ['Saiz', o.size], ['Lengan', o.sleeve],
                ['Nama cetakan', o.printName || '—'], ['No. jersi', o.number === '' ? '—' : o.number],
                ['Kuantiti', o.qty], ['Jumlah', rm(o.total)]];
    return '<table class="j-receipt">' + rows.map(function (r) {
      var v = r[0] === 'Status' ? '<span class="pill ' + (r[1] === 'Dibayar' ? 'ok' : r[1] === 'Batal' ? 'bad' : 'warn') + '">' +
        esc(r[1] === 'Baru' ? 'Belum bayar' : r[1]) + '</span>' : '<b>' + esc(String(r[1])) + '</b>';
      return '<tr><td>' + esc(r[0]) + '</td><td>' + v + '</td></tr>';
    }).join('') + '</table>';
  }

  function onJerseySubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    var f = $('#j-form');
    clearInvalid(f); $('#j-sizes').classList.remove('invalid'); $('#j-sleeves').classList.remove('invalid');
    renderErrorBox('j-error', []);
    var p = {
      name: f.elements.name.value, studentId: f.elements.studentId.value, phone: f.elements.phone.value,
      email: f.elements.email.value, faculty: f.elements.faculty.value,
      size: state.jsel.size, sleeve: state.jsel.sleeve,
      printName: f.elements.printName.value, number: f.elements.number.value, qty: jQty()
    };
    var btn = $('#btn-j-submit');
    state.busy = true; btn.disabled = true; btn.textContent = 'Menghantar…';
    call('apiSubmitJerseyOrder', p).then(function (res) {
      if (res.ok) {
        var o = res.order;
        var mail = res.email && res.email.sent ? '<p class="muted">Resit telah dihantar ke ' + esc(res.email.to) + '.</p>' : '';
        $('#j-done').innerHTML = '<div class="eyebrow">Tempahan diterima 🎉</div><div class="big-id">' + esc(o.id) + '</div>' +
          '<p class="j-ref">Tulis <b>' + esc(o.id) + '</b> sebagai <b>rujukan pembayaran</b> semasa membuat bayaran.</p>' +
          '<p class="muted">Simpan ID ini untuk semakan status tempahan.</p>' + receiptHtml(o) +
          (res.paymentInfo ? '<div class="j-card j-pay" style="text-align:left;margin:12px auto;max-width:520px"><span>Pembayaran</span><p>' + esc(res.paymentInfo) + '</p></div>' : '') +
          mail + '<button type="button" class="btn btn-ghost" id="btn-j-again">Buat tempahan lain</button>';
        $('#j-done').hidden = false; f.hidden = true;
        f.elements.printName.value = ''; f.elements.number.value = ''; $('#j-qty').value = '1';
        $('#j-done').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (res.closed) {
        state.jinfo = null; openJersey();
        banner(res.errors[0].message, 'error', 6000);
      } else {
        markFields([f], res.errors, true);
        res.errors.forEach(function (x) {
          if (x.field === 'size') $('#j-sizes').classList.add('invalid');
          if (x.field === 'sleeve') $('#j-sleeves').classList.add('invalid');
        });
        renderErrorBox('j-error', res.errors);
      }
    }).catch(function (err) {
      renderErrorBox('j-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; btn.disabled = false; btn.textContent = 'Hantar tempahan'; });
  }

  function onJerseyLookup(e) {
    e.preventDefault();
    var f = $('#j-lookup-form'), out = $('#j-lookup-out');
    out.innerHTML = '<p class="muted">Menyemak…</p>';
    call('apiCheckJerseyOrder', f.elements.lid.value, f.elements.lphone.value).then(function (res) {
      out.innerHTML = res.ok ? receiptHtml(res.order) : '<div class="error-box">' + esc(res.errors[0].message) + '</div>';
    }).catch(function () { out.innerHTML = '<div class="error-box">Ralat sambungan. Cuba lagi.</div>'; });
  }

  function onJerseyClick(e) {
    var chip = e.target.closest('.j-chips .j-chip');
    if (chip) {
      var group = chip.parentNode.getAttribute('data-name');
      var isI = chip.parentNode.getAttribute('data-group') === 'i';
      (isI ? state.isel : state.jsel)[group] = chip.getAttribute('data-val');
      chip.parentNode.classList.remove('invalid');
      if (isI) renderIChips(); else { renderJChips(); updateJTotal(); }
      return;
    }
    var qb = e.target.closest('[data-qty]');
    if (qb) {
      var qi = qb.closest('form').elements.qty;
      var cur = parseInt(qi.value, 10) || 1;
      qi.value = Math.max(1, Math.min(state.jinfo.maxQty, cur + Number(qb.getAttribute('data-qty'))));
      updateJTotal(); return;
    }
    if (e.target.id === 'btn-ji-edit') { $('#ji-done').hidden = true; $('#ji-form').hidden = false; $('#ji-form').scrollIntoView({ behavior: 'smooth' }); return; }
    var z = e.target.closest('[data-zoom]');
    if (z && z.getAttribute('data-src')) {
      var lb = $('#lightbox'); $('img', lb).src = z.getAttribute('data-src'); $('img', lb).alt = z.getAttribute('aria-label'); lb.hidden = false;
      return;
    }
    if (e.target.id === 'btn-j-again') { $('#j-done').hidden = true; $('#j-form').hidden = false; $('#j-form').scrollIntoView({ behavior: 'smooth' }); }
  }

  function showAuth(msg) {
    $('#session-bar').hidden = true;
    banner('');
    switchTab('login');
    if (msg) renderErrorBox('login-error', [{ message: msg }]);
    show('auth');
    if (state.boot && state.boot.config.publicDirectory) { renderDirectories(); loadDirectory(); }
  }

  function switchTab(name) {
    var tab = name === 'register' ? 'register' : 'login';
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === tab); });
    $('#login-form').hidden = (name !== 'login');
    $('#register-form').hidden = (name !== 'register');
    $('#forgot-form').hidden = (name !== 'forgot');
    $('.tabs').setAttribute('data-active', tab);
    var f;
    if (name === 'login') f = $('#login-phone');
    else if (name === 'register') f = $('#register-form input');
    else {
      f = $('#forgot-phone');
      if (!f.value) f.value = $('#login-phone').value;
      renderErrorBox('forgot-error', []);
      $('#forgot-ok').hidden = true;
    }
    if (f) f.focus({ preventScroll: true });
  }

  function onLogin() {
    if (state.busy) return;
    var input = $('#login-phone');
    var phone = normalizePhone(input.value);
    var pin = pinValue('login-pin');
    input.classList.remove('invalid');
    markPin('login-pin', false);
    var errs = [];
    if (!/^601\d{8,9}$/.test(phone)) { input.classList.add('invalid'); errs.push({ message: 'Nombor telefon tidak sah (cth: 012-3456789).' }); }
    if (!/^\d{4}$/.test(pin)) { markPin('login-pin', true); errs.push({ message: 'Masukkan PIN 4 digit.' }); }
    if (errs.length) { renderErrorBox('login-error', errs); return; }
    renderErrorBox('login-error', []);
    state.busy = true;
    var btn = $('#btn-login');
    setBtn(btn, true, 'Menyemak…', 'Log Masuk');
    call('apiLogin', input.value, pin).then(function (res) {
      if (res.ok) {
        state.token = res.token; store.set(res.token);
        input.value = ''; pinClear('login-pin');
        enterDashboard(res);
      } else {
        var f = res.errors && res.errors[0] && res.errors[0].field;
        if (f === 'phone') input.classList.add('invalid');
        pinClear('login-pin', true);
        if (f === 'pin' || res.locked) markPin('login-pin', true);
        renderErrorBox('login-error', res.errors);
      }
    }).catch(function (err) {
      renderErrorBox('login-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; setBtn(btn, false, '', 'Log Masuk'); });
  }

  function onForgot() {
    if (state.busy) return;
    var input = $('#forgot-phone');
    var phone = normalizePhone(input.value);
    input.classList.remove('invalid');
    $('#forgot-ok').hidden = true;
    if (!/^601\d{8,9}$/.test(phone)) {
      input.classList.add('invalid');
      renderErrorBox('forgot-error', [{ message: 'Nombor telefon tidak sah (cth: 012-3456789).' }]);
      return;
    }
    renderErrorBox('forgot-error', []);
    state.busy = true;
    var btn = $('#btn-forgot');
    setBtn(btn, true, 'Menghantar…', 'Hantar PIN ke emel');
    call('apiForgotPin', input.value).then(function (res) {
      if (res.ok) {
        var ok = $('#forgot-ok');
        ok.textContent = '📧 ' + res.message;
        ok.hidden = false;
      } else {
        input.classList.add('invalid');
        renderErrorBox('forgot-error', res.errors);
      }
    }).catch(function (err) {
      renderErrorBox('forgot-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; setBtn(btn, false, '', 'Hantar PIN ke emel'); });
  }

  function onRegister() {
    if (state.busy) return;
    var form = $('#register-form');
    clearInvalid(form);
    markPin('reg-pin', false); markPin('reg-pin2', false);
    var p = personFromForm(form);
    p.pin = pinValue('reg-pin'); p.pin2 = pinValue('reg-pin2');
    p.publicContact = $('#reg-public').checked;
    var errs = [];
    checkPerson(p, '', null, errs);
    if (!EMAIL_RE.test(cleanSpaces(p.email).toLowerCase())) {
      errs.push({ row: null, field: 'email', message: 'Format emel tidak sah (cth: nama@gmail.com).' });
    }
    if (!/^\d{4}$/.test(p.pin)) errs.push({ row: null, field: 'pin', message: 'PIN mesti tepat 4 digit.' });
    else if (weakPin(p.pin, normalizePhone(p.phone))) errs.push({ row: null, field: 'pin', message: 'PIN terlalu mudah diteka (cth: 1234, 1111 atau 4 digit akhir telefon). Pilih PIN lain.' });
    else if (p.pin !== p.pin2) errs.push({ row: null, field: 'pin2', message: 'Pengesahan PIN tidak sama.' });
    if (errs.length) { markFields([form], errs, true); mapPinErrors(errs, { pin: 'reg-pin', pin2: 'reg-pin2' }); renderErrorBox('register-error', errs); return; }
    renderErrorBox('register-error', []);

    state.busy = true;
    var btn = $('#btn-register');
    setBtn(btn, true, 'Mendaftar…', 'Daftar & Log Masuk');
    call('apiRegisterManager', p).then(function (res) {
      if (res.ok) {
        state.token = res.token; store.set(res.token);
        form.reset(); pinClear('reg-pin'); pinClear('reg-pin2');
        $('#reg-public').checked = !!state.boot.config.contactDefaultPublic;
        enterDashboard(res);
        banner('Pendaftaran manager berjaya. Sila ingat PIN anda. Pilih sukan untuk mendaftarkan atlet.', 'ok', 7000);
      } else {
        var errs2 = res.errors || [{ message: 'Pendaftaran gagal.' }];
        markFields([form], errs2, true);
        mapPinErrors(errs2, { pin: 'reg-pin', pin2: 'reg-pin2' });
        renderErrorBox('register-error', errs2);
      }
    }).catch(function (err) {
      renderErrorBox('register-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; setBtn(btn, false, '', 'Daftar & Log Masuk'); });
  }

  function logout() {
    var t = state.token;
    if (t) call('apiLogout', t).catch(function () {});
    clearSession();
    showAuth();
  }
  function clearSession() {
    store.clear();
    state.token = null; state.manager = null; state.status = null; state.myTeams = [];
  }
  function sessionExpired(msg) {
    clearSession();
    showAuth(msg || 'Sesi tamat. Sila log masuk semula.');
  }

  function onFieldInput(e) {
    var t = e.target;
    if (t.classList) t.classList.remove('invalid');
    if (t.name === 'program') t.value = t.value.toUpperCase().replace(/\s/g, '');
    if (t.name === 'studentId') t.value = t.value.replace(/\s/g, '');
  }
  function onFieldBlur(e) {
    var t = e.target;
    if (t.name === 'name') t.value = cleanSpaces(t.value).toUpperCase();
    if (t.name === 'faculty') t.value = cleanSpaces(t.value);
    if (t.name === 'email') t.value = cleanSpaces(t.value).toLowerCase();
  }

  /* ============================================================
   *  MANAGER: DASHBOARD
   * ============================================================ */
  function applyDashboard(d) {
    state.manager = d.manager;
    state.status = d.status;
    state.myTeams = d.myTeams || [];
    state.open = d.open;
    state.canRegister = d.canRegister;
    state.canEdit = d.canEdit;
    state.maxTeams = d.maxTeams;
    $('#sb-name').textContent = d.manager.name;
    $('#sb-phone').textContent = fmtPhone(d.manager.phone);
    $('#sb-avatar').textContent = initials(d.manager.name);
    $('#greet-name').textContent = 'Hai, ' + firstName(d.manager.name) + ' 👋';
    $('#session-bar').hidden = false;
  }

  function enterDashboard(d) {
    applyDashboard(d);
    renderDashboard();
    show('list');
  }

  function incompleteTeams() { return state.myTeams.filter(function (t) { return !t.complete; }); }

  function renderBanner() {
    var inc = incompleteTeams();
    var incMsg = inc.length
      ? 'Pasukan ' + inc.map(function (t) { return t.sport + ' ' + t.team + ' (' + t.players.length + '/' + t.pax + ' atlet)'; }).join(', ') + ' belum lengkap.'
      : '';
    if (!state.open) banner('Pendaftaran telah ditutup.' + (incMsg ? ' ' + incMsg : ''), 'error');
    else if (state.manager && !state.manager.email) banner('Sila tambah emel anda di menu Tetapan supaya emel pengesahan dapat dihantar.', 'info');
    else if (incMsg) banner(incMsg + ' Sila tambah atlet' + (state.boot.closeAtText ? ' sebelum ' + state.boot.closeAtText : ' sebelum pendaftaran ditutup') + '.', 'info');
    else if (!state.canRegister) banner('Anda telah mencapai had ' + state.maxTeams + ' pasukan bagi seorang manager.', 'ok');
    else if (state.boot.closeAtText) banner('Pendaftaran ditutup pada ' + state.boot.closeAtText + '.', 'info');
    else banner('');
  }

  function renderDashboard() {
    renderBanner();
    renderStats();
    renderMyTeams();
    renderSports();
  }

  function renderStats() {
    var total = 0, taken = 0;
    state.boot.sports.forEach(function (s) {
      state.boot.teams.forEach(function (t) { total++; if (state.status[s.id][t].registered) taken++; });
    });
    $('#stats').innerHTML =
      '<div class="stat"><b>' + taken + ' / ' + total + '</b><span>Pasukan didaftar</span></div>' +
      '<div class="stat"><b>' + (total - taken) + '</b><span>Slot masih kosong</span></div>' +
      (state.myTeams.length
        ? '<div class="stat"><b>' + state.myTeams.reduce(function (n, t) { return n + t.players.length; }, 0) + ' / ' +
          state.myTeams.reduce(function (n, t) { return n + t.pax; }, 0) + '</b><span>Atlet pasukan anda</span></div>'
        : '<div class="stat"><b>0</b><span>Pasukan anda</span></div>');
  }

  /* ---------- Emel ---------- */
  function renderEmailCard() {
    var m = state.manager;
    $('#ec-email').textContent = m.email || 'Belum ditetapkan — sila tambah emel';
    $('#btn-email-edit').textContent = m.email ? 'Tukar' : 'Tambah';
    closeEmailForm();
    renderErrorBox('email-error', []);
    if (!m.email) openEmailForm();
  }
  function openEmailForm() {
    $('#email-form').hidden = false;
    $('#btn-email-edit').hidden = true;
    var inp = $('#email-form input');
    inp.value = state.manager.email || '';
    inp.classList.remove('invalid');
    inp.focus({ preventScroll: true });
  }
  function closeEmailForm() {
    $('#email-form').hidden = true;
    $('#btn-email-edit').hidden = false;
    renderErrorBox('email-error', []);
  }
  function onSaveEmail() {
    if (state.busy) return;
    var inp = $('#email-form input');
    var email = cleanSpaces(inp.value).toLowerCase();
    inp.classList.remove('invalid');
    if (!EMAIL_RE.test(email)) {
      inp.classList.add('invalid');
      renderErrorBox('email-error', [{ message: 'Format emel tidak sah (cth: nama@gmail.com).' }]);
      return;
    }
    state.busy = true;
    var btn = $('#btn-email-save');
    setBtn(btn, true, 'Menyimpan…', 'Simpan');
    call('apiUpdateEmail', state.token, email).then(function (res) {
      if (res.authRequired) return sessionExpired();
      if (res.ok) { applyDashboard(res); renderSettings(); banner('Emel pengesahan dikemaskini.', 'ok', 4000); }
      else { inp.classList.add('invalid'); renderErrorBox('email-error', res.errors); }
    }).catch(function (err) {
      renderErrorBox('email-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; setBtn(btn, false, '', 'Simpan'); });
  }

  /* ---------- PIN ---------- */
  function openPinForm() {
    $('#pin-form').hidden = false;
    $('#btn-pin-edit').hidden = true;
    ['cur-pin', 'new-pin', 'new-pin2'].forEach(function (id) { pinClear(id); markPin(id, false); });
    renderErrorBox('pin-error', []);
    pinClear('cur-pin', true);
  }
  function closePinForm() {
    $('#pin-form').hidden = true;
    $('#btn-pin-edit').hidden = false;
    renderErrorBox('pin-error', []);
  }
  function onSavePin() {
    if (state.busy) return;
    var cur = pinValue('cur-pin'), nw = pinValue('new-pin'), nw2 = pinValue('new-pin2');
    ['cur-pin', 'new-pin', 'new-pin2'].forEach(function (id) { markPin(id, false); });
    var errs = [];
    if (!/^\d{4}$/.test(cur)) errs.push({ field: 'curPin', message: 'Masukkan PIN semasa (4 digit).' });
    if (!/^\d{4}$/.test(nw)) errs.push({ field: 'newPin', message: 'PIN baharu mesti tepat 4 digit.' });
    else if (weakPin(nw, state.manager.phone)) errs.push({ field: 'newPin', message: 'PIN baharu terlalu mudah diteka (cth: 1234, 1111 atau 4 digit akhir telefon).' });
    else if (nw !== nw2) errs.push({ field: 'newPin2', message: 'Pengesahan PIN tidak sama.' });
    var map = { curPin: 'cur-pin', newPin: 'new-pin', newPin2: 'new-pin2' };
    if (errs.length) { mapPinErrors(errs, map); renderErrorBox('pin-error', errs); return; }
    renderErrorBox('pin-error', []);
    state.busy = true;
    var btn = $('#btn-pin-save');
    setBtn(btn, true, 'Menyimpan…', 'Simpan PIN');
    call('apiChangePin', state.token, cur, nw, nw2).then(function (res) {
      if (res.authRequired) return sessionExpired();
      if (res.ok) { applyDashboard(res); renderSettings(); banner('PIN berjaya ditukar. Emel makluman telah dihantar.', 'ok', 6000); }
      else { mapPinErrors(res.errors || [], map); renderErrorBox('pin-error', res.errors); }
    }).catch(function (err) {
      renderErrorBox('pin-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; setBtn(btn, false, '', 'Simpan PIN'); });
  }

  /* ---------- Pasukan saya ---------- */
  function playersTable(players) {
    return '<table><thead><tr><th>#</th><th>No. Pelajar</th><th>Nama</th><th>Kod Program</th><th>Fakulti</th><th>No. Telefon</th></tr></thead><tbody>' +
      players.map(function (p, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(p.studentId) + '</td><td>' + esc(p.name) + '</td><td>' +
          esc(p.program) + '</td><td>' + esc(p.faculty) + '</td><td>' + esc(fmtPhone(p.phone)) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function renderMyTeams() {
    $('#my-teams-wrap').hidden = !state.myTeams.length;
    $('#my-teams').innerHTML = state.myTeams.map(function (t) {
      var s = findSport(t.sportId);
      var c = colorsOf(t.sportId);
      var key = esc(t.sportId) + '|' + esc(t.team);
      var count = t.players.length;
      var pct = t.pax ? Math.round(count / t.pax * 100) : 0;
      var actions = state.canEdit
        ? '<div class="team-actions">' +
            (t.complete
              ? '<button type="button" class="btn btn-edit" data-edit="' + key + '">✏️ Kemaskini atlet</button>'
              : '<button type="button" class="btn btn-add" data-edit="' + key + '">➕ Tambah atlet (' + count + ' / ' + t.pax + ')</button>') +
            '<button type="button" class="btn btn-del" data-del="' + key + '">🗑 Padam pasukan</button></div>'
        : '<div class="tc-sub">Kemaskini &amp; pemadaman tidak lagi dibenarkan.</div>';
      return '<article class="card team-card' + (t.complete ? '' : ' incomplete') + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '">' +
        '<div class="card-top"><div class="card-icon">' + (s ? s.icon : '🏅') + '</div><div>' +
        '<h3>' + esc(t.sport) + ' — Pasukan ' + esc(t.team) + '</h3>' +
        '<div class="tc-line"><span>' + count + ' / ' + t.pax + ' atlet</span>' +
        (t.complete ? '<span class="pill ok">✓ Lengkap</span>' : '<span class="pill warn">Belum lengkap · baki ' + (t.pax - count) + '</span>') +
        '<span>dikemaskini ' + esc(t.updatedAt) + '</span></div></div></div>' +
        '<div class="tc-meter"><i style="width:' + pct + '%"></i></div>' +
        actions +
        '<details class="athletes"><summary>Lihat senarai atlet</summary><div class="table-wrap">' + playersTable(t.players) + '</div></details>' +
        '</article>';
    }).join('');
  }

  function onMyTeamsClick(e) {
    var ed = e.target.closest('button[data-edit]');
    if (ed) {
      var p = ed.getAttribute('data-edit').split('|');
      var team = state.myTeams.filter(function (t) { return t.sportId === p[0] && t.team === p[1]; })[0];
      if (team) openForm(p[0], p[1], team.players);
      return;
    }
    var del = e.target.closest('button[data-del]');
    if (del) {
      var q = del.getAttribute('data-del').split('|');
      onDeleteTeam(q[0], q[1]);
    }
  }

  function mailNote(res) {
    if (res.emailSent) return ' Emel makluman dihantar ke ' + res.emailTo + '.';
    if (res.emailTo) return ' (Emel makluman tidak dapat dihantar.)';
    return '';
  }

  function onDeleteTeam(sportId, team) {
    if (state.busy) return;
    var sport = findSport(sportId);
    confirmModal('Padam Pasukan ' + team + ' bagi ' + sport.name + '? Semua maklumat atlet akan dipadam dan slot dilepaskan, ' +
      'jadi manager lain boleh mendaftar slot ini. Emel makluman akan dihantar kepada anda.',
      { title: 'Padam pasukan?', okLabel: 'Ya, padam', cancelLabel: 'Batal', danger: true })
      .then(function (ok) {
        if (!ok) return;
        state.busy = true;
        return call('apiDeleteTeam', state.token, { sportId: sportId, team: team }).then(function (res) {
          if (res.authRequired) return sessionExpired();
          if (res.manager) applyDashboard(res);
          renderDashboard();
          if (res.ok) banner((res.message || 'Pasukan dipadam.') + mailNote(res), 'ok', 8000);
          else banner((res.errors && res.errors[0] && res.errors[0].message) || 'Gagal memadam pasukan.', 'error', 8000);
        }).catch(function (err) {
          banner('Ralat sambungan: ' + (err && err.message ? err.message : err), 'error', 8000);
        }).then(function () { state.busy = false; });
      });
  }

  /* ---------- Senarai sukan ---------- */
  function renderSports() {
    var boot = state.boot;
    var canAct = state.open && state.canRegister;
    $('#sports-grid').innerHTML = boot.sports.map(function (s) {
      var st = state.status[s.id];
      var btns = boot.teams.map(function (t) {
        if (st[t].registered) {
          return '<button type="button" class="btn team-btn ' + (st[t].mine ? 'mine' : 'done') + '" disabled>Pasukan ' + t + ' ✓ ' +
            (st[t].mine ? (st[t].complete ? 'Anda' : 'Anda ' + st[t].count) : 'Diambil') + '</button>';
        }
        return '<button type="button" class="btn team-btn" data-sport="' + esc(s.id) + '" data-team="' + esc(t) + '"' +
               (canAct ? '' : ' disabled') + '>Daftar ' + esc(t) + '</button>';
      }).join('');
      var taken = boot.teams.filter(function (t) { return st[t].registered; }).length;
      var c = colorsOf(s.id);
      return '<article class="card" style="--c1:' + c[0] + ';--c2:' + c[1] + '">' +
        '<div class="card-top"><div class="card-icon">' + s.icon + '</div>' +
        '<div><h3>' + esc(s.name) + '</h3><div class="meta">' + s.pax + ' atlet / pasukan</div></div></div>' +
        '<div class="meter">' + boot.teams.map(function (t) { return '<i class="' + (st[t].registered ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="meter-label">' + taken + ' / ' + boot.teams.length + ' pasukan didaftar</div>' +
        '<div class="team-row">' + btns + '</div></article>';
    }).join('');
  }

  function refreshDashboard() {
    var btn = $('#btn-refresh');
    btn.disabled = true;
    call('apiGetDashboard', state.token).then(function (d) {
      if (d.authRequired) return sessionExpired();
      applyDashboard(d);
      renderDashboard();
    }).catch(function () {
      banner('Gagal memuat semula status. Cuba lagi.', 'error', 5000);
    }).then(function () { btn.disabled = false; });
  }

  function onGridClick(e) {
    var btn = e.target.closest('button[data-sport]');
    if (!btn || btn.disabled) return;
    openForm(btn.getAttribute('data-sport'), btn.getAttribute('data-team'), null);
  }

  /* ============================================================
   *  MANAGER: BORANG PASUKAN (daftar / kemaskini)
   * ============================================================ */
  function submitLabel() { return state.mode === 'edit' ? 'Simpan Perubahan' : 'Simpan Pendaftaran'; }
  function isBlankP(p) {
    return !cleanSpaces(p.studentId) && !cleanSpaces(p.name) && !cleanSpaces(p.program) && !cleanSpaces(p.faculty) && !cleanSpaces(p.phone);
  }

  function openForm(sportId, team, existing) {
    var sport = findSport(sportId);
    state.sport = sport;
    state.team = team;
    state.mode = existing ? 'edit' : 'create';

    $('#form-title').textContent = (existing ? '✏️ Kemaskini · ' : '') + sport.icon + ' ' + sport.name + ' — Pasukan ' + team;
    $('#form-sub').textContent = existing
      ? (existing.length < sport.pax
          ? 'Tambah baki ' + (sport.pax - existing.length) + ' atlet (sekarang ' + existing.length + ' / ' + sport.pax + '), atau ubah maklumat sedia ada, kemudian simpan.'
          : 'Ubah maklumat atlet kemudian simpan. Emel makluman akan dihantar kepada anda.')
      : 'Pasukan ini memerlukan ' + sport.pax + ' atlet. Anda boleh isi sebahagian dahulu dan lengkapkan kemudian.';
    $('#partial-hint').hidden = !!existing;
    $('#btn-submit').textContent = submitLabel();
    $('#btn-copy').hidden = sport.pax < 2;

    var m = state.manager;
    $('#mg-name').textContent = m.name;
    $('#mg-studentId').textContent = m.studentId;
    $('#mg-program').textContent = m.program;
    $('#mg-faculty').textContent = m.faculty;
    $('#mg-phone').textContent = fmtPhone(m.phone);
    $('#mg-email').textContent = m.email || '—';

    renderErrorBox('error-box', []);
    var box = $('#players');
    box.innerHTML = '';
    var tpl = $('#tpl-player');
    for (var i = 0; i < sport.pax; i++) {
      var node = tpl.content.cloneNode(true);
      $('.player-no', node).textContent = sport.pax === 1 ? 'Maklumat Atlet' : 'Pemain ' + (i + 1);
      box.appendChild(node);
    }
    $$('[data-row]', box).forEach(function (row, idx) {
      row.setAttribute('data-row', idx);
      var p = existing && existing[idx];
      if (p) {
        field(row, 'studentId').value = p.studentId;
        field(row, 'name').value = p.name;
        field(row, 'program').value = p.program;
        var fs = field(row, 'faculty');
        fs.value = p.faculty;
        if (!fs.value) fs.selectedIndex = 0;     // nilai lama tiada dalam senarai -> minta pilih semula
        field(row, 'phone').value = fmtPhone(p.phone);
      }
    });
    updateProgress();
    show('form');
    var first = $('input', box);
    if (first) first.focus({ preventScroll: true });
  }

  function rows() { return $$('#players [data-row]'); }
  function field(row, name) { return $('[name="' + name + '"]', row); }

  function updateProgress() {
    var rs = rows();
    var done = rs.filter(function (r) {
      return $$('input, select', r).every(function (i) { return cleanSpaces(i.value).length > 0; });
    }).length;
    var pct = rs.length ? Math.round(done / rs.length * 100) : 0;
    $('#form-progress-bar').style.width = pct + '%';
    $('#form-progress-text').textContent = done + ' / ' + rs.length + ' atlet lengkap';
  }

  function copyFromFirst() {
    var rs = rows();
    if (rs.length < 2) return;
    var fac = field(rs[0], 'faculty').value;
    var prog = field(rs[0], 'program').value;
    rs.slice(1).forEach(function (row) {
      if (!field(row, 'faculty').value) field(row, 'faculty').value = fac;
      if (!field(row, 'program').value) field(row, 'program').value = prog;
    });
    updateProgress();
  }

  function validateTeamClient(players) {
    var errs = [];
    var seen = {};
    players.forEach(function (p, i) {
      if (isBlankP(p)) return;                       // baris kosong dilangkau
      var id = checkPerson(p, 'Pemain ' + (i + 1) + ': ', i, errs);
      if (id) {
        if (seen[id] !== undefined) {
          errs.push({ row: i, field: 'studentId', message: 'Pemain ' + (i + 1) + ': Nombor pelajar sama dengan Pemain ' + (seen[id] + 1) + '.' });
        } else { seen[id] = i; }
      }
    });
    return errs;
  }

  function onSubmit() {
    if (state.busy) return;
    if (state.mode === 'create' && !state.manager.email) {
      renderErrorBox('error-box', [{ message: 'Sila tetapkan emel anda di menu Tetapan dahulu supaya emel pengesahan dapat dihantar.' }]);
      return;
    }
    var players = rows().map(function (r) { return personFromForm(r); });
    clearInvalid($('#players'));
    var errs = validateTeamClient(players);
    var filled = players.filter(function (p) { return !isBlankP(p); }).length;
    if (!filled) errs.push({ message: 'Isi sekurang-kurangnya 1 atlet untuk menyimpan pasukan.' });
    markFields(rows(), errs, false);
    renderErrorBox('error-box', errs);
    if (errs.length) return;

    var editing = state.mode === 'edit';
    var pax = state.sport.pax;
    var partial = filled < pax;
    var text;
    if (partial) {
      text = 'Hanya ' + filled + ' daripada ' + pax + ' atlet diisi. Pasukan akan disimpan sebagai BELUM LENGKAP dan slot ' +
        state.sport.name + ' (Pasukan ' + state.team + ') kekal ditempah untuk anda. Anda boleh menambah baki ' + (pax - filled) +
        ' atlet kemudian. Emel ' + (editing ? 'makluman' : 'pengesahan') + ' akan dihantar kepada ' + state.manager.email + '.';
    } else {
      text = editing
        ? 'Simpan perubahan maklumat ' + filled + ' atlet bagi ' + state.sport.name + ' (Pasukan ' + state.team + ')? Emel makluman akan dihantar kepada anda.'
        : 'Pasukan lengkap (' + filled + ' atlet). Anda akan menyimpan pendaftaran ' + state.sport.name + ' (Pasukan ' + state.team +
          '). Emel pengesahan akan dihantar kepada ' + state.manager.email + '.';
    }

    confirmModal(text, { title: partial ? 'Simpan (belum lengkap)?' : (editing ? 'Simpan perubahan?' : 'Sahkan pendaftaran'),
                         okLabel: 'Ya, simpan', cancelLabel: 'Semak semula' })
      .then(function (ok) {
        if (!ok) return;
        state.busy = true;
        setBtn($('#btn-submit'), true, 'Menyimpan…', submitLabel());
        var fn = editing ? 'apiUpdateTeam' : 'apiSubmitTeam';
        return call(fn, state.token, { sportId: state.sport.id, team: state.team, players: players })
          .then(handleResult)
          .catch(function (err) {
            renderErrorBox('error-box', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
          })
          .then(function () { state.busy = false; setBtn($('#btn-submit'), false, '', submitLabel()); });
      });
  }

  function handleResult(res) {
    if (res.authRequired) return sessionExpired(res.errors && res.errors[0].message);
    if (res.manager) applyDashboard(res);

    if (res.ok) { showDone(res); return; }

    if (res.conflict) {
      renderDashboard();
      show('list');
      banner((res.errors && res.errors[0] && res.errors[0].message) || 'Tindakan tidak dapat diteruskan.', 'error', 9000);
      return;
    }
    var errs = res.errors || [{ message: 'Tindakan gagal.' }];
    markFields(rows(), errs, false);
    renderErrorBox('error-box', errs);
  }

  function findSportByName(name) {
    return state.boot.sports.filter(function (s) { return s.name === name; })[0] || { id: '' };
  }

  function showDone(res) {
    renderBanner();
    var upd = res.kind === 'updated';
    var inc = res.complete === false;
    $('#done-title').textContent = inc ? 'Disimpan — belum lengkap' : (upd ? 'Perubahan disimpan' : 'Pendaftaran berjaya');
    $('#done-sub').textContent = res.sport + ' — Pasukan ' + res.team +
      (upd ? ' telah dikemaskini.' : ' telah didaftarkan di bawah manager ' + state.manager.name + '.');
    var note = $('#done-incomplete');
    note.hidden = !inc;
    if (inc) {
      note.textContent = '⚠️ Pasukan ini baru ' + res.count + ' / ' + res.pax + ' atlet. Slot kekal ditempah untuk anda. ' +
        'Sila tambah baki ' + (res.pax - res.count) + ' atlet melalui butang di bawah (atau dari dashboard) sebelum pendaftaran ditutup.';
    }
    var more = $('#btn-add-more');
    more.hidden = !(inc && state.canEdit);
    more.setAttribute('data-sport', res.sport ? findSportByName(res.sport).id : '');
    more.setAttribute('data-team', res.team);
    $('#done-ref').textContent = res.ref;
    var mail = $('#done-mail');
    if (res.emailSent) {
      mail.className = 'mail-note ok';
      mail.textContent = '📧 Emel ' + (upd ? 'makluman' : 'pengesahan') + ' telah dihantar ke ' + res.emailTo + '. Sila semak peti masuk (atau folder spam).';
    } else {
      mail.className = 'mail-note warn';
      mail.textContent = '⚠️ Emel tidak dapat dihantar' + (res.emailTo ? ' ke ' + res.emailTo : '') +
        '. Pendaftaran anda tetap berjaya — sila simpan paparan ini sebagai rujukan.';
    }
    $('#done-rows').innerHTML = res.players.map(function (p, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(p.studentId) + '</td><td>' + esc(p.name) + '</td><td>' +
        esc(p.program) + '</td><td>' + esc(p.faculty) + '</td><td>' + esc(fmtPhone(p.phone)) + '</td></tr>';
    }).join('');
    show('done');
  }

  /* ============================================================
   *  MODAL PENGESAHAN
   * ============================================================ */
  function confirmModal(text, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var m = $('#modal');
      var okBtn = $('#modal-ok');
      var cancelBtn = $('#modal-cancel');
      var wrap = $('#modal-input-wrap');
      var input = $('#modal-input');

      $('#modal-title').textContent = opts.title || 'Sahkan';
      $('#modal-text').textContent = text;
      okBtn.textContent = opts.okLabel || 'Ya';
      okBtn.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-accent');
      cancelBtn.textContent = opts.cancelLabel || 'Batal';
      cancelBtn.hidden = !!opts.hideCancel;
      var big = $('#modal-big');
      if (opts.big) { big.textContent = opts.big; big.hidden = false; } else { big.hidden = true; }

      if (opts.requireText) {
        wrap.hidden = false;
        $('#modal-input-label').textContent = 'Taip "' + opts.requireText + '" untuk meneruskan';
        input.value = '';
        okBtn.disabled = true;
        input.oninput = function () { okBtn.disabled = input.value.trim() !== opts.requireText; };
        setTimeout(function () { input.focus(); }, 60);
      } else {
        wrap.hidden = true;
        okBtn.disabled = false;
        input.oninput = null;
      }
      m.hidden = false;

      function close(v) {
        m.hidden = true;
        okBtn.removeEventListener('click', ok);
        cancelBtn.removeEventListener('click', cancel);
        input.oninput = null;
        resolve(v);
      }
      function ok() { close(true); }
      function cancel() { close(false); }
      okBtn.addEventListener('click', ok);
      cancelBtn.addEventListener('click', cancel);
    });
  }

  /* ============================================================
   *  ADMIN
   * ============================================================ */
  var adminTimer = null;

  function startAdmin() {
    var t = adminStore.get();
    if (!t) return showAdminLogin();
    return call('apiAdminGetData', t).then(function (d) {
      if (d.ok) { state.atoken = t; enterAdmin(d); } else { adminStore.clear(); showAdminLogin(); }
    });
  }

  function showAdminLogin(msg) {
    $('#session-bar').hidden = true;
    banner('');
    renderErrorBox('alogin-error', msg ? [{ message: msg }] : []);
    show('alogin');
    $('#alogin-pw').focus({ preventScroll: true });
  }

  function onAdminLogin() {
    if (state.busy) return;
    var pw = $('#alogin-pw').value;
    if (!pw) { renderErrorBox('alogin-error', [{ message: 'Sila masukkan kata laluan.' }]); return; }
    renderErrorBox('alogin-error', []);
    state.busy = true;
    var btn = $('#btn-alogin');
    setBtn(btn, true, 'Menyemak…', 'Log Masuk');
    call('apiAdminLogin', pw).then(function (res) {
      if (res.ok) {
        state.atoken = res.token; adminStore.set(res.token);
        $('#alogin-pw').value = '';
        enterAdmin(res);
      } else {
        renderErrorBox('alogin-error', res.errors);
      }
    }).catch(function (err) {
      renderErrorBox('alogin-error', [{ message: 'Ralat sambungan: ' + (err && err.message ? err.message : err) }]);
    }).then(function () { state.busy = false; setBtn(btn, false, '', 'Log Masuk'); });
  }

  function adminExpired() {
    adminStore.clear();
    state.atoken = null;
    showAdminLogin('Sesi admin tamat. Sila log masuk semula.');
  }

  function adminLogout() {
    if (state.atoken) call('apiAdminLogout', state.atoken).catch(function () {});
    adminStore.clear();
    state.atoken = null;
    clearInterval(adminTimer); adminTimer = null;
    showAdminLogin();
  }

  function enterAdmin(d) {
    state.admin = d;
    $('#sb-avatar').textContent = 'AD';
    $('#sb-name').textContent = 'Administrator';
    $('#sb-phone').textContent = 'Panel pemantauan';
    $('#session-bar').hidden = false;
    renderAdmin();
    show('admin');
    if (!adminTimer) {
      adminTimer = setInterval(function () {
        if (state.atoken && !state.busy && $('#modal').hidden && !$('#view-admin').hidden) refreshAdmin(true);
      }, 30000);
    }
  }

  function refreshAdmin(silent) {
    var btn = $('#a-refresh');
    if (!silent) btn.disabled = true;
    return call('apiAdminGetData', state.atoken).then(function (d) {
      if (d.authRequired) return adminExpired();
      state.admin = d;
      renderAdmin();
    }).catch(function () {
      if (!silent) banner('Gagal memuat semula data.', 'error', 4000);
    }).then(function () { btn.disabled = false; });
  }

  function renderAdmin() {
    var d = state.admin;
    $('#a-updated').textContent = 'Dikemaskini ' + new Date().toLocaleTimeString('ms-MY');
    $('#a-sheet').href = d.sheetUrl || '#';
    renderAStats(d);
    renderAReg(d);
    renderASlots(d);
    renderATeams(d);
    renderAManagers(d);
    renderAJersey(d);
    renderALog(d);
  }

  function renderAInterest(j) {
    var it = j.interest;
    if (!it || (!it.enabled && !it.count)) return '';
    var h = '<h3 class="aj-h">Daftar minat (tinjauan) <span class="pill ' + (it.open ? 'ok' : '') + '">' + (it.open ? 'Dibuka' : 'Ditutup') + '</span></h3>';
    h += '<div class="stats stats-5">' +
      '<div class="stat"><b>' + it.count + '</b><span>Pelajar berminat</span></div>' +
      '<div class="stat"><b>' + it.pieces + '</b><span>Anggaran helai</span></div>' +
      '<div class="stat"><b>' + it.withEmail + '</b><span>Ada emel</span></div>' +
      '<div class="stat"><b>' + it.pendingNotify + '</b><span>Belum dimaklumkan</span></div></div>';
    if (!it.count) return h + '<div class="muted" style="padding:4px 4px 10px">Belum ada pelajar mendaftar minat.</div>';
    function bars(obj, keys, unit) {
      keys = keys && keys.length ? keys.concat(Object.keys(obj).filter(function (k) { return keys.indexOf(k) < 0; })) : Object.keys(obj).sort(function (a, b) { return obj[b].people - obj[a].people; });
      var max = Math.max.apply(null, keys.map(function (k) { return (obj[k] || {})[unit] || 0; }).concat([1]));
      return keys.map(function (k) {
        var v = obj[k] || { people: 0, pieces: 0 };
        return '<div class="bar-row"><span>' + esc(k) + '</span><div class="bar"><i style="width:' + Math.round(v[unit] / max * 100) + '%"></i></div>' +
          '<b>' + v[unit] + (unit === 'pieces' ? ' helai' : ' org') + '</b></div>';
      }).join('');
    }
    var hasBudget = it.budgets && it.budgets.length;
    h += '<div class="aj-cols"><div class="aj-box"><h4>Anggaran saiz (helai)</h4>' + bars(it.bySize, it.sizes, 'pieces') + '</div>' +
      '<div class="aj-box">' + (hasBudget ? '<h4>Harga sanggup bayar (orang)</h4>' + bars(it.byBudget, it.budgets, 'people') + '<h4 style="margin-top:14px">Fakulti (orang)</h4>' : '<h4>Fakulti (orang)</h4>') +
      bars(it.byFaculty, null, 'people') + '</div></div>';
    if (j.open || it.pendingNotify) {
      h += '<div class="aj-notify"><span>' + (j.open
          ? '📣 <b>' + it.pendingNotify + '</b> pelajar berminat (ada emel) belum dimaklumkan bahawa tempahan telah dibuka.'
          : '📣 Selepas tempahan dibuka, anda boleh emel ' + it.pendingNotify + ' pelajar berminat dengan satu klik.') + '</span>' +
        '<button type="button" class="btn btn-edit btn-sm" data-act="notify-interest"' + (j.open && it.pendingNotify ? '' : ' disabled') + '>Emel pelajar berminat</button></div>';
    }
    h += '<details class="aj-list"><summary>Senarai pelajar berminat (' + it.count + ')</summary><div class="table-wrap glass-pad"><table class="data-table"><thead><tr>' +
      '<th>Masa</th><th>Nama</th><th>Telefon</th><th>Fakulti</th><th>Saiz</th><th>Qty</th>' + (hasBudget ? '<th>Bajet</th>' : '') + '<th>Emel</th></tr></thead><tbody>' +
      it.list.map(function (x) {
        return '<tr><td class="nowrap muted">' + esc(String(x.time).slice(5, 16)) + '</td><td>' + esc(x.name) + '<div class="muted">' + esc(x.studentId) + '</div></td>' +
          '<td class="nowrap"><a class="foot-link" target="_blank" rel="noopener" href="https://wa.me/' + esc(x.phone) + '">' + esc(fmtPhone(x.phone)) + '</a></td>' +
          '<td>' + esc(x.faculty) + '</td><td>' + esc(x.size) + '</td><td>' + x.qty + '</td>' + (hasBudget ? '<td class="nowrap">' + esc(x.budget) + '</td>' : '') +
          '<td>' + (x.email ? (x.notified ? '<span class="pill ok">✓ dimaklumkan</span>' : '<span class="pill">ada</span>') : '<span class="muted">—</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    return h;
  }

  function renderAJersey(d) {
    var j = d.jersey, el = $('#a-jersey');
    if (!j) { el.innerHTML = ''; return; }
    var why = { not_ready: 'harga belum ditetapkan (JERSEY.PRICE = 0)', closed: 'ditutup oleh admin', ended: 'tarikh tutup telah lepas',
                hidden: 'halaman jersi disembunyikan (SHOW_PAGE = false)' }[j.reason] || '';
    var btn = j.state === 'open'
      ? '<button type="button" class="btn btn-del" data-act="jersey" data-state="closed">Tutup tempahan</button>'
      : '<button type="button" class="btn btn-edit" data-act="jersey" data-state="open"' + (j.priceSet ? '' : ' disabled title="Tetapkan JERSEY.PRICE dahulu"') + '>Buka tempahan</button>';
    var t = j.totals;
    var html = renderAInterest(j) + '<h3 class="aj-h">Tempahan</h3><div class="reg-control"><div class="reg-state"><span class="dot ' + (j.open ? '' : 'off') + '"></span>Tempahan jersi: ' + (j.open ? 'DIBUKA' : 'DITUTUP') +
      (j.open ? '' : ' <span class="pill warn">' + esc(why) + '</span>') + (j.priceSet ? ' <span class="pill">' + rm(j.price) + ' / helai</span>' : '') + '</div>' +
      '<div class="reg-btns">' + btn + '</div></div>';
    html += '<div class="stats stats-5">' +
      '<div class="stat"><b>' + t.orders + '</b><span>Tempahan aktif</span></div>' +
      '<div class="stat"><b>' + t.pieces + '</b><span>Jumlah helai</span></div>' +
      '<div class="stat"><b class="sm">' + rm(t.amount) + '</b><span>Nilai tempahan</span></div>' +
      '<div class="stat"><b class="sm">' + rm(t.paid) + '</b><span>Telah dibayar</span></div>' +
      '<div class="stat"><b>' + t.unpaidOrders + '</b><span>Belum bayar</span></div></div>';
    // size x sleeve tally (for the supplier)
    var colTot = {}, grand = 0;
    var rows = j.sleeves.map(function (s) {
      var rt = 0;
      var cells = j.sizes.map(function (z) { var n = (j.grid[s] || {})[z] || 0; rt += n; colTot[z] = (colTot[z] || 0) + n; return '<td>' + (n || '·') + '</td>'; }).join('');
      grand += rt;
      return '<tr><td>' + esc(s) + '</td>' + cells + '<td><b>' + rt + '</b></td></tr>';
    }).join('');
    html += '<div class="table-wrap glass-pad"><table class="data-table aj-grid"><thead><tr><th>Saiz →</th>' +
      j.sizes.map(function (z) { return '<th>' + esc(z) + '</th>'; }).join('') + '<th>Jumlah</th></tr></thead><tbody>' + rows +
      '<tr><td><b>Jumlah</b></td>' + j.sizes.map(function (z) { return '<td><b>' + (colTot[z] || 0) + '</b></td>'; }).join('') + '<td><b>' + grand + '</b></td></tr></tbody></table></div>';
    // orders
    if (!j.orders.length) html += '<div class="muted" style="padding:10px 4px">Belum ada tempahan.</div>';
    else html += '<div class="table-wrap glass-pad"><table class="data-table"><thead><tr><th>ID / Masa</th><th>Nama</th><th>Telefon</th><th>Saiz</th><th>Lengan</th><th>Cetakan</th><th>Qty</th><th>Jumlah</th><th>Status</th></tr></thead><tbody>' +
      j.orders.map(function (o) {
        return '<tr><td class="nowrap"><b>' + esc(o.id) + '</b><div class="muted">' + esc(String(o.time).slice(5, 16)) + '</div></td>' +
          '<td>' + esc(o.name) + '<div class="muted">' + esc(o.studentId) + '</div></td>' +
          '<td class="nowrap"><a class="foot-link" target="_blank" rel="noopener" href="https://wa.me/' + esc(o.phone) + '">' + esc(fmtPhone(o.phone)) + '</a></td>' +
          '<td>' + esc(o.size) + '</td><td class="nowrap">' + esc(o.sleeve) + '</td>' +
          '<td class="nowrap">' + esc(o.printName || '—') + (o.number !== '' ? ' #' + esc(o.number) : '') + '</td>' +
          '<td>' + o.qty + '</td><td class="nowrap">' + rm(o.total) + '</td>' +
          '<td class="aj-status"><select data-jid="' + esc(o.id) + '">' + ['Baru', 'Dibayar', 'Batal'].map(function (s) {
            return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + (s === 'Baru' ? 'Belum bayar' : s) + '</option>';
          }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table></div>';
    el.innerHTML = html;
  }

  function renderAStats(d) {
    var t = d.totals;
    $('#a-stats').innerHTML =
      '<div class="stat"><b>' + t.managers + '</b><span>Manager berdaftar' +
        (t.managersWithoutTeam ? ' (' + t.managersWithoutTeam + ' belum daftar pasukan)' : '') + '</span></div>' +
      '<div class="stat"><b>' + t.teams + ' / ' + t.slots + '</b><span>Pasukan didaftar</span></div>' +
      '<div class="stat"><b>' + (t.incompleteTeams || 0) + '</b><span>Pasukan belum lengkap</span></div>' +
      '<div class="stat"><b>' + t.athletes + '</b><span>Atlet didaftar</span></div>' +
      '<div class="stat"><b class="sm"><span class="dot ' + (d.registration.open ? '' : 'off') + '"></span>' + (d.registration.open ? 'Dibuka' : 'Ditutup') + '</b><span>Status pendaftaran</span></div>' +
      '<div class="stat"><b>' + (d.email.enabled ? (d.email.quota == null ? '—' : d.email.quota) : 'Off') + '</b><span>Baki kuota emel hari ini</span></div>';
  }

  function renderAReg(d) {
    var r = d.registration;
    var btns = r.open
      ? '<button type="button" class="btn btn-del" data-act="reg" data-state="closed">Tutup pendaftaran</button>'
      : '<button type="button" class="btn btn-edit" data-act="reg" data-state="open">Buka pendaftaran</button>';
    if (r.override) btns += '<button type="button" class="btn btn-ghost" data-act="reg" data-state="auto">Kembali ke auto</button>';
    $('#a-reg').innerHTML =
      '<div class="reg-state"><span class="dot ' + (r.open ? '' : 'off') + '"></span>Pendaftaran: ' + (r.open ? 'DIBUKA' : 'DITUTUP') +
      (r.override ? ' <span class="pill warn">override admin</span>' : ' <span class="pill">ikut tetapan kod</span>') + '</div>' +
      '<div class="reg-btns">' + btns + '</div>';
  }

  function renderASlots(d) {
    var head = '<thead><tr><th>Sukan</th><th>Atlet</th><th>Pasukan A</th><th>Pasukan B</th></tr></thead>';
    var body = d.slots.map(function (s) {
      function cell(x) {
        return x.registered
          ? '<span class="pill ' + (x.complete ? 'ok' : 'warn') + '">' + (x.complete ? '✓ ' : '⚠ ') + esc(x.manager) + '</span>' +
            '<span class="mini">' + x.count + ' / ' + x.pax + ' atlet' + (x.complete ? '' : ' · BELUM LENGKAP') + ' &middot; ' + esc(x.updatedAt) + '</span>'
          : '<span class="pill">Kosong</span>';
      }
      return '<tr><td>' + s.icon + ' ' + esc(s.sport) + '</td><td>' + s.pax + '</td><td>' + cell(s.A) + '</td><td>' + cell(s.B) + '</td></tr>';
    }).join('');
    $('#a-slots').innerHTML = head + '<tbody>' + body + '</tbody>';
  }

  function waLink(phone) {
    return '<a href="https://wa.me/' + esc(phone) + '" target="_blank" rel="noopener">' + esc(fmtPhone(phone)) + '</a>';
  }

  function renderATeams(d) {
    var open = $$('#a-teams details[open]').map(function (el) { return el.getAttribute('data-id'); });
    if (!d.teams.length) { $('#a-teams').innerHTML = '<div class="muted">Belum ada pasukan didaftar.</div>'; return; }
    $('#a-teams').innerHTML = d.teams.map(function (t) {
      var s = findSport(t.sportId);
      var c = colorsOf(t.sportId);
      var m = t.manager;
      return '<details class="card" data-id="' + esc(t.teamId) + '"' + (open.indexOf(t.teamId) >= 0 ? ' open' : '') +
        ' style="--c1:' + c[0] + ';--c2:' + c[1] + '">' +
        '<summary>' + (s ? s.icon : '') + ' ' + esc(t.sport) + ' — Pasukan ' + esc(t.team) +
        ' <span class="muted">· ' + esc(m.name) + ' · ' + t.players.length + ' / ' + t.pax + ' atlet</span>' +
        (t.complete ? '' : ' <span class="pill warn">belum lengkap</span>') + '</summary>' +
        '<div class="table-wrap"><p class="muted" style="margin:0 0 10px">Manager: <strong>' + esc(m.name) + '</strong> · ' + esc(m.studentId) +
        ' · ' + esc(m.program) + ' · ' + esc(m.faculty) + ' · ' + waLink(m.phone) +
        '<br>Didaftar ' + esc(t.createdAt) + ' · Kemaskini ' + esc(t.updatedAt) + '</p>' +
        playersTable(t.players) +
        '<div class="team-actions">' +
          '<button type="button" class="btn btn-edit" data-act="resend" data-id="' + esc(t.teamId) + '">📧 Hantar semula emel</button>' +
          '<button type="button" class="btn btn-del" data-act="del-team" data-id="' + esc(t.teamId) + '">🗑 Padam pasukan</button>' +
        '</div></div></details>';
    }).join('');
  }

  function renderAManagers(d) {
    if (!d.managers.length) { $('#a-managers').innerHTML = '<tbody><tr><td class="muted">Belum ada manager berdaftar.</td></tr></tbody>'; return; }
    $('#a-managers').innerHTML =
      '<thead><tr><th>Nama</th><th>No. Pelajar</th><th>Telefon</th><th>Emel</th><th>Program / Fakulti</th><th>PIN</th><th>Pasukan</th><th></th></tr></thead><tbody>' +
      d.managers.map(function (m) {
        var teams = m.teams.length
          ? m.teams.map(function (x) { return '<span class="pill ok">' + esc(x) + '</span>'; }).join(' ')
          : '<span class="pill warn">Belum daftar</span>';
        return '<tr><td><strong>' + esc(m.name) + '</strong><span class="mini">' + esc(m.registeredAt) + '</span></td>' +
          '<td>' + esc(m.studentId) + '</td><td>' + waLink(m.phone) + '</td>' +
          '<td>' + (m.email ? esc(m.email) : '<span class="pill bad">Tiada</span>') + '</td>' +
          '<td>' + esc(m.program) + '<span class="mini">' + esc(m.faculty) + '</span></td>' +
          '<td>' + (m.hasPin ? '<span class="pill ok">✓ Ada</span>' : '<span class="pill warn">Tiada PIN</span>') +
            (m.locked ? ' <span class="pill bad">🔒 ' + m.locked + ' min</span>' : '') + '</td><td>' + teams + '</td>' +
          '<td class="nowrap"><button type="button" class="btn btn-edit btn-sm" data-act="reset-pin" data-phone="' + esc(m.phone) + '">Reset PIN</button> ' +
          '<button type="button" class="btn btn-del btn-sm" data-act="del-mgr" data-phone="' + esc(m.phone) + '">Padam</button></td></tr>';
      }).join('') + '</tbody>';
  }

  function logClass(type) {
    if (/GAGAL|DISEKAT/.test(type)) return 'bad';
    if (/PADAM|RESET/.test(type)) return 'warn';
    if (/_OK$|DAFTAR|KEMASKINI/.test(type)) return 'ok';
    return '';
  }
  function renderALog(d) {
    $('#a-log').innerHTML = d.log.length ? d.log.map(function (l) {
      return '<div class="log-row"><span class="t">' + esc(l.time) + '</span>' +
        '<span><span class="pill ' + logClass(l.type) + '">' + esc(l.type) + '</span></span>' +
        '<span class="u">' + esc(l.user) + '</span><span class="d">' + esc(l.detail) + '</span></div>';
    }).join('') : '<div class="muted" style="padding:8px">Tiada aktiviti.</div>';
  }

  /* ---------- Tindakan admin ---------- */
  function adminAction(fn, arg) {
    if (state.busy) return;
    state.busy = true;
    call(fn, state.atoken, arg).then(function (res) {
      if (res.authRequired) return adminExpired();
      if (res.ok) {
        state.admin = res; renderAdmin(); banner(res.message || 'Berjaya.', 'ok', 6000);
        if (res.tempPin) {
          confirmModal('PIN sementara bagi ' + res.tempPinFor + '. Beritahu manager melalui WhatsApp dan minta mereka menukarnya selepas log masuk. ' +
            'PIN ini tidak akan dipaparkan lagi.', { title: 'PIN baharu', big: res.tempPin, okLabel: 'Selesai', hideCancel: true });
        }
      }
      else banner((res.errors && res.errors[0] && res.errors[0].message) || 'Tindakan gagal.', 'error', 8000);
    }).catch(function (err) {
      banner('Ralat sambungan: ' + (err && err.message ? err.message : err), 'error', 8000);
    }).then(function () { state.busy = false; });
  }

  function onAdminClick(e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');

    if (act === 'reg') {
      var st = btn.getAttribute('data-state');
      var label = { open: 'BUKA', closed: 'TUTUP', auto: 'auto (ikut tetapan kod)' }[st];
      confirmModal('Tukar status pendaftaran kepada: ' + label + '?', { title: 'Status pendaftaran', okLabel: 'Ya, tukar', cancelLabel: 'Batal' })
        .then(function (ok) { if (ok) adminAction('apiAdminSetRegistration', st); });
    } else if (act === 'jersey') {
      var js = btn.getAttribute('data-state');
      confirmModal(js === 'open' ? 'Buka tempahan jersi kepada umum sekarang? Pastikan harga, saiz dan maklumat pembayaran sudah muktamad.' : 'Tutup tempahan jersi? Tempahan sedia ada kekal.',
        { title: 'Tempahan jersi', okLabel: js === 'open' ? 'Ya, buka' : 'Ya, tutup', cancelLabel: 'Batal' })
        .then(function (ok) { if (ok) adminAction('apiAdminSetJerseyState', js); });
    } else if (act === 'notify-interest') {
      confirmModal('Hantar emel "Tempahan jersi kini dibuka" kepada semua pelajar berminat yang belum dimaklumkan? (Maksimum 60 setiap klik.)',
        { title: 'Emel pelajar berminat', okLabel: 'Ya, hantar', cancelLabel: 'Batal' })
        .then(function (ok) { if (ok) adminAction('apiAdminNotifyInterest'); });
    } else if (act === 'del-team') {
      var id = btn.getAttribute('data-id');
      confirmModal('Padam pasukan ' + id + '? Semua atlet dalam pasukan ini akan dipadam dan slot dilepaskan.',
        { title: 'Padam pasukan?', okLabel: 'Ya, padam', cancelLabel: 'Batal', danger: true })
        .then(function (ok) { if (ok) adminAction('apiAdminDeleteTeam', id); });
    } else if (act === 'resend') {
      var rid = btn.getAttribute('data-id');
      confirmModal('Hantar semula emel pengesahan bagi pasukan ' + rid + ' kepada manager?',
        { title: 'Hantar semula emel', okLabel: 'Ya, hantar', cancelLabel: 'Batal' })
        .then(function (ok) { if (ok) adminAction('apiAdminResendEmail', rid); });
    } else if (act === 'reset-pin') {
      var rp = btn.getAttribute('data-phone');
      confirmModal('Tetapkan semula PIN untuk ' + fmtPhone(rp) + '? PIN lama tidak lagi sah, sekatan (jika ada) dibuka, dan PIN sementara baharu akan dipaparkan kepada anda sekali.',
        { title: 'Reset PIN?', okLabel: 'Ya, reset', cancelLabel: 'Batal' })
        .then(function (ok) { if (ok) adminAction('apiAdminResetPin', rp); });
    } else if (act === 'del-mgr') {
      var phone = btn.getAttribute('data-phone');
      confirmModal('Padam manager ' + fmtPhone(phone) + ' beserta SEMUA pasukan yang didaftarkannya?',
        { title: 'Padam manager?', okLabel: 'Ya, padam', cancelLabel: 'Batal', danger: true })
        .then(function (ok) { if (ok) adminAction('apiAdminDeleteManager', phone); });
    } else if (act === 'reset') {
      confirmModal('Ini akan memadam SEMUA data atlet dan manager. Tindakan ini tidak boleh dibatalkan. Gunakan untuk membersihkan data ujian sebelum sistem digunakan.',
        { title: 'Padam semua data?', okLabel: 'Padam semua', cancelLabel: 'Batal', danger: true, requireText: 'PADAM SEMUA' })
        .then(function (ok) { if (ok) adminAction('apiAdminResetAll', 'PADAM SEMUA'); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
