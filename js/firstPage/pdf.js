(function () {
  const PDF_URL = "pdf/test.pdf";
  const btn = document.getElementById("downloadPdfBtn");
  const { name, valid } = window.getCoverName();

  if (!valid) {
    btn.style.display = "none";
    btn.disabled = true;
    btn.title = "Falta ?name= válido en la URL";
    return;
  }

  // Show the button only after horizon.js has placed the image
  window.addEventListener("cover:loaded", () => {
    btn.style.display = "block";
  });

  // Accepts only real JPG/PNG bytes, so an error page can't end up in the PDF
  function isImageBytes(buf) {
    const b = new Uint8Array(buf, 0, 4);
    const jpg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    return jpg || png;
  }

  // Local files are same-origin, so this fetch doesn't hit CORS
  async function fetchImageBytes(url) {
    const r = await fetch(url + "?cb=" + Date.now());
    if (!r.ok) throw new Error("No se pudo leer " + url + " (HTTP " + r.status + ")");
    const buf = await r.arrayBuffer();
    if (!isImageBytes(buf)) throw new Error(url + " no es una imagen JPG/PNG válida");
    return buf;
  }

  btn.addEventListener("click", async () => {
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Procesando…";

    try {
      const { src } = window.getCoverName();
      const [imgBytes, pdfResp] = await Promise.all([
        fetchImageBytes(src),
        fetch(PDF_URL)
      ]);
      if (!pdfResp.ok) throw new Error("No se encontró " + PDF_URL);

      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(await pdfResp.arrayBuffer());

      const b = new Uint8Array(imgBytes, 0, 4);
      const embedImg = (b[0] === 0x89 && b[1] === 0x50)
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);

      // Size the new page to match the current first page
      const [firstPage] = pdfDoc.getPages();
      const { width, height } = firstPage.getSize();

      // Insert at the front. Original pages are kept.
      const newPage = pdfDoc.insertPage(0, [width, height]);

      // Scale to cover the page and center. Overflow is clipped by the page,
      // so the image keeps its aspect ratio instead of being stretched.
      const scale = Math.max(width / embedImg.width, height / embedImg.height);
      const w = embedImg.width * scale;
      const h = embedImg.height * scale;
      newPage.drawImage(embedImg, {
        x: (width - w) / 2,
        y: (height - h) / 2,
        width: w,
        height: h,
      });

      const modifiedBytes = await pdfDoc.save();

      const blob = new Blob([modifiedBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `catalogo_${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      alert("Ocurrió un error. Por favor, inténtalo de nuevo en un momento.");
      console.error("[pdf] Failed:", err);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
})();