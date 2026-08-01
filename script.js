(() => {
  const trigger = document.querySelector("[data-paper-trigger]");
  const modal = document.querySelector("#paper-modal");
  const closeButton = document.querySelector("[data-paper-close]");
  const frame = modal.querySelector(".paper-preview__frame");
  const fallback = modal.querySelector(".paper-preview__fallback");
  const status = modal.querySelector(".paper-preview__status");

  const loadTimeout = 10000;
  const failureStatusMessage = "The embedded preview could not be loaded. Use the external arXiv link.";

  let previousFocus = null;
  let loadTimer = null;
  let loadStartedAt = null;
  let frameState = "idle";

  modal.tabIndex = -1;
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.style.pointerEvents = "none";

  const focusableElements = () =>
    [...modal.querySelectorAll(
      ".paper-preview__bar a[href], .paper-preview__fallback a[href], button:not([disabled])"
    )].filter((element) =>
      element.tabIndex >= 0 && !element.closest("[hidden]"));

  const clearLoadTimer = () => {
    window.clearTimeout(loadTimer);
    loadTimer = null;
  };

  const renderFrameState = () => {
    const showFrame = frameState === "loading" || frameState === "loaded";
    frame.hidden = !showFrame;
    fallback.hidden = showFrame;
    status.textContent = frameState === "failed" ? failureStatusMessage : "";
  };

  const showFallback = () => {
    if (frameState !== "loading") {
      return;
    }

    frameState = "failed";
    loadStartedAt = null;
    clearLoadTimer();
    renderFrameState();
  };

  const scheduleLoadTimeout = () => {
    clearLoadTimer();

    if (frameState !== "loading" || loadStartedAt === null) {
      return;
    }

    const remaining = loadTimeout - (Date.now() - loadStartedAt);

    if (remaining <= 0) {
      showFallback();
      return;
    }

    loadTimer = window.setTimeout(showFallback, remaining);
  };

  const focusInsideModal = () => {
    const [first] = focusableElements();
    (first || modal).focus();
  };

  const openModal = () => {
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");

    if (frameState === "idle") {
      frameState = "loading";
      loadStartedAt = Date.now();
      frame.src = frame.dataset.src;
    }

    renderFrameState();

    if (frameState === "loading") {
      scheduleLoadTimeout();
    }

    closeButton.focus();
  };

  const closeModal = () => {
    clearLoadTimer();
    modal.hidden = true;
    document.body.classList.remove("modal-open");

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  };

  frame.addEventListener("load", () => {
    if (frameState !== "loading") {
      return;
    }

    frameState = "loaded";
    loadStartedAt = null;
    clearLoadTimer();

    renderFrameState();
  });

  frame.addEventListener("error", () => {
    if (frameState === "loading") {
      showFallback();
    }
  });
  trigger.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("focusin", (event) => {
    if (modal.hidden) {
      return;
    }

    if (modal.contains(event.target) && event.target !== frame) {
      return;
    }

    focusInsideModal();
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const elements = focusableElements();

    if (elements.length === 0) {
      event.preventDefault();
      modal.focus();
      return;
    }

    if (elements.length === 1) {
      event.preventDefault();
      elements[0].focus();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];

    if (!elements.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
