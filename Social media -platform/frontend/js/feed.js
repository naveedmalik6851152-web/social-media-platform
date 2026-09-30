// feed.js — post cards (shared with profile page), comments, likes, and the home feed
const PostUI = {
  cache: new Map(), // post id -> post object (used by the edit button)

  commentHtml(c) {
    const mine = c.user._id === Auth.user._id;
    return `<div class="comment" data-comment-id="${c._id}">
      <a href="profile.html?id=${c.user._id}"><img class="avatar sm" src="${avatarUrl(c.user)}" alt=""></a>
      <div class="comment-body"><div style="display:flex;align-items:center;gap:.5rem">
        <a href="profile.html?id=${c.user._id}"><b>${escapeHtml(c.user.username)}</b></a>
        <span class="muted">${timeAgo(c.createdAt)}</span><span class="spacer"></span>
        ${mine ? '<button class="icon-btn btn-del-comment" title="Delete comment"><i class="fa-regular fa-trash-can"></i></button>' : ''}
      </div><p>${escapeHtml(c.text)}</p></div></div>`;
  },

  render(post) {
    this.cache.set(post._id, post);
    const u = post.user;
    const mine = u._id === Auth.user._id;
    const liked = post.likes.includes(Auth.user._id);
    const edited = new Date(post.updatedAt) - new Date(post.createdAt) > 1500;
    return `<article class="card post" data-id="${post._id}">
      <header class="post-head">
        <a href="profile.html?id=${u._id}"><img class="avatar" src="${avatarUrl(u)}" alt=""></a>
        <div><a class="post-user" href="profile.html?id=${u._id}">${escapeHtml(u.name)}</a>
          <span class="muted">@${escapeHtml(u.username)} · ${timeAgo(post.createdAt)}${edited ? ' · edited' : ''}</span></div>
        <span class="spacer"></span>
        ${mine ? `<button class="icon-btn btn-edit" title="Edit post"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="icon-btn btn-delete" title="Delete post"><i class="fa-regular fa-trash-can"></i></button>` : ''}
      </header>
      ${post.content ? `<p class="post-text">${escapeHtml(post.content)}</p>` : ''}
      ${post.image ? `<img class="post-img" src="${post.image}" alt="Post image" loading="lazy">` : ''}
      <div class="post-actions">
        <button class="act btn-like ${liked ? 'liked' : ''}"><i class="${liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i><span>${post.likes.length}</span></button>
        <button class="act btn-comment"><i class="fa-regular fa-comment"></i><span>${post.commentCount}</span></button>
      </div>
      <section class="comments hidden"></section>
    </article>`;
  },

  // Handles every click/submit inside a list of posts using event delegation
  mount(container, { onEmpty } = {}) {
    container.addEventListener('click', async (e) => {
      const card = e.target.closest('.post');
      if (!card) return;
      const id = card.dataset.id;

      if (e.target.closest('.btn-like')) {
        const btn = e.target.closest('.btn-like');
        const liked = btn.classList.contains('liked');
        btn.disabled = true;
        try {
          const { likes } = await Api.request(`/posts/${id}/like`, { method: liked ? 'DELETE' : 'POST' });
          const now = likes.includes(Auth.user._id);
          btn.classList.toggle('liked', now);
          btn.innerHTML = `<i class="${now ? 'fa-solid' : 'fa-regular'} fa-heart"></i><span>${likes.length}</span>`;
          this.cache.get(id).likes = likes;
        } catch (ex) { toast(ex.message, 'error'); }
        btn.disabled = false;
      }

      else if (e.target.closest('.btn-comment')) {
        const box = card.querySelector('.comments');
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden') && !box.dataset.loaded) await this.loadComments(id, box);
      }

      else if (e.target.closest('.btn-edit')) openPostModal(this.cache.get(id));

      else if (e.target.closest('.btn-delete')) {
        if (!confirm('Delete this post? This cannot be undone.')) return;
        try {
          await Api.request(`/posts/${id}`, { method: 'DELETE' });
          card.remove(); this.cache.delete(id);
          toast('Post deleted', 'success');
          if (!container.children.length && onEmpty) onEmpty();
          document.dispatchEvent(new CustomEvent('post:deleted'));
        } catch (ex) { toast(ex.message, 'error'); }
      }

      else if (e.target.closest('.btn-del-comment')) {
        if (!confirm('Delete this comment?')) return;
        const row = e.target.closest('.comment');
        try {
          await Api.request(`/comments/${row.dataset.commentId}`, { method: 'DELETE' });
          row.remove();
          this.setCount(card, -1);
        } catch (ex) { toast(ex.message, 'error'); }
      }

      else if (e.target.closest('[data-retry-comments]')) this.loadComments(id, card.querySelector('.comments'));
    });

    container.addEventListener('submit', async (e) => {
      if (!e.target.matches('.comment-form')) return;
      e.preventDefault();
      const card = e.target.closest('.post');
      const input = e.target.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      const btn = e.target.querySelector('button');
      btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span>';
      try {
        const { comment } = await Api.request(`/posts/${card.dataset.id}/comments`, { method: 'POST', body: { text } });
        card.querySelector('.comment-list').insertAdjacentHTML('beforeend', this.commentHtml(comment));
        card.querySelector('.no-comments')?.remove();
        input.value = '';
        this.setCount(card, 1);
      } catch (ex) { toast(ex.message, 'error'); }
      btn.disabled = false; btn.textContent = 'Send';
    });
  },

  setCount(card, delta) {
    const span = card.querySelector('.btn-comment span');
    span.textContent = Math.max(0, Number(span.textContent) + delta);
  },

  async loadComments(postId, box) {
    box.innerHTML = spinnerHtml;
    try {
      const { comments } = await Api.request(`/posts/${postId}/comments`);
      box.innerHTML = `<div class="comment-list" style="display:flex;flex-direction:column;gap:.75rem">${comments.map((c) => this.commentHtml(c)).join('')}</div>
        ${comments.length ? '' : '<p class="muted no-comments" style="text-align:center">No comments yet — be the first!</p>'}
        <form class="comment-form"><input type="text" maxlength="300" placeholder="Write a comment..." required><button class="btn btn-primary btn-sm" type="submit">Send</button></form>`;
      box.dataset.loaded = '1';
    } catch (ex) {
      box.innerHTML = `<p class="muted">${escapeHtml(ex.message)} <button class="btn btn-outline btn-sm" data-retry-comments>Retry</button></p>`;
    }
  },

  // Paginated list loader used by both home feed and profile page
  createList({ container, loadMoreEl, buildQuery, emptyHtml }) {
    let page = 1;
    const list = {
      async load(reset = true) {
        if (reset) { page = 1; container.innerHTML = spinnerHtml; loadMoreEl.innerHTML = ''; }
        else loadMoreEl.innerHTML = '<div class="spinner"></div>';
        try {
          const data = await Api.request(`/posts?page=${page}&${buildQuery()}`);
          if (reset) container.innerHTML = '';
          container.insertAdjacentHTML('beforeend', data.posts.map((p) => PostUI.render(p)).join(''));
          if (!container.children.length) container.innerHTML = typeof emptyHtml === 'function' ? emptyHtml() : emptyHtml;
          loadMoreEl.innerHTML = data.hasMore ? '<button class="btn btn-outline">Load more</button>' : '';
          loadMoreEl.firstElementChild?.addEventListener('click', () => { page++; list.load(false); });
          list.total = data.total;
          document.dispatchEvent(new CustomEvent('posts:loaded', { detail: { total: data.total } }));
        } catch (ex) {
          const html = errorState(ex.message);
          if (reset) container.innerHTML = html; else { loadMoreEl.innerHTML = ''; toast(ex.message, 'error'); page--; }
          container.querySelector('[data-retry]')?.addEventListener('click', () => list.load(true));
        }
      },
      // Called after create/edit so the UI updates without a full reload
      upsert(post, mode) {
        const existing = container.querySelector(`.post[data-id="${post._id}"]`);
        if (mode === 'edit' && existing) existing.outerHTML = PostUI.render(post);
        else if (mode === 'create') {
          if (!container.querySelector('.post')) container.innerHTML = '';
          container.insertAdjacentHTML('afterbegin', PostUI.render(post));
        }
      },
    };
    return list;
  },
};

