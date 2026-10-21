(function () {
  const horizon = document.getElementById("horizon");

  function whenHorizonReady(el) {
    if (el.getAttribute("ready") === "true") return Promise.resolve(true);
    return new Promise((resolve) => {
      el.addEventListener("ready", () => resolve(true), { once: true });
    });
  }

  window.CartUI.init();

  whenHorizonReady(horizon)
    .then(() => horizon.getApi())
    .then((api) => {
      api.content.subscribe((evt) => {
        // Only CTA clicks. Clicks on "price" are a different source and may
        // need the same behavior, which is question 2 below.
        if (evt.action !== "click" || evt.source !== "cta") return;

        const content = evt.value;
        if (content?.$type !== "offer" || !content.products?.length) return;

        window.CartUI.openProductModal(content);
      });
    })
    .catch((err) => console.error("[cart] No se pudo conectar con Horizon", err));
})();