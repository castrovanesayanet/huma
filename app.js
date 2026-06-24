// ══════════════════════════════════════════════════════
//  CONFIGURACIÓN — reemplazá estos dos valores
// ══════════════════════════════════════════════════════
const WHATSAPP_NUMBER = 'REEMPLAZAR_CON_TU_NUMERO';   // ej: 5491112345678
const SHEET_CSV_URL   = 'REEMPLAZAR_CON_URL_CSV';     // Archivo > Publicar en la web > CSV
// ══════════════════════════════════════════════════════

const CART_KEY = 'huma_cart';

// ─── Utilidades CSV ───────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    if (!vals.length) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseImages(raw) {
  if (!raw) return [];
  return raw.split('|').map(s => s.trim()).filter(Boolean).map(f => 'img/' + f);
}

// ─── Estado del catálogo ──────────────────────────────
// cardState[productId] = { idx: número de imagen actual }
const cardState = {};

// ─── Render productos ─────────────────────────────────

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  const count = document.getElementById('productCount');
  if (count) count.textContent = products.length + ' prendas';

  if (!products.length) {
    grid.innerHTML = '<p class="col-span-2 md:col-span-3 text-center font-body text-sm text-charcoal/40 py-12">Sin productos disponibles.</p>';
    return;
  }

  products.forEach(p => {
    const images = parseImages(p.imagenes);
    const hasMany = images.length > 1;
    cardState[p.id] = { idx: 0 };

    const firstImg = images[0] || '';
    const precio = parseFloat(p.precio) || 0;

    // miniaturas
    const thumbsHTML = hasMany
      ? `<div class="thumb-strip">
          ${images.map((src, i) => `
            <img src="${src}" alt="foto ${i+1}"
              class="${i === 0 ? 'active' : ''}"
              data-product-id="${p.id}"
              data-action="thumb"
              data-index="${i}" />`).join('')}
        </div>`
      : '';

    const card = document.createElement('div');
    card.className = 'product-card bg-white rounded-sm overflow-hidden flex flex-col';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img
          src="${firstImg}"
          alt="${p.nombre}"
          data-product-id="${p.id}"
          data-role="main-image"
          data-action="zoom"
          data-images='${JSON.stringify(images)}'
        />
        ${hasMany ? `
        <button class="card-arrow left"
          data-product-id="${p.id}" data-action="prev" aria-label="Anterior">&#8249;</button>
        <button class="card-arrow right"
          data-product-id="${p.id}" data-action="next" aria-label="Siguiente">&#8250;</button>
        <span class="card-counter" data-product-id="${p.id}" data-role="counter">1/${images.length}</span>
        ` : ''}
      </div>
      <div class="flex flex-col flex-1 p-3 gap-2">
        ${thumbsHTML}
        <div class="flex-1 mt-1">
          <h3 class="font-display text-base font-light leading-tight">${p.nombre}</h3>
          ${p.descripcion ? `<p class="font-body text-xs text-charcoal/50 mt-0.5 leading-relaxed">${p.descripcion}</p>` : ''}
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="font-display text-xl font-light">$${precio.toLocaleString('es-AR')}</span>
          <button
            class="add-btn bg-charcoal text-cream font-body text-[11px] tracking-widest uppercase px-3 py-2
                   hover:bg-bark transition-colors"
            data-product-id="${p.id}"
            data-action="add"
            aria-label="Agregar al carrito">
            + Agregar
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ─── Delegación de eventos en el grid ─────────────────

function initProductGridEvents(products) {
  const grid = document.getElementById('productGrid');

  grid.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const pid    = target.dataset.productId;
    const p      = products.find(x => x.id === pid);

    if (action === 'prev' || action === 'next') {
      const images = parseImages(p.imagenes);
      const total  = images.length;
      let idx = cardState[pid].idx;
      idx = action === 'next' ? (idx + 1) % total : (idx - 1 + total) % total;
      setCardImage(pid, images, idx);
    }

    if (action === 'thumb') {
      const images = parseImages(p.imagenes);
      const idx    = parseInt(target.dataset.index, 10);
      setCardImage(pid, images, idx);
    }

    if (action === 'zoom') {
      const images = JSON.parse(target.dataset.images || '[]');
      openImageModal(images, cardState[pid]?.idx || 0);
    }

    if (action === 'add') {
      addToCart(pid, p.nombre, parseFloat(p.precio) || 0);
      openCart();
    }
  });
}

// ─── Imagen de la card ────────────────────────────────

function setCardImage(pid, images, idx) {
  cardState[pid].idx = idx;

  const grid    = document.getElementById('productGrid');
  const mainImg = grid.querySelector(`img[data-product-id="${pid}"][data-role="main-image"]`);
  const counter = grid.querySelector(`[data-product-id="${pid}"][data-role="counter"]`);
  const thumbs  = grid.querySelectorAll(`img[data-product-id="${pid}"][data-action="thumb"]`);

  if (mainImg)  mainImg.src = images[idx];
  if (counter)  counter.textContent = `${idx + 1}/${images.length}`;
  thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
}

// ─── Modal ────────────────────────────────────────────

let _modalImages = [];
let _modalIdx    = 0;

function openImageModal(images, startIdx = 0) {
  _modalImages = images;
  _modalIdx    = startIdx;

  const modal    = document.getElementById('imageModal');
  const prev     = document.getElementById('modalPrev');
  const next     = document.getElementById('modalNext');
  const counter  = document.getElementById('modalCounter');

  const hasMany  = images.length > 1;
  if (prev)    prev.style.display    = hasMany ? 'flex' : 'none';
  if (next)    next.style.display    = hasMany ? 'flex' : 'none';
  if (counter) counter.style.display = hasMany ? 'block' : 'none';

  updateModalImage();
  modal.classList.add('open');
  document.addEventListener('keydown', handleModalKeydown);
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('open');
  document.removeEventListener('keydown', handleModalKeydown);
}

