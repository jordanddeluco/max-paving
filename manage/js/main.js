/* Max Paving Manage — app shell: boot, sign-in, navigation, routing, event wiring. */
import { $, $$, esc, icon, initials } from './core.js';
import * as store from './store.js';
import { S, can, role } from './store.js';
import { actions, submits, inputs, changes, ui, act, onSubmit, toast, closeDrawer, drawerOpen, openDrawer, f, fieldHtml } from './ui.js';
import { WX } from './weather.js';
import home from './views/home.js';
import sales from './views/sales.js';
import estimates from './views/estimates.js';
import jobs from './views/jobs.js';
import schedule from './views/schedule.js';
import crew from './views/crew.js';
import billing from './views/billing.js';
import office from './views/office.js';
import settings from './views/settings.js';

const VIEWS = { home, sales, estimates, jobs, schedule, crew, billing, office, settings };
const NAV = [
  ['', [['home', 'Home', 'home']]],
  ['Sell', [['sales', 'Sales', 'inbox'], ['estimates', 'Estimates', 'file']]],
  ['Build', [['jobs', 'Jobs', 'hammer'], ['schedule', 'Schedule', 'calendar'], ['crew', 'Crew & time', 'hardhat']]],
  ['Office', [['billing', 'Billing', 'dollar'], ['office', 'Equipment & docs', 'building'], ['settings', 'Settings', 'gear']]],
];
const allowed = k => { const v = VIEWS[k]; return !v.roles || v.roles.includes(role()); };
const view = $('#view');
let cleanup = [];

export function route() {
  const [path, query] = (location.hash.slice(1) || 'home').split('?');
  const parts = path.split('/').filter(Boolean);
  return { section: parts[0] || 'home', parts: parts.slice(1), q: new URLSearchParams(query || '') };
}

function render() {
  const r = route();
  if (!VIEWS[r.section] || !allowed(r.section)) { location.hash = 'home'; return; }
  cleanup.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }); cleanup = [];
  const v = VIEWS[r.section];
  $('#nav').innerHTML = NAV.map(([group, items]) => {
    const vis = items.filter(([k]) => allowed(k));
    return vis.length ? `<div class="side__group">${group ? `<span>${group}</span>` : ''}${vis.map(([k, l, ic]) => `<a href="#${k}" class="side__link${k === r.section ? ' is-active' : ''}"${k === r.section ? ' aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${count(k)}</a>`).join('')}</div>` : '';
  }).join('');
  const out = v.render(r);
  view.innerHTML = typeof out === 'string' ? out : out.html;
  if (out && out.after) { const c = out.after(); if (typeof c === 'function') cleanup.push(c); }
  document.title = `${v.title || 'Manage'} · Max Paving`;
  $('#top-title').textContent = v.title || '';
  banner();
}
ui.rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
const count = k => { const n = VIEWS[k].badge ? VIEWS[k].badge() : 0; return n ? `<em class="side__count">${n}</em>` : ''; };

function banner() {
  const b = $('#banner');
  if (store.db.meta.sample && can.settings()) b.innerHTML = `<div class="banner"><span><strong>You’re looking at sample data.</strong> Click around — then clear it in Settings → Data when you’re ready for real work.</span><a class="btn btn--black btn--sm" href="#settings/data">Clear sample data</a></div>`;
  else b.innerHTML = '';
}

function topbar() {
  const u = S.user;
  $('#top-user').innerHTML = S.mode === 'local'
    ? `<a class="mode-pill" href="#settings/data" title="Data is kept in this browser. Run the Max Paving server to share it with the team and connect QuickBooks.">${icon('link')}<span>Local mode</span></a>`
    : `<span class="sync-pill" id="sync-pill"></span>
       <div class="user-menu">
         <button type="button" class="user-menu__btn" data-act="user-menu" aria-expanded="false"><span class="avatar">${esc(initials(u.name))}</span><span class="user-menu__name">${esc(u.name)}<small>${esc(u.roleLabel || u.role)}</small></span></button>
         <div class="user-menu__pop" hidden>
           <button type="button" data-act="change-password">Change password</button>
           <button type="button" data-act="sign-out">${icon('logout')} Sign out</button>
         </div>
       </div>`;
  syncPill();
}
function syncPill() {
  const p = $('#sync-pill'); if (!p) return;
  const map = { ok: ['All changes saved', 'ok'], saving: ['Saving…', 'busy'], offline: ['Connection problem', 'bad'], signedout: ['Signed out — reload', 'bad'] };
  const [label, cls] = map[S.status] || map.ok;
  p.className = `sync-pill sync-pill--${cls}`; p.textContent = label;
}

