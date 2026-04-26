/* eslint-disable no-alert */
(() => {
  const STORAGE_KEY = "sp_products_v1";
  const CART_KEY = "sp_cart_v1";
  const VIEW_KEY = "sp_view_v1";
  const CURRENCY = "$";

  const els = {
    search: document.getElementById("search"),
    sort: document.getElementById("sort"),
    list: document.getElementById("list"),
    empty: document.getElementById("empty"),
    count: document.getElementById("count"),
    clearAll: document.getElementById("clearAll"),
    openAdd: document.getElementById("openAdd"),
    emptyAdd: document.getElementById("emptyAdd"),
    fab: document.getElementById("fab"),
    tabCatalog: document.getElementById("tabCatalog"),
    tabCart: document.getElementById("tabCart"),
    catalogView: document.getElementById("catalogView"),
    cartView: document.getElementById("cartView"),
    openCart: document.getElementById("openCart"),
    openScan: document.getElementById("openScan"),
    scanInCart: document.getElementById("scanInCart"),
    scanFab: document.getElementById("scanFab"),
    cartEmpty: document.getElementById("cartEmpty"),
    cartList: document.getElementById("cartList"),
    cartTotal: document.getElementById("cartTotal"),
    clearCart: document.getElementById("clearCart"),
    checkoutCopy: document.getElementById("checkoutCopy"),
    modal: document.getElementById("modal"),
    backdrop: document.getElementById("backdrop"),
    closeModal: document.getElementById("closeModal"),
    modalTitle: document.getElementById("modalTitle"),
    productForm: document.getElementById("productForm"),
    editingId: document.getElementById("editingId"),
    name: document.getElementById("name"),
    price: document.getElementById("price"),
    category: document.getElementById("category"),
    barcode: document.getElementById("barcode"),
    note: document.getElementById("note"),
    resetBtn: document.getElementById("resetBtn"),
    themeToggle: document.getElementById("themeToggle"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    toastClose: document.getElementById("toastClose"),

    scanModal: document.getElementById("scanModal"),
    scanBackdrop: document.getElementById("scanBackdrop"),
    closeScan: document.getElementById("closeScan"),
    startScan: document.getElementById("startScan"),
    stopScan: document.getElementById("stopScan"),
    scanVideo: document.getElementById("scanVideo"),
    scanHint: document.getElementById("scanHint"),
    manualBarcode: document.getElementById("manualBarcode"),
    useManualBarcode: document.getElementById("useManualBarcode"),
  };

  let products = loadProducts();
  let cart = loadCart();
  let activeView = loadView();
  let toastTimer = null;

  let scanStream = null;
  let scanDetector = null;
  let scanRunning = false;
  let lastScanned = { value: "", at: 0 };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return `${CURRENCY}0.00`;
    return `${CURRENCY}${n.toFixed(2)}`;
  }

  function normalizeBarcode(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^0-9A-Za-z]/g, "");
  }

  function id() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
    return `p_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function defaultProducts() {
    const now = Date.now();
    return [
      {
        id: id(),
        name: "Camisa Polo",
        price: 12.99,
        category: "Ropa",
        barcode: "",
        note: "Algodon",
        createdAt: now - 1000 * 60 * 60 * 24 * 2,
        updatedAt: now - 1000 * 60 * 60 * 24 * 2,
      },
      {
        id: id(),
        name: "Cafe molido 500g",
        price: 5.5,
        category: "Despensa",
        barcode: "",
        note: "Tueste medio",
        createdAt: now - 1000 * 60 * 60 * 18,
        updatedAt: now - 1000 * 60 * 60 * 18,
      },
      {
        id: id(),
        name: "Audifonos",
        price: 19.0,
        category: "Electronica",
        barcode: "",
        note: "Inalambricos",
        createdAt: now - 1000 * 60 * 45,
        updatedAt: now - 1000 * 60 * 45,
      },
    ];
  }

  function loadProducts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProducts();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return defaultProducts();
      return parsed
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          id: String(p.id || id()),
          name: String(p.name || ""),
          price: Number(p.price ?? 0),
          category: String(p.category || ""),
          barcode: normalizeBarcode(p.barcode || ""),
          note: String(p.note || ""),
          createdAt: Number(p.createdAt || Date.now()),
          updatedAt: Number(p.updatedAt || Number(p.createdAt) || Date.now()),
        }))
        .filter((p) => p.name.trim().length > 0);
    } catch {
      return defaultProducts();
    }
  }

  function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          productId: String(x.productId || ""),
          qty: Math.max(1, Math.floor(Number(x.qty || 1))),
        }))
        .filter((x) => x.productId);
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function loadView() {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      return v === "cart" ? "cart" : "catalog";
    } catch {
      return "catalog";
    }
  }

  function saveView() {
    try {
      localStorage.setItem(VIEW_KEY, activeView);
    } catch {
      // Ignore.
    }
  }

  function showToast(text) {
    if (toastTimer) window.clearTimeout(toastTimer);
    els.toastText.textContent = text;
    els.toast.classList.remove("hidden");
    toastTimer = window.setTimeout(() => {
      els.toast.classList.add("hidden");
    }, 2400);
  }

  function closeToast() {
    if (toastTimer) window.clearTimeout(toastTimer);
    els.toast.classList.add("hidden");
  }

  function openModal(mode) {
    els.modalTitle.textContent = mode === "edit" ? "Editar producto" : "Agregar producto";
    els.modal.classList.remove("hidden");
    // Lock scroll (simple approach for this one-screen app)
    document.body.style.overflow = "hidden";
    // Focus first field
    window.setTimeout(() => els.name.focus(), 0);
  }

  function closeModal() {
    els.modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function resetForm() {
    els.editingId.value = "";
    els.productForm.reset();
  }

  function fillForm(p) {
    els.editingId.value = p.id;
    els.name.value = p.name;
    els.price.value = String(Number(p.price ?? 0));
    els.category.value = p.category || "";
    els.barcode.value = p.barcode || "";
    els.note.value = p.note || "";
  }

  function setView(view) {
    activeView = view === "cart" ? "cart" : "catalog";
    saveView();
    const isCart = activeView === "cart";
    els.catalogView.classList.toggle("hidden", isCart);
    els.cartView.classList.toggle("hidden", !isCart);
    // Keep search/sort relevant to catalog.
    els.search.closest("label").classList.toggle("hidden", isCart);
    els.sort.closest("label").classList.toggle("hidden", isCart);

    // Visual state
    const active = "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white";
    const inactive = "bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800";
    const base =
      "rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50 active:translate-y-px dark:hover:bg-slate-800";
    els.tabCatalog.className = `${base} ${isCart ? inactive : active}`;
    els.tabCart.className = `${base} ${isCart ? active : inactive}`;

    render();
  }

  function upsertCartItem(productId, deltaQty) {
    const idx = cart.findIndex((x) => x.productId === productId);
    if (idx < 0) {
      if (deltaQty <= 0) return;
      cart.unshift({ productId, qty: deltaQty });
    } else {
      const next = cart[idx].qty + deltaQty;
      if (next <= 0) {
        cart.splice(idx, 1);
      } else {
        cart[idx].qty = next;
      }
    }
    saveCart();
    renderCart();
  }

  function clearCart() {
    if (cart.length === 0) return;
    const ok = window.confirm("Vaciar la cuenta? Esto no se puede deshacer.");
    if (!ok) return;
    cart = [];
    saveCart();
    renderCart();
    showToast("Cuenta vaciada");
  }

  function buildCartSummaryText() {
    const lines = [];
    let total = 0;
    for (const item of cart) {
      const p = products.find((x) => x.id === item.productId);
      if (!p) continue;
      const qty = Math.max(1, item.qty);
      const sub = qty * Number(p.price || 0);
      total += sub;
      lines.push(`${qty} x ${p.name} = ${formatMoney(sub)}`);
    }
    lines.push(`TOTAL: ${formatMoney(total)}`);
    return lines.join("\n");
  }

  async function copyCheckout() {
    if (cart.length === 0) {
      showToast("No hay items");
      return;
    }
    const text = buildCartSummaryText();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        showToast("Cuenta copiada");
        return;
      }
    } catch {
      // Fall through.
    }
    // Fallback
    window.prompt("Copia la cuenta:", text);
  }

  function renderCart() {
    // Remove missing products from cart
    cart = cart.filter((x) => products.some((p) => p.id === x.productId));
    saveCart();

    if (cart.length === 0) {
      els.cartEmpty.classList.remove("hidden");
      els.cartList.innerHTML = "";
      els.cartTotal.textContent = formatMoney(0);
      return;
    }

    els.cartEmpty.classList.add("hidden");

    let total = 0;
    els.cartList.innerHTML = cart
      .map((item) => {
        const p = products.find((x) => x.id === item.productId);
        if (!p) return "";
        const qty = Math.max(1, item.qty);
        const sub = qty * Number(p.price || 0);
        total += sub;
        return `
          <div class="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold">${escapeHtml(p.name)}</div>
                <div class="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  ${escapeHtml(p.category || "Sin categoria")} • ${formatMoney(p.price)}
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="text-sm font-semibold">${formatMoney(sub)}</div>
                <div class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Subtotal</div>
              </div>
            </div>

            <div class="mt-2 flex items-center justify-between">
              <div class="text-xs text-slate-600 dark:text-slate-400">Cantidad</div>
              <div class="flex items-center gap-2">
                <button type="button" data-cart="dec" data-id="${escapeHtml(p.id)}" class="h-10 w-10 rounded-2xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 active:translate-y-px dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">-</button>
                <div class="min-w-[2.5rem] text-center text-sm font-semibold">${qty}</div>
                <button type="button" data-cart="inc" data-id="${escapeHtml(p.id)}" class="h-10 w-10 rounded-2xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 active:translate-y-px dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">+</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    els.cartTotal.textContent = formatMoney(total);
  }

  function openScanModal() {
    els.scanModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    els.scanHint.textContent =
      "BarcodeDetector " + ("BarcodeDetector" in window ? "disponible" : "no disponible en este navegador") + ".";
  }

  async function stopScan() {
    scanRunning = false;
    if (scanStream) {
      for (const t of scanStream.getTracks()) t.stop();
    }
    scanStream = null;
    scanDetector = null;
    try {
      els.scanVideo.pause();
    } catch {
      // Ignore.
    }
    els.scanVideo.srcObject = null;
  }

  function closeScanModal() {
    els.scanModal.classList.add("hidden");
    document.body.style.overflow = "";
    stopScan();
  }

  function findProductByBarcode(value) {
    const bc = normalizeBarcode(value);
    if (!bc) return null;
    return products.find((p) => normalizeBarcode(p.barcode) === bc) || null;
  }

  function handleScannedBarcode(value) {
    const bc = normalizeBarcode(value);
    if (!bc) return;

    const now = Date.now();
    if (lastScanned.value === bc && now - lastScanned.at < 1200) return;
    lastScanned = { value: bc, at: now };

    const p = findProductByBarcode(bc);
    if (p) {
      upsertCartItem(p.id, 1);
      try {
        if (navigator.vibrate) navigator.vibrate(15);
      } catch {
        // Ignore.
      }
      showToast(`+1 ${p.name}`);
      return;
    }

    // Not found: open product modal with barcode prefilled.
    closeScanModal();
    resetForm();
    els.barcode.value = bc;
    openModal("add");
    showToast("Codigo nuevo: agrega el producto");
  }

  async function startScan() {
    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
      showToast("Camara no disponible");
      return;
    }
    if (!("BarcodeDetector" in window)) {
      showToast("Este navegador no soporta escaneo nativo. Usa codigo manual.");
      return;
    }

    await stopScan();
    lastScanned = { value: "", at: 0 };

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      els.scanVideo.srcObject = scanStream;
      await els.scanVideo.play();
    } catch {
      showToast("Permiso de camara denegado");
      return;
    }

    const formats = ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "qr_code"];
    try {
      scanDetector = new window.BarcodeDetector({ formats });
    } catch {
      scanDetector = new window.BarcodeDetector();
    }

    scanRunning = true;
    const loop = async () => {
      if (!scanRunning) return;
      try {
        const barcodes = await scanDetector.detect(els.scanVideo);
        if (barcodes && barcodes.length) {
          const raw = barcodes[0].rawValue || "";
          if (raw) handleScannedBarcode(raw);
        }
      } catch {
        // Ignore intermittent detect errors.
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function getFilteredAndSorted() {
    const q = (els.search.value || "").trim().toLowerCase();
    const sort = els.sort.value;

    let list = products;
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.category} ${p.note}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const byName = (a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    const byPriceAsc = (a, b) => Number(a.price) - Number(b.price) || byName(a, b);
    const byPriceDesc = (a, b) => Number(b.price) - Number(a.price) || byName(a, b);
    const byNewest = (a, b) => Number(b.createdAt) - Number(a.createdAt) || byName(a, b);

    if (sort === "name_asc") list = [...list].sort(byName);
    if (sort === "price_asc") list = [...list].sort(byPriceAsc);
    if (sort === "price_desc") list = [...list].sort(byPriceDesc);
    if (sort === "newest") list = [...list].sort(byNewest);

    return list;
  }

  function render() {
    // View toggles
    els.openCart.textContent = activeView === "cart" ? "Catalogo" : "Cuenta";
    if (activeView === "cart") {
      renderCart();
      return;
    }

    const filtered = getFilteredAndSorted();

    els.count.textContent = String(filtered.length);

    if (products.length === 0) {
      els.empty.classList.remove("hidden");
    } else {
      els.empty.classList.add("hidden");
    }

    if (filtered.length === 0) {
      els.list.innerHTML =
        products.length === 0
          ? ""
          : `
            <div class="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No hay resultados para tu busqueda.
            </div>
          `;
      return;
    }

    els.list.innerHTML = filtered
      .map((p, idx) => {
        const name = escapeHtml(p.name);
        const category = escapeHtml(p.category || "Sin categoria");
        const note = escapeHtml(p.note || "");
        const barcode = escapeHtml(p.barcode || "");
        const price = formatMoney(p.price);

        return `
          <article class="fx-card rounded-3xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900" style="animation-delay: ${Math.min(idx, 18) * 35}ms">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold">${name}</h3>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    ${category}
                  </span>
                  ${
                    note
                      ? `<span class="truncate text-xs text-slate-600 dark:text-slate-400">${note}</span>`
                      : barcode
                        ? `<span class="truncate text-xs text-slate-600 dark:text-slate-400">${barcode}</span>`
                        : `<span class="text-xs text-slate-500 dark:text-slate-500">&nbsp;</span>`
                  }
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="text-lg font-semibold tracking-tight">${price}</div>
                <div class="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Precio</div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                data-action="addcart"
                data-id="${escapeHtml(p.id)}"
                class="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 active:translate-y-px dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                A la cuenta
              </button>
              <button
                type="button"
                data-action="edit"
                data-id="${escapeHtml(p.id)}"
                class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Editar
              </button>
              <button
                type="button"
                data-action="delete"
                data-id="${escapeHtml(p.id)}"
                class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:translate-y-px dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/40"
              >
                Eliminar
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function addProduct({ name, price, category, note }) {
    const now = Date.now();
    products.unshift({
      id: id(),
      name,
      price,
      category,
      barcode: "",
      note,
      createdAt: now,
      updatedAt: now,
    });
    saveProducts();
    render();
  }

  function updateProduct(productId, patch) {
    const idx = products.findIndex((p) => p.id === productId);
    if (idx < 0) return;
    const now = Date.now();
    products[idx] = {
      ...products[idx],
      ...patch,
      updatedAt: now,
    };
    saveProducts();
    render();
  }

  function deleteProduct(productId) {
    products = products.filter((p) => p.id !== productId);
    saveProducts();
    cart = cart.filter((x) => x.productId !== productId);
    saveCart();
    render();
  }

  function clearAll() {
    if (products.length === 0) return;
    const ok = window.confirm("Eliminar todos los productos? Esto no se puede deshacer.");
    if (!ok) return;
    products = [];
    saveProducts();
    cart = [];
    saveCart();
    render();
    showToast("Lista limpiada");
  }

  // Events
  els.search.addEventListener("input", render);
  els.sort.addEventListener("change", render);

  els.tabCatalog.addEventListener("click", () => setView("catalog"));
  els.tabCart.addEventListener("click", () => setView("cart"));
  els.openCart.addEventListener("click", () => setView(activeView === "cart" ? "catalog" : "cart"));

  els.openAdd.addEventListener("click", () => {
    resetForm();
    openModal("add");
  });
  els.emptyAdd.addEventListener("click", () => {
    resetForm();
    openModal("add");
  });
  els.fab.addEventListener("click", () => {
    resetForm();
    openModal("add");
  });

  const openScanFromAnywhere = async () => {
    openScanModal();
    // Try to start immediately (still requires browser permission).
    await startScan();
  };
  els.openScan.addEventListener("click", openScanFromAnywhere);
  els.scanInCart.addEventListener("click", openScanFromAnywhere);
  els.scanFab.addEventListener("click", openScanFromAnywhere);

  els.closeModal.addEventListener("click", () => {
    closeModal();
  });
  els.backdrop.addEventListener("click", () => {
    closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.modal.classList.contains("hidden")) closeModal();
  });

  els.resetBtn.addEventListener("click", () => {
    resetForm();
    els.name.focus();
  });

  els.productForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = (els.name.value || "").trim();
    const price = Number(els.price.value);
    const category = (els.category.value || "").trim();
    const note = (els.note.value || "").trim();
    const barcode = normalizeBarcode(els.barcode.value);
    const editingId = (els.editingId.value || "").trim();

    if (!name) {
      els.name.focus();
      showToast("Escribe un nombre");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      els.price.focus();
      showToast("Precio invalido");
      return;
    }

    if (editingId) {
      updateProduct(editingId, { name, price, category, barcode, note });
      showToast("Producto actualizado");
    } else {
      const now = Date.now();
      products.unshift({
        id: id(),
        name,
        price,
        category,
        barcode,
        note,
        createdAt: now,
        updatedAt: now,
      });
      saveProducts();
      render();
      showToast("Producto agregado");
    }

    closeModal();
    resetForm();
  });

  els.list.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("button[data-action]") : null;
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const productId = btn.getAttribute("data-id");
    if (!action || !productId) return;

    const p = products.find((x) => x.id === productId);
    if (!p) return;

    if (action === "edit") {
      fillForm(p);
      openModal("edit");
      return;
    }

    if (action === "addcart") {
      upsertCartItem(productId, 1);
      showToast(`+1 ${p.name}`);
      return;
    }

    if (action === "delete") {
      const ok = window.confirm(`Eliminar "${p.name}"?`);
      if (!ok) return;
      deleteProduct(productId);
      showToast("Producto eliminado");
      return;
    }
  });

  els.clearAll.addEventListener("click", clearAll);

  els.themeToggle.addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    try {
      localStorage.setItem("sp_theme", isDark ? "dark" : "light");
    } catch {
      // Ignore.
    }
    showToast(isDark ? "Tema oscuro" : "Tema claro");
  });

  els.toastClose.addEventListener("click", closeToast);

  els.cartList.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("button[data-cart]") : null;
    if (!btn) return;
    const action = btn.getAttribute("data-cart");
    const productId = btn.getAttribute("data-id");
    if (!action || !productId) return;
    if (action === "inc") upsertCartItem(productId, 1);
    if (action === "dec") upsertCartItem(productId, -1);
  });
  els.clearCart.addEventListener("click", clearCart);
  els.checkoutCopy.addEventListener("click", copyCheckout);

  // Scanner events
  els.closeScan.addEventListener("click", closeScanModal);
  els.scanBackdrop.addEventListener("click", closeScanModal);
  els.startScan.addEventListener("click", startScan);
  els.stopScan.addEventListener("click", () => {
    stopScan();
    showToast("Escaneo detenido");
  });
  els.useManualBarcode.addEventListener("click", () => {
    const v = normalizeBarcode(els.manualBarcode.value);
    if (!v) {
      els.manualBarcode.focus();
      showToast("Escribe un codigo");
      return;
    }
    handleScannedBarcode(v);
  });

  // First render
  setView(activeView);
  render();

  // Trigger entrance animations once.
  requestAnimationFrame(() => {
    document.documentElement.classList.add("sp_loaded");
  });
})();