function modalNav(dir) {
  const total = _modalImages.length;
  _modalIdx = dir === 'next'
    ? (_modalIdx + 1) % total
    : (_modalIdx - 1 + total) % total;
  updateModalImage();
}

function updateModalImage() {
  const img     = document.getElementById('modalImg');
  const counter = document.getElementById('modalCounter');
  if (img)     img.src = _modalImages[_modalIdx];
  if (counter) counter.textContent = `${_modalIdx + 1} / ${_modalImages.length}`;
}

function handleModalKeydown(e) {
  if (e.key === 'ArrowLeft')  modalNav('prev');
  if (e.key === 'ArrowRight') modalNav('next');
  if (e.key === 'Escape')     closeImageModal();
}

function initModalEvents() {
  document.getElementById('modalClose')   ?.addEventListener('click', closeImageModal);
  document.getElementById('modalBackdrop')?.addEventListener('click', closeImageModal);
  document.getElementById('modalPrev')    ?.addEventListener('click', () => modalNav('prev'));
  document.getElementById('modalNext')    ?.addEventListener('click', () => modalNav('next'));
}

// ─── Carrito ──────────────────────────────────────────

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function addToCart(id, nombre, precio) {
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (item) { item.qty++; }
  else { cart.push({ id, nombre, precio, qty: 1 }); }
  saveCart(cart);
  updateCartUI();
}
function removeFromCart(id) {
  saveCart(getCart().filter(x => x.id !== id));
  updateCartUI();
}
function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(cart);
  updateCartUI();
}
function getCartCount()       { return getCart().reduce((s, i) => s + i.qty, 0); }
function getCartTotalAmount() { return getCart().reduce((s, i) => s + i.precio * i.qty, 0); }

function renderCart() {
  const cart      = getCart();
  const items     = document.getElementById('cartItems');
  const footer    = document.getElementById('cartFooter');
  const empty     = document.getElementById('cartEmpty');
  const totalEl   = document.getElementById('cartTotal');

  if (!cart.length) {
    items.innerHTML = '';
    footer?.classList.add('hidden');
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  footer?.classList.remove('hidden');

  items.innerHTML = cart.map(item => `
    <div class="flex gap-3 items-start py-3 border-b border-mist last:border-0">
      <div class="flex-1 min-w-0">
        <p class="font-body text-sm font-medium truncate">${item.nombre}</p>
        <p class="font-display text-base font-light mt-0.5">$${(item.precio * item.qty).toLocaleString('es-AR')}</p>
      </div>
      <div class="flex items-center gap-2 mt-0.5 shrink-0">
        <button onclick="changeQty('${item.id}', -1)"
          class="w-6 h-6 flex items-center justify-center border border-mist text-charcoal/60
                 hover:border-charcoal transition-colors text-lg leading-none">−</button>
        <span class="font-body text-sm w-4 text-center">${item.qty}</span>
        <button onclick="changeQty('${item.id}', 1)"
          class="w-6 h-6 flex items-center justify-center border border-mist text-charcoal/60
                 hover:border-charcoal transition-colors text-lg leading-none">+</button>
        <button onclick="removeFromCart('${item.id}')"
          class="ml-1 text-charcoal/30 hover:text-charcoal transition-colors text-base leading-none">✕</button>
      </div>
    </div>
  `).join('');

  if (totalEl) totalEl.textContent = '$' + getCartTotalAmount().toLocaleString('es-AR');
}

function updateCartUI() {
  const count = getCartCount();

  // nav badge
  const navCount = document.getElementById('navCartCount');
  if (navCount) {
    navCount.textContent = count;
    navCount.classList.toggle('hidden', count === 0);
  }
  // floating badge
  const floatCount = document.getElementById('floatingCartCount');
  if (floatCount) {
    floatCount.textContent = count;
    floatCount.classList.toggle('hidden', count === 0);
  }
  renderCart();
}

function openCart() {
  const drawer  = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  drawer?.classList.add('open');
  overlay?.classList.remove('hidden');
  requestAnimationFrame(() => overlay?.classList.remove('opacity-0'));
}

function closeCart() {
  const drawer  = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  drawer?.classList.remove('open');
  overlay?.classList.add('opacity-0');
  setTimeout(() => overlay?.classList.add('hidden'), 300);
}

function initCartEvents() {
  document.getElementById('navCartBtn')   ?.addEventListener('click', openCart);
  document.getElementById('floatingCart') ?.addEventListener('click', openCart);
  document.getElementById('closeCartBtn') ?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')  ?.addEventListener('click', closeCart);
  document.getElementById('whatsappBtn')  ?.addEventListener('click', sendWhatsAppOrder);
}

// ─── WhatsApp ─────────────────────────────────────────

function sendWhatsAppOrder() {
  const cart = getCart();
  if (!cart.length) return;
  const lines = cart.map(i => `- ${i.qty}x ${i.nombre} ($${(i.precio * i.qty).toLocaleString('es-AR')})`);
  const total = getCartTotalAmount();
  const msg   = ['Hola, quiero hacer un pedido:', ...lines, '', `Total: $${total.toLocaleString('es-AR')}`].join('\n');
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─── Bootstrap ───────────────────────────────────────

async function init() {
  initCartEvents();
  initModalEvents();
  updateCartUI();

  const loader = document.getElementById('loader');
  const errEl  = document.getElementById('catalogError');

  try {
    const res  = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);

    loader?.classList.add('hidden');

    initProductGridEvents(rows);
    renderProducts(rows);
  } catch (err) {
    console.error('Error cargando catálogo:', err);
    loader?.classList.add('hidden');
    errEl?.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', init);