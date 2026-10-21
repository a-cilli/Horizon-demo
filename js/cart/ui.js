(function () {
  // Builds DOM nodes with textContent, not innerHTML.
  // Product titles come from the Horizon API, and innerHTML would let markup through.
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

  const fmt = (n) => window.Cart.formatPrice(n);

  // ---------- Product modal ----------
  let modal, modalBody;

  function closeModal() {
    if (modal) modal.hidden = true;
  }

  function productRow(p) {
    const price = p.sale_price?.value ?? p.price?.value ?? null;
    const original = p.sale_price && p.price ? p.price.value : null;
    const key = window.Cart.keyOf(p);

    const priceEl = el("div", { class: "cart-price" }, [
      original ? el("s", { class: "cart-muted" }, fmt(original)) : "",
      original ? " " : "",
      fmt(price),
    ]);

    const control = el("div", { class: "cart-qty" });

    // Re-renders the control after each change. Rows are rebuilt on every
    // modal open, so this avoids piling up cart subscriptions per row.
    function render() {
      const qty = window.Cart.getQty(p);
      control.replaceChildren();

      if (qty === 0) {
        control.append(el("button", {
          class: "cart-btn",
          onclick: () => { window.Cart.add(p); render(); },
        }, "Agregar al carrito"));
        return;
      }

      control.append(
        el("button", {
          class: "cart-qty-btn",
          "aria-label": "Quitar uno",
          onclick: () => { window.Cart.setQty(key, qty - 1); render(); },
        }, "−"),
        el("span", { class: "cart-qty-num" }, String(qty)),
        el("button", {
          class: "cart-qty-btn",
          "aria-label": "Agregar uno",
          onclick: () => { window.Cart.setQty(key, qty + 1); render(); },
        }, "+"),
      );
    }

    render();

    return el("li", { class: "cart-product-row" }, [
      el("div", { class: "cart-product-info" }, [
        el("strong", {}, p.title || ""),
        el("span", { class: "cart-muted" }, p.brand || ""),
        priceEl,
      ]),
      control,
    ]);
  }

  function openProductModal(offer) {
    modalBody.replaceChildren();
    if (offer.header) modalBody.append(el("h2", {}, offer.header));
    if (offer.summary) modalBody.append(el("p", { class: "cart-muted" }, offer.summary));
    modalBody.append(
      el("ul", { class: "cart-product-list" }, (offer.products || []).map(productRow))
    );
    modal.hidden = false;
  }

  function buildModal() {
    modalBody = el("div", { class: "cart-modal-body" });
    modal = el("div", {
      class: "cart-modal-backdrop",
      onclick: (e) => { if (e.target === modal) closeModal(); },
    }, [
      el("div", { class: "cart-modal", role: "dialog", "aria-modal": "true" }, [
        el("button", { class: "cart-icon-btn", "aria-label": "Cerrar", onclick: closeModal }, "×"),
        modalBody,
      ]),
    ]);
    modal.hidden = true;
    document.body.append(modal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // ---------- Sidebar ----------
  let sidebar, listEl, totalEl, checkoutBtn;

  function renderSidebar(items) {
    listEl.replaceChildren();

    if (!items.length) {
      listEl.append(el("li", { class: "cart-muted" }, "Todavía no agregas productos."));
    }

    items.forEach((i) => {
      listEl.append(el("li", { class: "cart-item" }, [
        el("div", { class: "cart-item-info" }, [
          el("strong", {}, i.title),
          el("span", { class: "cart-muted" }, i.brand || ""),
          el("span", { class: "cart-muted" }, `${i.qty} × ${fmt(i.price)}`),
        ]),
        el("span", {}, fmt((i.price || 0) * i.qty)),
        el("button", {
          class: "cart-link",
          onclick: () => window.Cart.remove(window.Cart.keyOf(i)),
        }, "Quitar"),
      ]));
    });

    const total = window.Cart.total();
    totalEl.textContent = items.length ? `Total: ${fmt(total)}` : "";
    checkoutBtn.disabled = items.length === 0;
  }

  function buildSidebar() {
    listEl = el("ul", { class: "cart-items" });
    totalEl = el("p", { class: "cart-total" });
    checkoutBtn = el("button", {
      class: "cart-btn cart-btn-wa",
      onclick: () => window.CartWhatsApp.checkout(),
    }, "Enviar pedido por WhatsApp");

    sidebar = el("aside", { class: "cart-sidebar", "aria-label": "Carrito" }, [
      el("div", { class: "cart-sidebar-head" }, [
        el("h2", {}, "Tu carrito"),
        el("button", {
          class: "cart-icon-btn",
          "aria-label": "Cerrar carrito",
          onclick: () => sidebar.classList.remove("open"),
        }, "×"),
      ]),
      listEl,
      totalEl,
      checkoutBtn,
    ]);

    document.body.append(sidebar);
    window.Cart.subscribe(renderSidebar);
    renderSidebar(window.Cart.getItems());
  }

  // ---------- Navbar ----------
  function buildNavbar() {
    const badge = el("span", { class: "cart-badge" }, String(window.Cart.count()));

    const nav = el("nav", { class: "cart-navbar" }, [
      el("span", { class: "cart-brand" }, "Catálogo"),
      el("button", {
        class: "cart-btn-nav",
        "aria-label": "Abrir carrito",
        onclick: () => sidebar.classList.toggle("open"),
      }, ["Carrito ", badge]),
    ]);

    document.body.prepend(nav);
    window.Cart.subscribe(() => { badge.textContent = String(window.Cart.count()); });
  }

  window.CartUI = {
    init() {
      buildModal();
      buildSidebar();
      buildNavbar();
    },
    openProductModal,
  };
})();