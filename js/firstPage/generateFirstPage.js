(function () {
  const IMAGE_MARGIN_BOTTOM = 24; // px
  const PAGE_WAIT_MS = 10000;     // how long to wait for the page after ready

  const { name, valid, src } = window.getCoverName();
  const holder = document.getElementById("ip-placeholder");
  const embed = document.getElementById("horizon");
  if (!valid || !holder || !embed) return;

  // Resolve when ready, whether that already happened or is still pending
  function whenHorizonReady(el) {
    if (el.getAttribute("ready") === "true") return Promise.resolve(true);
    return new Promise((resolve) => {
      el.addEventListener("ready", () => resolve(true), { once: true });
    });
  }

  // Pages live in nested open shadow roots:
  // ip-embed-leaflet > shadowRoot > ip-horizon-page-leaflet > shadowRoot > .x-page
  function findPage(root) {
    const direct = root.querySelector(".x-page");
    if (direct) return direct;
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) {
        const found = findPage(el.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }

  // The page can render a moment after "ready" fires
  function waitForPage(timeoutMs) {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        const page = embed.shadowRoot && findPage(embed.shadowRoot);
        if (page) return resolve(page);
        if (Date.now() - started > timeoutMs) return resolve(null);
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  whenHorizonReady(embed)
    .then(() => waitForPage(PAGE_WAIT_MS))
    .then((page) => {
      if (!page) {
        console.warn("[horizon] No se encontró la página del visor");
        return;
      }

      const img = document.createElement("img");
      img.alt = name;
      img.style.display = "block";
      img.style.height = "auto";
      img.style.marginBottom = IMAGE_MARGIN_BOTTOM + "px";

      // Match the page's width and left offset so the image lines up with it
      const sync = () => {
        const pr = page.getBoundingClientRect();
        const hr = holder.getBoundingClientRect();
        if (pr.width <= 0) return;
        img.style.width = pr.width + "px";
        img.style.marginLeft = (pr.left - hr.left) + "px";
      };

      // Attach the handler before setting src so a cached image still fires onload
      img.onload = () => {
        holder.appendChild(img);
        sync();
        new ResizeObserver(() => { if (img.isConnected) sync(); }).observe(page);
        window.addEventListener("resize", () => { if (img.isConnected) sync(); });

        // Tell pdf.js the cover is on the page
        window.dispatchEvent(new CustomEvent("cover:loaded", { detail: { name, src } }));
      };
      img.onerror = () => {
        console.error("[horizon] No se pudo cargar la imagen:", src);
      };
      img.src = src;
    });
})();