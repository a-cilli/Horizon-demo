(function () {
  const STORAGE_KEY = "catalogo-cart";
  const MAX_QTY = 99;
  const listeners = new Set();
  let items = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      // Carts saved before quantities existed have no qty field
      return saved.map((i) => ({ ...i, qty: i.qty || 1 }));
    } catch {
      return [];
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch { /* storage full or blocked: cart still works for this page view */ }
  }

  function emit() {
    save();
    listeners.forEach((fn) => fn(items.slice()));
  }

  function keyOf(p) {
    return String(p.sku || p.title || "");
  }

  function priceOf(p) {
    return p.sale_price?.value ?? p.price?.value ?? null;
  }

  function formatPrice(n) {
    if (n == null) return "";
    return "$" + Number(n).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  window.Cart = {
    keyOf,
    formatPrice,
    getItems: () => items.slice(),
    // Total units across all products, used for the navbar badge
    count: () => items.reduce((s, i) => s + i.qty, 0),
    total: () => items.reduce((s, i) => s + (i.price || 0) * i.qty, 0),
    getQty: (p) => items.find((i) => keyOf(i) === keyOf(p))?.qty ?? 0,

    add(product) {
      if (items.some((i) => keyOf(i) === keyOf(product))) return false;
      items.push({
        sku: product.sku ?? null,
        title: product.title ?? "",
        brand: product.brand ?? "",
        url: product.url ?? "",
        price: priceOf(product),
        qty: 1,
      });
      emit();
      return true;
    },

    // qty <= 0 removes the product. This is what makes "-" at 1 remove the line.
    setQty(key, qty) {
      const n = Math.floor(qty);
      if (n <= 0) {
        items = items.filter((i) => keyOf(i) !== key);
      } else {
        const item = items.find((i) => keyOf(i) === key);
        if (item) item.qty = Math.min(n, MAX_QTY);
      }
      emit();
    },

    remove(key) {
      items = items.filter((i) => keyOf(i) !== key);
      emit();
    },

    clear() {
      items = [];
      emit();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
})();