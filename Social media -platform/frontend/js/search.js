// search.js — search users by name or username (debounced)
if (document.body.dataset.page === 'search') {
  onReady(() => {
    const input = $('#searchInput');
    const results = $('#results');
    const title = $('#resultsTitle');
    let timer, requestId = 0;

    async function run() {
      const q = input.value.trim();
      const myRequest = ++requestId; // ignore out-of-date responses
      title.textContent = q ? `Results for "${q}"` : 'People you may know';
      results.innerHTML = spinnerHtml;
      try {
        const { users } = await Api.request(`/users?search=${encodeURIComponent(q)}`);
        if (myRequest !== requestId) return;
        results.innerHTML = users.length ? users.map(userRow).join('')
          : emptyState('fa-face-frown', 'No users found', q ? 'Try a different name or username.' : 'No suggestions right now.');
      } catch (ex) {
        if (myRequest !== requestId) return;
        results.innerHTML = errorState(ex.message);
        results.querySelector('[data-retry]').addEventListener('click', run);
      }
    }

    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 350); });
    input.focus();
    run();
  });
}
