// main.js — shared helpers, navbar, modals, toasts, follow buttons
// ---------- theme ----------
document.documentElement.dataset.theme = localStorage.getItem('ch_theme') || 'light';

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  const units = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]];
  for (const [label, secs] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
}

// Generates a coloured initials avatar when the user has no picture
function avatarPlaceholder(name) {
  const initials = escapeHtml(String(name).split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?');
  const hue = [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="hsl(${hue},60%,50%)"/><text x="50" y="50" dy=".35em" text-anchor="middle" fill="#fff" font-family="Arial" font-size="40" font-weight="700">${initials}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
const avatarUrl = (u) => (u && u.profilePicture) || avatarPlaceholder(u ? u.name : '?');

// Shrinks an image in the browser so it stays small in the database
function resizeImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected'));
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Image must be smaller than 10 MB'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function toast(message, type = 'info') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

const spinnerHtml = '<div class="center"><div class="spinner"></div></div>';
const emptyState = (icon, title, text = '') => `<div class="state"><i class="fa-regular ${icon}"></i><h3>${title}</h3><p>${text}</p></div>`;
const errorState = (msg) => `<div class="state error"><i class="fa-solid fa-triangle-exclamation"></i><h3>Something went wrong</h3><p>${escapeHtml(msg)}</p><button class="btn btn-outline btn-sm" data-retry>Try again</button></div>`;

// ---------- modal ----------
function openModal(html) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(backdrop);
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) close(); });
  backdrop.close = close;
  return backdrop;
}

// Create / edit post modal. Fires a "post:saved" event when done.
function openPostModal(post = null) {
  let image = post ? post.image || '' : '';
  const m = openModal(`
    <h2>${post ? 'Edit post' : 'Create post'}</h2>
    <textarea id="pmText" maxlength="1000" placeholder="What's on your mind?">${escapeHtml(post ? post.content : '')}</textarea>
    <div class="img-preview ${image ? '' : 'hidden'}" id="pmPreview"><img id="pmImg" alt="Preview" src="${image ? image : ''}"><button type="button" class="icon-btn" id="pmRemove" title="Remove image"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-actions">
      <label class="btn btn-ghost"><i class="fa-regular fa-image"></i> Photo<input type="file" id="pmFile" accept="image/*" hidden></label>
      <span class="spacer"></span>
      <button class="btn btn-outline" data-close>Cancel</button>
      <button class="btn btn-primary" id="pmSubmit">${post ? 'Save' : 'Publish'}</button>
    </div>
    <p class="form-error hidden" id="pmError"></p>`);
  const err = $('#pmError', m);
  const showImage = () => { $('#pmPreview', m).classList.toggle('hidden', !image); $('#pmImg', m).src = image; };
  $('#pmText', m).focus();

  $('#pmFile', m).addEventListener('change', async (e) => {
    try { image = await resizeImage(e.target.files[0]); showImage(); err.classList.add('hidden'); }
    catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
  });
  $('#pmRemove', m).addEventListener('click', () => { image = ''; showImage(); });

  $('#pmSubmit', m).addEventListener('click', async (e) => {
    const content = $('#pmText', m).value.trim();
    if (!content && !image) { err.textContent = 'Write something or add a photo first.'; err.classList.remove('hidden'); return; }
    const btn = e.currentTarget;
    btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span> Saving...';
    try {
      const data = await Api.request(post ? `/posts/${post._id}` : '/posts', { method: post ? 'PUT' : 'POST', body: { content, image } });
      m.close();
      toast(data.message, 'success');
      document.dispatchEvent(new CustomEvent('post:saved', { detail: { post: data.post, mode: post ? 'edit' : 'create' } }));
    } catch (ex) {
      err.textContent = ex.message; err.classList.remove('hidden');
      btn.disabled = false; btn.textContent = post ? 'Save' : 'Publish';
    }
  });
}

// ---------- follow buttons (used on feed, search, profile) ----------
function followBtn(userId) {
  if (userId === Auth.user._id) return '';
  const f = Auth.user.following.includes(userId);
  return `<button class="btn btn-sm follow-btn ${f ? 'btn-outline' : 'btn-primary'}" data-user-id="${userId}" data-following="${f}">${f ? 'Following' : 'Follow'}</button>`;
}

function setFollowState(btn, following) {
  btn.dataset.following = following;
  btn.className = `btn btn-sm follow-btn ${following ? 'btn-outline' : 'btn-primary'}`;
  btn.textContent = following ? 'Following' : 'Follow';
  btn.disabled = false;
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.follow-btn');
  if (!btn) return;
  e.preventDefault(); e.stopPropagation();
  const id = btn.dataset.userId;
  const wasFollowing = btn.dataset.following === 'true';
  btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span>';
  try {
    const data = await Api.request(`/users/${id}/follow`, { method: wasFollowing ? 'DELETE' : 'POST' });
    Auth.user = { ...Auth.user, following: data.me.following };
    document.querySelectorAll(`.follow-btn[data-user-id="${id}"]`).forEach((b) => setFollowState(b, !wasFollowing));
    toast(data.message, 'success');
    document.dispatchEvent(new CustomEvent('follow:changed', { detail: { target: data.user } }));
  } catch (ex) {
    setFollowState(btn, wasFollowing);
    toast(ex.message, 'error');
  }
});

// ---------- navbar ----------
function renderNavbar() {
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const ownProfile = page === 'profile' && (!params.get('id') || params.get('id') === Auth.user._id);
  const cls = (active) => `nav-item${active ? ' active' : ''}`;
  $('#navbar').innerHTML = `
    <nav class="navbar"><div class="nav-inner">
      <a class="logo" href="index.html"><i class="fa-solid fa-bolt"></i> ConnectHub</a>
      <div class="nav-links">
        <a class="${cls(page === 'home')}" href="index.html"><i class="fa-solid fa-house"></i><span>Home</span></a>
        <a class="${cls(page === 'search')}" href="search.html"><i class="fa-solid fa-magnifying-glass"></i><span>Search</span></a>
        <button class="nav-item" id="navCreate"><i class="fa-solid fa-square-plus"></i><span>Create</span></button>
        <a class="${cls(ownProfile)}" href="profile.html"><i class="fa-solid fa-user"></i><span>Profile</span></a>
        <button class="nav-item" id="navLogout"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></button>
      </div>
      <button class="icon-btn" id="themeToggle" title="Toggle theme"><i class="fa-solid fa-moon"></i></button>
    </div></nav>`;
  $('#navCreate').addEventListener('click', () => openPostModal());
  $('#navLogout').addEventListener('click', () => { toast('Logged out', 'success'); setTimeout(() => Auth.logout(), 300); });
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ch_theme', next);
  });
}

// ---------- page bootstrap ----------
// Pages call `onReady(fn)`; it runs after the user is verified.
function onReady(fn) {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (!(await Auth.requireAuth())) return;
    } catch (err) {
      document.body.innerHTML = `<main class="container">${errorState(err.message)}</main>`;
      document.querySelector('[data-retry]').onclick = () => location.reload();
      return;
    }
    renderNavbar();
    fn();
  });
}

// If a post is created on a page that has no post list (e.g. search), go to the feed
document.addEventListener('post:saved', (e) => {
  if (e.detail.mode === 'create' && !$('#posts')) location.href = 'index.html';
});