// ---------- Home page ----------
if (document.body.dataset.page === 'home') {
  onReady(() => {
    let feed = 'all';
    const container = $('#posts');
    $('#composerAvatar').src = avatarUrl(Auth.user);
    $('#composerBtn').addEventListener('click', () => openPostModal());
    $('#composerPost').addEventListener('click', () => openPostModal());

    const emptyFor = () => feed === 'following'
      ? emptyState('fa-face-smile', 'Nothing here yet', 'Follow people to see their posts here, or <a href="search.html" style="color:var(--primary)">find people</a>.')
      : emptyState('fa-image', 'No posts yet', 'Be the first to share something!');

    const list = PostUI.createList({
      container, loadMoreEl: $('#loadMore'),
      buildQuery: () => (feed === 'following' ? 'feed=following' : ''),
      emptyHtml: emptyFor,
    });
    PostUI.mount(container, { onEmpty: () => (container.innerHTML = emptyFor()) });
    list.load();

    document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active'); feed = tab.dataset.feed; list.load();
    }));
    document.addEventListener('post:saved', (e) => list.upsert(e.detail.post, e.detail.mode));

    // Suggestions sidebar
    (async () => {
      const box = $('#suggestions');
      box.innerHTML = spinnerHtml;
      try {
        const { users } = await Api.request('/users');
        box.innerHTML = users.slice(0, 5).map(userRow).join('') || '<p class="muted">You are following everyone. 🎉</p>';
      } catch (ex) { box.innerHTML = `<p class="muted">${escapeHtml(ex.message)}</p>`; }
    })();
  });
}

// A user row with avatar, name and follow button (used by suggestions + search)
function userRow(u) {
  return `<div class="user-row">
    <a href="profile.html?id=${u._id}"><img class="avatar" src="${avatarUrl(u)}" alt=""></a>
    <a class="info" href="profile.html?id=${u._id}"><b>${escapeHtml(u.name)}</b><span class="muted">@${escapeHtml(u.username)}</span></a>
    ${followBtn(u._id)}</div>`;
}
