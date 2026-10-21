(function () {
  const horizon = document.getElementById("horizon");
  const visible = new Set(); // section guids currently in the viewport
  let api = null;
  let sections = [];
  let rows = new Map();      // section guid -> button
  let coverBtn = null;       // Portada button, only when the cover exists
  let coverInView = false;
  let panel, fab, list;

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    [].concat(children).forEach((c) => node.append(c));
    return node;
  }

  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
  }

  function setActive(btn, on) {
    btn.classList.toggle("is-active", on);
    if (on) btn.setAttribute("aria-current", "true");
    else btn.removeAttribute("aria-current");
  }

  // The cover counts as current while any of it is still below the fixed navbar (56px).
  // Once it scrolls past, the sections take over.
  function updateCoverState() {
    const ph = document.getElementById("ip-placeholder");
    coverInView = !!ph && ph.getBoundingClientRect().bottom > 56;
  }

  function updateHighlight() {
    const currentSection = coverInView
      ? null
      : sections.find((s) => visible.has(s.sectionGuid))?.sectionGuid;

    if (coverBtn) setActive(coverBtn, coverInView);
    rows.forEach((btn, guid) => setActive(btn, guid === currentSection));
  }

  function goToCover() {
    document.getElementById("ip-placeholder").scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  }

  // Adds Portada once the cover image exists. Safe to call more than once.
  function addCoverItem() {
    if (coverBtn || !list) return;
    if (!window.getCoverName().valid) return;
    if (!document.querySelector("#ip-placeholder img")) return;

    coverBtn = el("button", { class: "nav-item", onclick: goToCover }, "Portada");
    list.querySelectorAll(".nav-empty").forEach((n) => n.remove());
    list.prepend(el("li", {}, coverBtn));

    updateCoverState();
    updateHighlight();
  }

  function goTo(guid) {
    api.section.goToSection(guid);
    setOpen(false);
  }

  function build() {
    rows = new Map();

    const items = sections.map((s, i) => {
      const btn = el("button", {
        class: "nav-item",
        onclick: () => goTo(s.sectionGuid),
      }, s.title || `Sección ${i + 1}`);
      rows.set(s.sectionGuid, btn);
      return el("li", {}, btn);
    });

    list = el("ul", { class: "nav-list" }, items);
    if (!items.length) {
      list.append(el("li", { class: "nav-muted nav-empty" }, "No hay secciones."));
    }

    panel = el("div", { class: "nav-panel" }, [
      el("p", { class: "nav-title" }, "Secciones"),
      list,
    ]);
    panel.hidden = true;

    fab = el("button", {
      class: "nav-fab",
      "aria-label": "Mostrar secciones",
      "aria-expanded": "false",
      onclick: () => setOpen(panel.hidden),
    }, "☰");

    document.body.append(panel, fab);

    // Close when clicking anywhere outside the panel and the button
    document.addEventListener("click", (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !fab.contains(e.target)) {
        setOpen(false);
      }
    });

    // The cover may have finished before the list existed
    addCoverItem();
    updateHighlight();
  }

  function whenHorizonReady(el) {
    if (el.getAttribute("ready") === "true") return Promise.resolve(true);
    return new Promise((resolve) => {
      el.addEventListener("ready", () => resolve(true), { once: true });
    });
  }

  // Horizon.js dispatches this after the cover is placed. It can fire before or after build().
  window.addEventListener("cover:loaded", addCoverItem);

  window.addEventListener("scroll", () => {
    updateCoverState();
    updateHighlight();
  }, { passive: true });

  whenHorizonReady(horizon)
    .then(() => horizon.getApi())
    .then((a) => {
      api = a;
      sections = api.section.getSections() || [];

      // Seed with what is already on screen, then follow enter/leave events
      api.section.getSectionsInView().forEach((s) => visible.add(s.sectionGuid));
      api.section.subscribe((evt) => {
        const guid = evt.value?.sectionGuid;
        if (!guid) return;
        if (evt.action === "viewEnter") visible.add(guid);
        if (evt.action === "viewLeave") visible.delete(guid);
        updateHighlight();
      });

      build();
    })
    .catch((err) => console.error("[nav] No se pudo cargar las secciones", err));
})();