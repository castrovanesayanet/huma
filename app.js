// ══════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ══════════════════════════════════════════════════════
const SHEET_CSV_URL     = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT26n3U0sniaztj-nS4Qm8iro_fAvED2sQ5BLB7jlVE-NY0byZNmCJfBaiOQEm7qIFKxTkBNeohLwGI/pub?output=csv";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxccGfv-jhftv2il90Uisbe_idJTZy-AOvBIwha45YYsbRl_5GcNOMD6UwUAQChOVfzfw/exec"; 
const WHATSAPP_NUMBER   = "5491123456789"; 
// ══════════════════════════════════════════════════════

const CART_KEY = 'huma_cart';
const IS_ADMIN = typeof window !== 'undefined' && window.location.pathname.includes('admin');

// ─── CSV Parser Senior & Anti-Basura ───────────────────

function parseCSV(text) {
  if (!text) return [];
  // Elimina de raíz los retornos de carro (\r) que causan celdas y filas fantasmas
  const lines = text.replace(/\r/g, "").split('\n');
  if (lines.length < 2) return [];
  
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; 
    
    const vals = splitCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = vals[idx] ? vals[idx].trim() : ''; });
    
    // Validación de Integridad Estricta: Si no tiene ID o Nombre real, es basura del CSV
    if (obj.id && obj.id !== "" && obj.nombre && obj.nombre !== "") {
      rows.push(obj);
    }
  }
  return rows;
}

function splitCSVLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      res.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim().replace(/^"|"$/g, ''));
  return res;
}

// ─── Catálogo de Productos ─────────────────────────────

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-charcoal/40 font-body text-sm py-12">No hay productos disponibles por el momento.</p>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const imgs = p.imagenes ? p.imagenes.split(',').map(i => i.trim()) : [];
    const firstImg = imgs[0] || 'https://via.placeholder.com/600x800?text=HUMA';
    
    return `
      <div class="product-card group cursor-pointer" data-id="${p.id}">
        <div class="aspect-[3/4] w-full bg-mist overflow-hidden relative mb-4">
          <img src="${firstImg}" alt="${p.nombre}" class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" loading="lazy" />
        </div>
        <div class="flex justify-between items-start gap-4">
          <div class="space-y-1">
            <h3 class="font-display text-lg font-light tracking-wide text-charcoal group-hover:text-bark transition-colors">${p.nombre}</h3>
            <p class="font-body text-xs text-charcoal/40 line-clamp-1">${p.descripcion || ''}</p>
          </div>
          <p class="font-body text-sm font-medium text-charcoal shrink-0">$${parseFloat(p.precio || 0).toLocaleString('es-AR')}</p>
        </div>
      </div>
    `;
  }).join('');
}

function initProductGridEvents(products) {
  document.getElementById('productGrid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    const pid = card.dataset.id;
    const p = products.find(x => x.id === pid);
    if (p) openModal(p);
  });
}

// ─── Modal de Detalles ────────────────────────────────

let currentModalProduct = null;

function openModal(p) {
  currentModalProduct = p;
  const modal = document.getElementById('productModal');
  if (!modal) return;

  document.getElementById('modalNombre').textContent = p.nombre;
  document.getElementById('modalPrecio').textContent = `$${parseFloat(p.precio || 0).toLocaleString('es-AR')}`;
  document.getElementById('modalDescripcion').textContent = p.descripcion || '';

  const imgs = p.imagenes ? p.imagenes.split(',').map(i => i.trim()) : [];
  const gallery = document.getElementById('modalGallery');
  
  if (gallery) {
    if (imgs.length === 0) {
      gallery.innerHTML = `<img src="https://via.placeholder.com/600x800?text=HUMA" class="w-full h-full object-cover" />`;
    } else {
      gallery.innerHTML = imgs.map(img => `<div class="w-full h-full shrink-0"><img src="${img}" class="w-full h-full object-cover" /></div>`).join('');
    }
    gallery.scrollLeft = 0;
  }

  modal.classList.remove('pointer-events-none', 'opacity-0');
  document.body.classList.add('overflow-hidden');
}

function closeModal() {
  const modal = document.getElementById('productModal');
  if (!modal) return;
  modal.classList.add('pointer-events-none', 'opacity-0');
  document.body.classList.remove('overflow-hidden');
  currentModalProduct = null;
}

// ─── Bolsa de Compras (Carrito) ─────────────────────────

let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

function addToCart(p) {
  const item = cart.find(x => x.id === p.id);
  if (item) {
    item.qty += 1;
  } else {
    cart.push({ id: p.id, nombre: p.nombre, precio: parseFloat(p.precio || 0), imagenes: p.imagenes, qty: 1 });
  }
  saveCart();
}

window.updateQty = function(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
  }
  saveCart();
};

