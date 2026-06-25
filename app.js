// ══════════════════════════════════════════════════════
//  CONFIGURACIÓN GLOBAL
// ══════════════════════════════════════════════════════
window.SHEET_CSV_URL     = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT26n3U0sniaztj-nS4Qm8iro_fAvED2sQ5BLB7jlVE-NY0byZNmCJfBaiOQEm7qIFKxTkBNeohLwGI/pub?output=csv";
window.GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxccGfv-jhftv2il90Uisbe_idJTZy-AOvBIwha45YYsbRl_5GcNOMD6UwUAQChOVfzfw/exec"; 
window.WHATSAPP_NUMBER   = "5491123456789"; // Reemplazar con el número real de WhatsApp de la marca
// ══════════════════════════════════════════════════════

const CART_KEY = 'huma_cart';
const IS_ADMIN = typeof window !== 'undefined' && window.location.pathname.includes('admin');

// ─── CSV Parser Global ────────────────────────────────

window.parseCSV = function(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    if (vals.length === 0 || (vals.length === 1 && vals[0] === "")) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = vals[idx] ? vals[idx].trim() : '';
    });
    rows.push(obj);
  }
  return rows;
};

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

// ─── Carrito de Compras ───────────────────────────────

let cart = [];
try {
  cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
} catch(e) { cart = []; }

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

function addToCart(id, nombre, precio, imagen) {
  const parsedPrecio = parseFloat(precio) || 0;
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, nombre, precio: parsedPrecio, imagen, qty: 1 });
  }
  saveCart();
  openCartDrawer();
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  saveCart();
}

function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if(drawer && overlay) {
    overlay.classList.remove('hidden');
    setTimeout(() => {
      drawer.classList.add('open');
      overlay.style.opacity = "1";
    }, 20);
  }
}

// Hace la función de cierre accesible también desde fuera si es necesario
window.closeCartDrawer = function() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if(drawer && overlay) {
    drawer.classList.remove('open');
    overlay.style.opacity = "0";
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }
};

