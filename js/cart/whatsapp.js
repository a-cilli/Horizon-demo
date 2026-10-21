(function () {
  // Country code plus number, digits only, e.g. "5215512345678".
  // Leave empty and WhatsApp asks the customer to pick a contact.
  const WA_NUMBER = "";

 function buildMessage(items) {
  const lines = ["Estos son los productos que elegí:", ""];

  items.forEach((item, i) => {
    const price = item.price != null
      ? ` - ${item.qty} x ${window.Cart.formatPrice(item.price)} = ${window.Cart.formatPrice(item.price * item.qty)}`
      : ` - ${item.qty} unid.`;
    lines.push(`${i + 1}. ${item.title}${price}`);
    lines.push("");
  });

  lines.push(`Precio final: ${window.Cart.formatPrice(window.Cart.total())}`);

  return lines.join("\n");
}

  function checkout() {
    const items = window.Cart.getItems();
    if (!items.length) return;

    const base = WA_NUMBER ? `https://wa.me/${WA_NUMBER}` : "https://wa.me/";
    const url = `${base}?text=${encodeURIComponent(buildMessage(items))}`;
    window.open(url, "_blank", "noopener");
  }

  window.CartWhatsApp = { buildMessage, checkout };
})();