function updateCartUI() {
  const countEl = document.getElementById('cartCount');
  const itemsEl = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const checkoutEl = document.getElementById('cartCheckout');
  const totalEl = document.getElementById('cartTotal');

  const totalItems = cart.reduce((acc, x) => acc + x.qty, 0);
  if (countEl) countEl.textContent = totalItems;

  if (cart.length === 0) {
    emptyEl?.classList.remove('hidden');
    checkoutEl?.classList.add('hidden');
    if (itemsEl) itemsEl.innerHTML = '';
    return;
  }

  emptyEl?.classList.add('hidden');
  checkoutEl?.classList.remove('hidden');

  if (itemsEl) {
    itemsEl.innerHTML = cart.map(x => {
      const imgs = x.imagenes ? x.imagenes.split(',').map(i => i.trim()) : [];
      const firstImg = imgs[0] || 'https://via.placeholder.com/150?text=HUMA';
      return `
        <div class="flex gap-4 border-b border-mist/50 pb-4">
          <img src="${firstImg}" class="w-16 h-20 object-cover bg-mist shrink-0" />
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h4 class="font-display text-base font-light text-charcoal truncate">${x.nombre}</h4>
              <p class="font-body text-xs text-charcoal/50 mt-0.5">$${x.precio.toLocaleString('es-AR')}</p>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center border border-mist rounded-sm">
                <button onclick="window.updateQty('${x.id}', -1)" class="px-2 py-0.5 text-charcoal/40 hover:text-charcoal transition-colors text-sm">-</button>
                <span class="px-2 text-xs font-body text-charcoal min-w-[20px] text-center">${x.qty}</span>
                <button onclick="window.updateQty('${x.id}', 1)" class="px-2 py-0.5 text-charcoal/40 hover:text-charcoal transition-colors text-sm">+</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  const total = cart.reduce((acc, x) => acc + (x.precio * x.qty), 0);
  if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-AR')}`;
}

function openCart() {
  document.getElementById('cartSidebar')?.classList.remove('translate-x-full');
  document.getElementById('cartOverlay')?.classList.remove('pointer-events-none', 'opacity-0');
}

function closeCart() {
  document.getElementById('cartSidebar')?.classList.add('translate-x-full');
  document.getElementById('cartOverlay')?.classList.add('pointer-events-none', 'opacity-0');
}

function checkoutWhatsApp() {
  if (cart.length === 0) return;
  let text = `*HUMA - NUEVO PEDIDO*\n\n`;
  cart.forEach(x => {
    text += `• ${x.nombre} (x${x.qty}) — $${(x.precio * x.qty).toLocaleString('es-AR')}\n`;
  });
  const total = cart.reduce((acc, x) => acc + (x.precio * x.qty), 0);
  text += `\n*TOTAL:* $${total.toLocaleString('es-AR')}`;
  
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
}

function initCartEvents() {
  document.getElementById('openCartBtn')?.addEventListener('click', openCart);
  document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('whatsappCheckoutBtn')?.addEventListener('click', checkoutWhatsApp);
}

function initModalEvents() {
  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('productModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeModal();
  });
  document.getElementById('addToCartBtn')?.addEventListener('click', () => {
    if (currentModalProduct) {
      addToCart(currentModalProduct);
      closeModal();
      openCart();
    }
  });
}

// ─── Panel de Administración ────────────────────────────

async function loadAdminProducts() {
  const tbody = document.getElementById('adminTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = parseCSV(await res.text());

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-10 text-center font-body text-sm text-charcoal/30">No hay productos cargados en la planilla.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(p => {
      const isOculto = p.estado?.toLowerCase().trim() === 'oculto';
      const badgeColor = isOculto ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700 border border-green-200/50';
      const badgeText = isOculto ? 'Oculto' : 'Visible';
      
      const toggleActionBtn = isOculto 
        ? `<button onclick="window.toggleProductVisibility('${p.id}', 'mostrar')" class="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded transition-colors">👁️ Mostrar</button>`
        : `<button onclick="window.toggleProductVisibility('${p.id}', 'ocultar')" class="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-2 py-1 rounded transition-colors">👁️‍🗨️ Ocultar</button>`;

      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
          <td class="px-4 py-3 text-sm font-mono text-gray-500">${p.id}</td>
          <td class="px-4 py-3 text-sm font-medium">${p.nombre}</td>
          <td class="px-4 py-3 text-sm font-medium">$${parseFloat(p.precio || 0).toLocaleString('es-AR')}</td>
          <td class="px-4 py-3 text-sm">
            <span class="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeColor}">${badgeText}</span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-400 max-w-[180px] truncate">${p.descripcion || '—'}</td>
          <td class="px-4 py-3 text-sm text-gray-400 max-w-[120px] truncate">${p.imagenes || '—'}</td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              ${toggleActionBtn}
              <button onclick="window.fillAdminForm(${JSON.stringify(p).replace(/"/g, '&quot;')})" class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">Editar</button>
              <button onclick="window.deleteProduct('${p.id}')" class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-red-600">Error: ${err.message}</td></tr>`;
  }
}

async function sendToGoogleScript(payload) {
  const urlParams = new URLSearchParams(payload).toString();
  try {
    await fetch(`${GOOGLE_SCRIPT_URL}?${urlParams}`, { method: 'POST', mode: 'no-cors' });
  } catch (e) {
    console.error("Error en sincronización:", e);
  }
}