function updateCartUI() {
  const navCount = document.getElementById('navCartCount');
  const floatCount = document.getElementById('floatingCartCount');
  const itemsContainer = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const emptyState = document.getElementById('cartEmpty');
  const totalEl = document.getElementById('cartTotal');

  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.precio * item.qty), 0);

  [navCount, floatCount].forEach(el => {
    if (el) {
      if (totalItems > 0) {
        el.textContent = totalItems;
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = '';
    footer?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  footer?.classList.remove('hidden');
  if (totalEl) totalEl.textContent = `$${totalPrice.toLocaleString('es-AR')}`;

  itemsContainer.innerHTML = cart.map(item => `
    <div class="flex items-center gap-3 py-3 border-b border-mist/50 last:border-none">
      <img src="${item.imagen}" alt="${item.nombre}" class="w-16 h-20 object-cover bg-mist rounded-sm shrink-0" />
      <div class="flex-1 min-w-0">
        <h4 class="font-body text-sm font-medium truncate">${item.nombre}</h4>
        <p class="font-display text-base text-charcoal/70 mt-0.5">$${item.precio.toLocaleString('es-AR')}</p>
        <div class="flex items-center gap-2 mt-2">
          <button onclick="updateQty('${item.id}', -1)" class="w-6 h-6 border border-mist flex items-center justify-center text-xs hover:border-charcoal rounded-sm">-</button>
          <span class="font-body text-xs min-w-[16px] text-center">${item.qty}</span>
          <button onclick="updateQty('${item.id}', 1)" class="w-6 h-6 border border-mist flex items-center justify-center text-xs hover:border-charcoal rounded-sm">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function sendWhatsAppOrder() {
  if (cart.length === 0) return;
  let text = "Hola HUMA, me gustaría realizar el siguiente pedido:\n\n";
  cart.forEach(item => {
    text += `• ${item.nombre} (x${item.qty}) - $${(item.precio * item.qty).toLocaleString('es-AR')}\n`;
  });
  const totalPrice = cart.reduce((acc, item) => acc + (item.precio * item.qty), 0);
  text += `\n*Total: $${totalPrice.toLocaleString('es-AR')}*`;
  
  window.open(`https://wa.me/${window.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
}

function initCartEvents() {
  document.getElementById('navCartBtn')    ?.addEventListener('click', openCartDrawer);
  document.getElementById('floatingCart')  ?.addEventListener('click', openCartDrawer);
  document.getElementById('closeCartBtn')   ?.addEventListener('click', window.closeCartDrawer);
  document.getElementById('cartOverlay')   ?.addEventListener('click', window.closeCartDrawer);
  document.getElementById('whatsappBtn')   ?.addEventListener('click', sendWhatsAppOrder);
}

// ─── Modal de Imágenes Extendidas ────────────────────

let currentModalImages = [];
let currentModalIdx = 0;

function openImageModal(imgSrcsStr, startIdx = 0) {
  const srcs = imgSrcsStr.split('|').map(s => s.trim()).filter(Boolean);
  if(srcs.length === 0) return;
  
  currentModalImages = srcs.map(s => {
    let clean = s.replace(/\\/g, '/');
    if(!clean.startsWith('http') && !clean.startsWith('img/')) clean = 'img/' + clean;
    return clean;
  });
  
  currentModalIdx = startIdx;
  const modal = document.getElementById('imageModal');
  if(modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateModalUI();
  }
}

function updateModalUI() {
  const img = document.getElementById('modalImg');
  const counter = document.getElementById('modalCounter');
  const prev = document.getElementById('modalPrev');
  const next = document.getElementById('modalNext');
  
  if(!img) return;
  img.src = currentModalImages[currentModalIdx];
  
  if(currentModalImages.length <= 1) {
    if(prev) prev.style.display = 'none';
    if(next) next.style.display = 'none';
    if(counter) counter.textContent = '';
  } else {
    if(prev) prev.style.display = 'flex';
    if(next) next.style.display = 'flex';
    if(counter) counter.textContent = `${currentModalIdx + 1} / ${currentModalImages.length}`;
  }
}

function modalPrev() {
  if(currentModalImages.length <= 1) return;
  currentModalIdx = (currentModalIdx - 1 + currentModalImages.length) % currentModalImages.length;
  updateModalUI();
}

function modalNext() {
  if(currentModalImages.length <= 1) return;
  currentModalIdx = (currentModalIdx + 1) % currentModalImages.length;
  updateModalUI();
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  if(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function initModalEvents() {
  document.getElementById('modalClose')   ?.addEventListener('click', closeImageModal);
  document.getElementById('modalBackdrop')?.addEventListener('click', closeImageModal);
  document.getElementById('modalPrev')    ?.addEventListener('click', modalPrev);
  document.getElementById('modalNext')    ?.addEventListener('click', modalNext);
  
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('imageModal');
    if(!modal || !modal.classList.contains('open')) return;
    if(e.key === 'Escape') closeImageModal();
    if(e.key === 'ArrowLeft') modalPrev();
    if(e.key === 'ArrowRight') modalNext();
  });
}

// ─── Renderizado del Catálogo (Web Principal) ─────────

const cardState = {};

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  const countEl = document.getElementById('productCount');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-12 text-center text-charcoal/40 font-display italic text-lg">Próximamente nuevas piezas</div>';
    if(countEl) countEl.textContent = '0 piezas';
    return;
  }

  if(countEl) countEl.textContent = `${products.length} ${products.length === 1 ? 'pieza' : 'piezas'}`;

  grid.innerHTML = products.map(p => {
    const images = p.imagenes ? p.imagenes.split('|').map(s => s.trim()).filter(Boolean) : [];
    if (images.length === 0) images.push('placeholder.jpg');

    cardState[p.id] = { images, current: 0 };

    let firstImg = images[0].replace(/\\/g, '/');
    if (!firstImg.startsWith('http') && !firstImg.startsWith('img/')) firstImg = 'img/' + firstImg;

    const hasNav = images.length > 1;
    const navArrows = hasNav ? `
      <button class="card-arrow left" data-id="${p.id}" aria-label="Foto anterior">&#8249;</button>
      <button class="card-arrow right" data-id="${p.id}" aria-label="Siguiente foto">&#8250;</button>
    ` : '';
    
    const counter = hasNav ? `<span class="card-counter" id="count-${p.id}">1/${images.length}</span>` : '';

    let thumbs = '';
    if (hasNav) {
      thumbs = `<div class="thumb-strip">` + images.map((img, i) => {
        let tUrl = img.replace(/\\/g, '/');
        if (!tUrl.startsWith('http') && !tUrl.startsWith('img/')) tUrl = 'img/' + tUrl;
        return `<img src="${tUrl}" class="${i===0?'active':''}" data-id="${p.id}" data-idx="${i}" alt="" />`;
      }).join('') + `</div>`;
    }

    return `
      <div class="product-card flex flex-col bg-transparent group">
        <div class="card-img-wrap">
          <img src="${firstImg}" id="img-${p.id}" data-raw="${p.imagenes || ''}" alt="${p.nombre}" />
          ${navArrows}
          ${counter}
        </div>
        ${thumbs}
        <div class="pt-4 pb-2 flex-1 flex flex-col justify-between">
          <div class="space-y-1">
            <h3 class="font-body text-sm font-medium text-charcoal tracking-wide truncate">${p.nombre}</h3>
            <p class="font-body text-xs text-charcoal/50 line-clamp-2 leading-relaxed min-h-[2rem]">${p.descripcion || ''}</p>
          </div>
          <div class="mt-4 flex items-baseline justify-between gap-2">
            <span class="font-display text-xl font-light text-charcoal/90">$${(parseFloat(p.precio)||0).toLocaleString('es-AR')}</span>
            <button onclick="addToCart('${p.id}', '${p.nombre.replace(/'/g, "\\'")}', '${p.precio}', '${firstImg}')"
              class="font-body text-[11px] font-medium tracking-widest uppercase border border-charcoal/20 px-3 py-1.5 rounded-sm
                     hover:bg-charcoal hover:text-cream hover:border-charcoal transition-all duration-200">
              Agregar
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initProductGridEvents(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-arrow');
    if (btn) {
      e.stopPropagation();
      const id = btn.dataset.id;
      const state = cardState[id];
      if (!state) return;

      if (btn.classList.contains('right')) {
        state.current = (state.current + 1) % state.images.length;
      } else {
        state.current = (state.current - 1 + state.images.length) % state.images.length;
      }
      switchCardImage(id, state.current);
      return;
    }

    const thumb = e.target.closest('.thumb-strip img');
    if (thumb) {
      e.stopPropagation();
      const id = thumb.dataset.id;
      const idx = parseInt(thumb.dataset.idx);
      if (cardState[id]) cardState[id].current = idx;
      switchCardImage(id, idx);
      return;
    }

    const mainImg = e.target.closest('.card-img-wrap img');
    if (mainImg) {
      const raw = mainImg.dataset.raw;
      const id = mainImg.id.replace('img-', '');
      const currentIdx = cardState[id] ? cardState[id].current : 0;
      openImageModal(raw, currentIdx);
    }
  });
}

function switchCardImage(pId, idx) {
  const state = cardState[pId];
  if (!state) return;
  const imgEl = document.getElementById(`img-${pId}`);
  const countEl = document.getElementById(`count-${pId}`);
  if (!imgEl) return;

  let nextSrc = state.images[idx].replace(/\\/g, '/');
  if (!nextSrc.startsWith('http') && !nextSrc.startsWith('img/')) nextSrc = 'img/' + nextSrc;
  imgEl.src = nextSrc;

  if (countEl) countEl.textContent = `${idx + 1}/${state.images.length}`;

  const wrapper = imgEl.closest('.product-card');
  if (wrapper) {
    wrapper.querySelectorAll('.thumb-strip img').forEach((t, i) => {
      if (i === idx) t.classList.add('active');
      else t.classList.remove('active');
    });
  }
}

// ─── Panel de Administración (ABM) ────────────────────

window.fillAdminForm = function(p) {
  const titles = { 'formTitle': 'Editar producto', 'submitBtn': 'Actualizar producto' };
  for (const id in titles) {
    const el = document.getElementById(id);
    if (el) el.textContent = titles[id];
  }
  ['id', 'nombre', 'precio', 'descripcion', 'imagenes', 'estado'].forEach(k => {
    const el = document.getElementById('field_' + k);
    if (el) el.value = p[k] || '';
  });
};

window.clearAdminForm = function() {
  const titles = { 'formTitle': 'Nuevo producto', 'submitBtn': 'Guardar producto' };
  for (const id in titles) {
    const el = document.getElementById(id);
    if (el) el.textContent = titles[id];
  }
  const form = document.getElementById('adminForm');
  if (form) form.reset();
  const hiddenId = document.getElementById('field_id');
  if (hiddenId) hiddenId.value = '';
  const msg = document.getElementById('adminMsg');
  if (msg) msg.textContent = '';
};

async function submitAdminForm(e) {
  e.preventDefault();
  const msg = document.getElementById('adminMsg');
  const btn = document.getElementById('submitBtn');

  if (msg) { msg.textContent = 'Procesando…'; msg.className = 'text-charcoal/60 text-sm animate-pulse'; }
  if (btn) btn.disabled = true;

  const required = ['id', 'nombre', 'precio'];
  const keys = ['id', 'nombre', 'precio', 'descripcion', 'imagenes', 'estado'];
  const payload = { action: 'save' };

  let valid = true;
  keys.forEach(k => {
    const el = document.getElementById('field_' + k);
    const val = el ? el.value.trim() : '';
    if (required.includes(k) && !val) valid = false;
    payload[k] = val;
  });

  if (!valid) {
    if (msg) { msg.textContent = 'Por favor complete todos los campos obligatorios (*).'; msg.className = 'text-red-600 text-sm'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar producto'; }
    return;
  }

  try {
    await fetch(window.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (msg) { msg.textContent = '✓ ¡Datos sincronizados con Google Sheets con éxito!'; msg.className = 'text-green-600 text-sm'; }
    clearAdminForm();
    if (typeof window.loadAdminProducts === 'function') {
      setTimeout(window.loadAdminProducts, 2000);
    }
  } catch (err) {
    if (msg) { msg.textContent = 'Error al guardar: ' + err.message; msg.className = 'text-red-600 text-sm'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar producto'; }
  }
}

window.deleteProduct = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) return;
  const msg = document.getElementById('adminMsg');
  if (msg) { msg.textContent = 'Eliminando de Google Sheets…'; msg.className = 'text-amber-600 text-sm'; }

  try {
    await fetch(window.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: id }),
    });
    if (msg) { msg.textContent = '✓ Producto eliminado de la planilla.'; msg.className = 'text-green-600 text-sm'; }
    if (typeof window.loadAdminProducts === 'function') {
      setTimeout(window.loadAdminProducts, 1500);
    }
  } catch (err) {
    if (msg) { msg.textContent = 'Error al eliminar: ' + err.message; msg.className = 'text-red-600 text-sm'; }
  }
};

function initAdminEvents() {
  document.getElementById('adminForm')    ?.addEventListener('submit', submitAdminForm);
  document.getElementById('clearFormBtn') ?.addEventListener('click', clearAdminForm);
  document.getElementById('refreshBtn')   ?.addEventListener('click', () => {
    if (typeof window.loadAdminProducts === 'function') window.loadAdminProducts();
  });
}

// ─── Inicialización de la Aplicación ──────────────────

async function initCatalog() {
  const loader = document.getElementById('loader');
  const errEl  = document.getElementById('catalogError');

  initCartEvents();
  initModalEvents();
  updateCartUI();

  try {
    const res = await fetch(window.SHEET_CSV_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = window.parseCSV(await res.text());
    loader?.classList.add('hidden');

    // Filtra y deja afuera los productos que digan "oculto" en la columna estado
    const productosActivos = rows.filter(p => p.estado?.toLowerCase().trim() !== 'oculto');

    initProductGridEvents(productosActivos);
    renderProducts(productosActivos);
  } catch (err) {
    console.error('Error cargando catálogo:', err);
    loader?.classList.add('hidden');
    errEl?.classList.remove('hidden');
  }
}

async function initAdmin() {
  initAdminEvents();
  if (typeof window.loadAdminProducts === 'function') {
    await window.loadAdminProducts();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (IS_ADMIN) initAdmin();
  else initCatalog();
});
