// profile.js — profile header, edit profile, user's posts
if (document.body.dataset.page === 'profile') {
  onReady(async () => {
    const id = new URLSearchParams(location.search).get('id') || Auth.user._id;
    const isMe = id === Auth.user._id;
    const header = $('#profileHeader');
    let profile;

    function renderHeader(postCount) {
      header.innerHTML = `<div class="card profile-card">
        <div class="profile-cover"></div>
        <div class="profile-info">
          <img class="avatar xl" src="${avatarUrl(profile)}" alt="${escapeHtml(profile.name)}">
          <h1>${escapeHtml(profile.name)}</h1>
          <span class="muted">@${escapeHtml(profile.username)}</span>
          <p>${profile.bio ? escapeHtml(profile.bio) : '<span class="muted">No bio yet.</span>'}</p>
          <div class="stats">
            <div><b id="statPosts">${postCount ?? '–'}</b><span class="muted">Posts</span></div>
            <div><b id="statFollowers">${profile.followers.length}</b><span class="muted">Followers</span></div>
            <div><b id="statFollowing">${profile.following.length}</b><span class="muted">Following</span></div>
          </div>
          ${isMe ? '<button class="btn btn-outline" id="editProfile"><i class="fa-solid fa-pen"></i> Edit profile</button>' : followBtn(profile._id)}
        </div></div>`;
      $('#editProfile')?.addEventListener('click', openEditProfile);
    }

    async function loadProfile() {
      header.innerHTML = spinnerHtml;
      try { profile = (await Api.request(`/users/${id}`)).user; }
      catch (ex) {
        header.innerHTML = ex.message === 'User not found' ? emptyState('fa-circle-question', 'User not found', 'This profile does not exist.') : errorState(ex.message);
        header.querySelector('[data-retry]')?.addEventListener('click', loadProfile);
        return false;
      }
      document.title = `${profile.name} • ConnectHub`;
      renderHeader();
      return true;
    }

    function openEditProfile() {
      let picture = profile.profilePicture || '';
      const m = openModal(`<h2>Edit profile</h2>
        <div class="avatar-picker"><img class="avatar xl" id="epPic" style="width:80px;height:80px" src="${avatarUrl(profile)}" alt="">
          <div><label class="btn btn-outline btn-sm"><i class="fa-regular fa-image"></i> Change picture<input type="file" id="epFile" accept="image/*" hidden></label>
          <button class="btn btn-ghost btn-sm" id="epRemove" type="button">Remove</button></div></div>
        <div class="field"><label>Full name</label><input id="epName" maxlength="60" value="${escapeHtml(profile.name)}"></div>
        <div class="field"><label>Bio <span class="muted">(max 200)</span></label><textarea id="epBio" maxlength="200" style="min-height:90px">${escapeHtml(profile.bio)}</textarea></div>
        <div class="modal-actions"><span class="spacer"></span><button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="epSave">Save changes</button></div>
        <p class="form-error hidden" id="epError"></p>`);
      const err = $('#epError', m);
      const fail = (t) => { err.textContent = t; err.classList.remove('hidden'); };
      $('#epFile', m).addEventListener('change', async (e) => {
        try { picture = await resizeImage(e.target.files[0], 300); $('#epPic', m).src = picture; err.classList.add('hidden'); } catch (ex) { fail(ex.message); }
      });
      $('#epRemove', m).addEventListener('click', () => { picture = ''; $('#epPic', m).src = avatarPlaceholder($('#epName', m).value || profile.name); });
      $('#epSave', m).addEventListener('click', async (e) => {
        const name = $('#epName', m).value.trim();
        if (!name) return fail('Name cannot be empty.');
        const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span> Saving...';
        try {
          const data = await Api.request(`/users/${id}`, { method: 'PUT', body: { name, bio: $('#epBio', m).value, profilePicture: picture } });
          profile = data.user; Auth.user = data.user;
          m.close(); renderHeader(list.total); renderNavbar();
          toast('Profile updated', 'success');
          list.load(); // refresh posts so the new name/avatar appear
        } catch (ex) { fail(ex.message); btn.disabled = false; btn.textContent = 'Save changes'; }
      });
    }

    const container = $('#posts');
    const emptyMsg = emptyState('fa-image', 'No posts yet', isMe ? 'Share your first post using the Create button.' : 'This user has not posted yet.');
    const list = PostUI.createList({
      container, loadMoreEl: $('#loadMore'), buildQuery: () => `user=${id}`,
      emptyHtml: () => emptyMsg,
    });
    PostUI.mount(container, { onEmpty: () => { container.innerHTML = emptyMsg; $('#statPosts') && ($('#statPosts').textContent = 0); } });

    if (!(await loadProfile())) { $('h2.section-title').classList.add('hidden'); return; }
    list.load();

    document.addEventListener('posts:loaded', (e) => { const el = $('#statPosts'); if (el) el.textContent = e.detail.total; });
    document.addEventListener('post:deleted', () => { const el = $('#statPosts'); if (el) el.textContent = Math.max(0, el.textContent - 1); });
    document.addEventListener('post:saved', (e) => {
      if (e.detail.mode === 'create' && !isMe) return location.href = 'profile.html';
      list.upsert(e.detail.post, e.detail.mode);
      if (e.detail.mode === 'create') $('#statPosts').textContent = Number($('#statPosts').textContent) + 1;
    });
    // Update follower/following counters live when following/unfollowing
    document.addEventListener('follow:changed', (e) => {
      if (e.detail.target._id === profile._id) { profile = e.detail.target; $('#statFollowers').textContent = profile.followers.length; }
      if (isMe) $('#statFollowing').textContent = Auth.user.following.length;
    });
  });
}
