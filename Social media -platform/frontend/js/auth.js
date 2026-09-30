// auth.js — session handling + login/register forms
const Auth = {
  get token() { return localStorage.getItem('ch_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('ch_user')); } catch { return null; } },
  set user(u) { localStorage.setItem('ch_user', JSON.stringify(u)); },
  save(token, user) { localStorage.setItem('ch_token', token); this.user = user; },
  logout() { localStorage.removeItem('ch_token'); localStorage.removeItem('ch_user'); location.href = 'login.html'; },
  // Protects pages: redirect to login when not authenticated, refresh user data otherwise
  async requireAuth() {
    if (!this.token) { location.href = 'login.html'; return false; }
    try { this.user = (await Api.request('/auth/me')).user; return true; }
    catch (err) { if (!this.token) return false; throw err; }
  },
};

function showFormMessage(text, type = 'error') {
  const box = document.getElementById('formMessage');
  box.textContent = text;
  box.className = `form-msg ${type}`;
}

function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="spinner sm"></span> Please wait...' : label;
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if ((page === 'login' || page === 'register') && Auth.token) { location.href = 'index.html'; return; }

  // ---- Login ----
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      if (!email || !password) return showFormMessage('Please enter your email and password.');
      const btn = document.getElementById('submitBtn');
      setLoading(btn, true);
      try {
        const data = await Api.request('/auth/login', { method: 'POST', body: { email, password } });
        Auth.save(data.token, data.user);
        showFormMessage('Logged in! Redirecting...', 'success');
        location.href = 'index.html';
      } catch (err) {
        showFormMessage(err.message);
        setLoading(btn, false, 'Log in');
      }
    });
  }

  // ---- Register ----
  const regForm = document.getElementById('registerForm');
  if (regForm) {
    let picture = '';
    const preview = document.getElementById('picPreview');
    preview.src = avatarPlaceholder('?');
    document.getElementById('profilePicture').addEventListener('change', async (e) => {
      try { picture = await resizeImage(e.target.files[0], 300); preview.src = picture; }
      catch (err) { showFormMessage(err.message); }
    });

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        name: regForm.name.value.trim(), username: regForm.username.value.trim(),
        email: regForm.email.value.trim(), password: regForm.password.value, profilePicture: picture,
      };
      if (!body.name || !body.username || !body.email || !body.password) return showFormMessage('Please fill in all fields.');
      if (!/^[A-Za-z0-9_]{3,20}$/.test(body.username)) return showFormMessage('Username must be 3-20 characters (letters, numbers, underscores).');
      if (!/^\S+@\S+\.\S+$/.test(body.email)) return showFormMessage('Please enter a valid email address.');
      if (body.password.length < 8 || !/[A-Za-z]/.test(body.password) || !/\d/.test(body.password)) {
        return showFormMessage('Password must be at least 8 characters with a letter and a number.');
      }
      const btn = document.getElementById('submitBtn');
      setLoading(btn, true);
      try {
        const data = await Api.request('/auth/register', { method: 'POST', body });
        Auth.save(data.token, data.user);
        showFormMessage('Account created! Taking you to your feed...', 'success');
        setTimeout(() => (location.href = 'index.html'), 700);
      } catch (err) {
        showFormMessage(err.message);
        setLoading(btn, false, 'Create account');
      }
    });
  }
});