window.toggleProductVisibility = async function(id, accion) {
  const msg = document.getElementById('adminMsg');
  if (msg) { msg.textContent = 'Actualizando visibilidad…'; msg.className = 'text-charcoal/60 text-sm animate-pulse'; }
  if (typeof window.bumpVersion === 'function') window.bumpVersion();

  try {
    const res = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
    const rows = parseCSV(await res.text());
    const p = rows.find(x => x.id === id);
    if (!p) return;

    await sendToGoogleScript({
      action: 'save',
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      descripcion: p.descripcion || '',
      imagenes: p.imagenes || '',
      estado: accion === 'ocultar' ? 'oculto' : ''
    });

    if (msg) { msg.textContent = '✓ Visibilidad modificada.'; msg.className = 'text-green-600 text-sm font-medium'; }
    setTimeout(loadAdminProducts, 2000);
  } catch (err) {
    if (msg) { msg.textContent = 'Error: ' + err.message; msg.className = 'text-red-600 text-sm'; }
  }
};

window.deleteProduct = async function(id) {
  if (!confirm('¿Eliminar producto permanentemente?')) return;
  const msg = document.getElementById('adminMsg');
  if (msg) { msg.textContent = 'Eliminando…'; msg.className = 'text-amber-600 text-sm'; }
  if (typeof window.bumpVersion === 'function') window.bumpVersion();

  try {
    await sendToGoogleScript({ action: 'delete', id: id });
    if (msg) { msg.textContent = '✓ Producto eliminado.'; msg.className = 'text-green-600 text-sm'; }
    setTimeout(loadAdminProducts, 2000);
  } catch (err) {
    if (msg) { msg.textContent = 'Error: ' + err.message; msg.className = 'text-red-600 text-sm'; }
  }
};

window.fillAdminForm = function(p) {
  ['id', 'nombre', 'precio', 'descripcion', 'imagenes', 'estado'].forEach(k => {
    const el = document.getElementById('field_' + k); if (el) el.value = p[k] || '';
  });
  document.getElementById('formTitle').textContent = 'Editar producto';
  document.getElementById('submitBtn').textContent = 'Actualizar producto';
  
  const visibleId = document.getElementById('field_id_visible');
  if (visibleId) visibleId.value = p.id;
};

window.clearAdminForm = function() {
  document.getElementById('adminForm')?.reset();
  const newId = 'p' + Date.now();
  const hiddenId = document.getElementById('field_id');
  const visibleId = document.getElementById('field_id_visible');
  if (hiddenId) hiddenId.value = newId;
  if (visibleId) visibleId.value = newId;
  
  const estadoEl = document.getElementById('field_estado');
  if (estadoEl) estadoEl.value = '';
  
  document.getElementById('formTitle').textContent = 'Nuevo producto';
  document.getElementById('submitBtn').textContent = 'Guardar producto';
  const msg = document.getElementById('adminMsg');
  if (msg) msg.textContent = '';
};

async function submitAdminForm(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('adminMsg');

  if (btn) btn.disabled = true;
  if (msg) { msg.textContent = 'Sincronizando con Google Sheets…'; msg.className = 'text-charcoal/60 text-sm animate-pulse'; }
  if (typeof window.bumpVersion === 'function') window.bumpVersion();

  const payload = { action: 'save' };
  ['id', 'nombre', 'precio', 'descripcion', 'imagenes', 'estado'].forEach(k => {
    const el = document.getElementById('field_' + k);
    const val = el ? el.value.trim() : '';
    payload[k] = k === 'imagenes' ? val.replace(/\\/g, '/') : val;
  });

  try {
    await sendToGoogleScript(payload);
    if (msg) { msg.textContent = '✓ Guardado exitosamente.'; msg.className = 'text-green-600 text-sm font-medium'; }
    window.clearAdminForm();
    setTimeout(loadAdminProducts, 2000);
  } catch (err) {
    if (msg) { msg.textContent = 'Error: ' + err.message; msg.className = 'text-red-600 text-sm'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar producto'; }
  }
}

function initAdminEvents() {
  document.getElementById('adminForm')    ?.addEventListener('submit', submitAdminForm);
  document.getElementById('clearFormBtn') ?.addEventListener('click', window.clearAdminForm);
  document.getElementById('refreshBtn')   ?.addEventListener('click', loadAdminProducts);
}

// ─── Inicialización (Bootstrap) ─────────────────────────

async function initCatalog() {
  const loader = document.getElementById('loader');
  const errEl  = document.getElementById('catalogError');

  initCartEvents();
  initModalEvents();
  updateCartUI();

  try {
    const res = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = parseCSV(await res.text());
    loader?.classList.add('hidden');

    // Catálogo público: Solo renderiza lo que NO esté marcado como 'oculto'
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
  if (typeof window.clearAdminForm === 'function') window.clearAdminForm();
  await loadAdminProducts();
}

document.addEventListener('DOMContentLoaded', () => {
  if (IS_ADMIN) {
    initAdmin();
  } else {
    initCatalog();
  }
});
