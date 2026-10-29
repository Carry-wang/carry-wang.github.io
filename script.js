(() => {
  const links = [...document.querySelectorAll('.page-nav a')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const setCurrent = id => links.forEach(link => {
    if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  let scheduled = false;
  let navigationLockUntil = 0;
  const updateNavigation = () => {
    scheduled = false;
    if (performance.now() < navigationLockUntil) return;
    const current = [...sections].reverse().find(section => section.getBoundingClientRect().top <= 115) || sections[0];
    if (current) setCurrent(current.id);
  };
  links.forEach(link => link.addEventListener('click', () => {
    setCurrent(link.hash.slice(1));
    navigationLockUntil = performance.now() + 850;
    window.setTimeout(updateNavigation, 900);
  }));
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); }
  }, { passive: true });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (sections.some(section => section.id === id)) setCurrent(id);
  });
  if (sections.some(section => `#${section.id}` === location.hash)) setCurrent(location.hash.slice(1));
  else updateNavigation();

  const dialog = document.getElementById('paper-preview');
  const trigger = document.querySelector('[data-paper-preview]');
  const closeButton = document.querySelector('[data-close-preview]');
  if (!dialog || !trigger || typeof dialog.showModal !== 'function') return;
  let previousFocus;
  trigger.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    previousFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('has-dialog');
    closeButton.focus();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('has-dialog');
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  });
})();