/* ---------------------------------------------------------------- quick add */
const QUICK = [
  ['Lead', 'lead-new', 'sales'], ['Prospect', 'p-new', 'sales'], ['Estimate', 'est-new', 'estimates'], ['Job', 'job-new', 'jobs'],
  ['Daily report', 'log-new', 'crew'], ['Time entry', 'time-new', 'crew'], ['Invoice', 'inv-new', 'billing'],
];
act({
  'quick-add'(el) {
    const pop = el.nextElementSibling; pop.hidden = !pop.hidden; el.setAttribute('aria-expanded', String(!pop.hidden));
    pop.innerHTML = QUICK.filter(([, a, v]) => allowed(v) && actions[a]).map(([l, a]) => `<button type="button" data-act="${a}">${icon('plus')}${l}</button>`).join('');
  },
  'user-menu'(el) { const pop = el.nextElementSibling; pop.hidden = !pop.hidden; el.setAttribute('aria-expanded', String(!pop.hidden)); },
  'sign-out'() { store.logout(); },
  'change-password'() {
    openDrawer(`<form class="form" data-submit="password" novalidate>
      <header class="form__head"><div><span class="eyebrow eyebrow--sm">Your account</span><h2>Change password</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
      <div class="form__body"><div class="fields">${fieldHtml(f('current', 'Current password', 'password', { wide: true }), '')}${fieldHtml(f('next', 'New password (10+ characters)', 'password', { wide: true }), '')}</div></div>
      <footer class="form__foot"><div class="form__actions"></div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="submit" class="btn btn--yellow">Change password</button></footer></form>`);
  },
});
onSubmit({
  async password(form) {
    try { await store.api('password', { method: 'POST', body: { current: form.elements.current.value, next: form.elements.next.value } }); closeDrawer(); toast('Password changed.'); }
    catch (e) { toast(e.message, 'bad'); }
  },
});

/* ---------------------------------------------------------------- sign-in screens (server mode) */
function authScreen(kind, err = '') {
  document.body.classList.add('is-auth');
  $('#auth').hidden = false;
  $('#auth').innerHTML = `<div class="auth">
    <div class="auth__card">
      <img src="img/logo-horizontal.jpg" alt="Max Paving" class="auth__logo" width="1050" height="248">
      ${kind === 'setup' ? `
        <span class="eyebrow">First-time setup</span><h1>Create the owner login</h1>
        <p class="muted">You’ll add the rest of the team in Settings → Users.</p>
        <form data-submit="setup" class="auth__form" novalidate>
          <label>Your name<input name="name" autocomplete="name" required></label>
          <label>Email<input name="email" type="email" autocomplete="username" required></label>
          <label>Password (10+ characters)<input name="password" type="password" autocomplete="new-password" required></label>
          <label>Start with<select name="start"><option value="empty">An empty company (real work only)</option><option value="sample">Sample data to try it out</option>${localStorage.getItem('maxpaving.manage.v2') || localStorage.getItem('maxpaving.manage.v1') ? '<option value="local">The data saved in this browser</option>' : ''}</select></label>
          <p class="auth__err">${esc(err)}</p>
          <button class="btn btn--yellow btn--block" type="submit">Create account</button>
        </form>` : `
        <span class="eyebrow">Max Paving</span><h1>Sign in to Manage</h1>
        <form data-submit="login" class="auth__form" novalidate>
          <label>Email<input name="email" type="email" autocomplete="username" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
          <p class="auth__err">${esc(err)}</p>
          <button class="btn btn--yellow btn--block" type="submit">Sign in</button>
        </form>
        <p class="muted small">Forgot your password? Ask the owner to reset it in Settings → Users.</p>`}
    </div>
  </div>`;
  $('#auth input').focus();
}
onSubmit({
  async login(form) {
    try { await store.login(form.elements.email.value, form.elements.password.value); start(); }
    catch (e) { authScreen('login', e.message); }
  },
  async setup(form) {
    const v = Object.fromEntries(new FormData(form));
    if (!v.name || !v.email || (v.password || '').length < 10) { $('.auth__err').textContent = 'Fill in your name, email and a password of at least 10 characters.'; return; }
    try { await store.setup(v); start(); } catch (e) { authScreen('setup', e.message); }
  },
});

/* ---------------------------------------------------------------- events */
document.addEventListener('click', e => {
  // close popovers when clicking elsewhere
  $$('.user-menu__pop:not([hidden]), .quick__pop:not([hidden])').forEach(p => { if (!p.parentElement.contains(e.target)) { p.hidden = true; p.previousElementSibling.setAttribute('aria-expanded', 'false'); } });
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = actions[el.dataset.act]; if (!fn) return;
  if (el.closest('.quick__pop, .user-menu__pop')) el.closest('.quick__pop, .user-menu__pop').hidden = true;
  if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
  fn(el, e);
});
document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-submit]'); if (!form) return;
  e.preventDefault();
  const fn = submits[form.dataset.submit]; if (fn) fn(form, e);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-on-input]'); if (el && inputs[el.dataset.onInput]) inputs[el.dataset.onInput](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-on-change]'); if (el && changes[el.dataset.onChange]) changes[el.dataset.onChange](el, e); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && drawerOpen()) closeDrawer();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act]:not(button):not(a):not(input):not(select)')) { e.preventDefault(); e.target.click(); }
});
window.addEventListener('hashchange', () => { closeDrawer(); render(); window.scrollTo(0, 0); });

// Mobile menu
const setMenu = open => { document.body.classList.toggle('nav-open', open); $('#menu-btn').setAttribute('aria-expanded', String(open)); };
$('#menu-btn').addEventListener('click', () => setMenu(!document.body.classList.contains('nav-open')));
$('#scrim').addEventListener('click', () => setMenu(false));
$('#side').addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

store.on((type, detail) => {
  if (type === 'error') toast(detail, 'bad');
  if (type === 'status') syncPill();
  if (type === 'remote') { if (drawerOpen()) ui.stale = true; else ui.rerender(); }
});
WX.onLoad = () => { if (!drawerOpen() && ['home', 'schedule'].includes(route().section)) ui.rerender(); };

/* ---------------------------------------------------------------- start */
function start() {
  document.body.classList.remove('is-auth');
  $('#auth').hidden = true; $('#auth').innerHTML = '';
  topbar();
  render();
}
(async () => {
  const state = await store.boot();
  if (state === 'login' || state === 'setup') return authScreen(state);
  start();
})();
