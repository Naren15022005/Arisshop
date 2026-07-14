// Product data is centralized in src/js/data.js (window.ALL)

// ── STATE ────────────────────────────────────────────────────────
let detailProduct = null;
let qty = 1;

// ── OBTENER ID DE URL ───────────────────────────────────────────
function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get('id')) || 1;
}

// ── CARGAR DETALLE ──────────────────────────────────────────────
function loadDetail() {
  const id = getProductId();
  detailProduct = ALL.find(p => p.id === id);
  if (!detailProduct) {
    document.getElementById('breadName').textContent = 'Producto no encontrado';
    document.getElementById('detalleNombre').textContent = 'Producto no disponible';
    return;
  }

  // Breadcrumb
  document.getElementById('breadName').textContent = detailProduct.name;

  // Imagen y badge
  const detalleImg = document.getElementById('detalleImage');
  if (detailProduct.img) {
    detalleImg.textContent = '';
    detalleImg.style.backgroundImage = `url('${detailProduct.img}')`;
    detalleImg.classList.add('detalle-img-has-image');
  } else {
    detalleImg.innerHTML = '<span class="img-placeholder">Imagen</span>';
    detalleImg.style.backgroundImage = '';
    detalleImg.classList.remove('detalle-img-has-image');
  }
  const badgeEl = document.getElementById('detalleBadge');
  if (detailProduct.badge) {
    const labels = {new:'Nuevo', sale:'Oferta', hot:'Popular'};
    badgeEl.textContent = labels[detailProduct.badge] || detailProduct.badge;
    badgeEl.style.display = 'inline-block';
  } else {
    badgeEl.style.display = 'none';
  }

  // Info
  document.getElementById('detalleCategoria').textContent = detailProduct.cat;
  document.getElementById('detalleNombre').textContent = detailProduct.name;
  const priceHtml = detailProduct.old
    ? `<span class="old">${fmt(detailProduct.old)}</span> ${fmt(detailProduct.price)}`
    : fmt(detailProduct.price);
  document.getElementById('detallePrecio').innerHTML = priceHtml;

  // Stock
  const stockEl = document.getElementById('detalleStock');
  const stockText = Math.random() > 0.7 ? '↓ Pocas unidades' : 'En stock';
  stockEl.textContent = stockText;
  stockEl.className = 'detalle-stock' + (stockText.includes('Pocas') ? ' low' : '');

  // Specs y desc
  document.getElementById('detalleSpecs').textContent = detailProduct.specs || '';
  document.getElementById('detalleDesc').textContent = detailProduct.desc || 'Descripción no disponible.';

  // Cargar relacionados
  loadRelated(detailProduct.cat, detailProduct.id);
}

// ── PRODUCTOS RELACIONADOS ──────────────────────────────────────
function loadRelated(cat, excludeId) {
  const related = ALL.filter(p => p.cat === cat && p.id !== excludeId).slice(0, 6);
  const grid = document.getElementById('relacionadosGrid');
  if (related.length === 0) {
    grid.innerHTML = '<p style="color:var(--ash);font-size:.9rem;">No hay productos relacionados.</p>';
    return;
  }
  grid.innerHTML = related.map(p => `
    <a href="/src/pages/detalle.html?id=${p.id}" class="rel-card">
      <span class="emoji" style="${p.img ? `background-image:url('${p.img}')` : ''}">${p.img ? '' : '<span class="img-placeholder">Imagen</span>'}</span>
      <span class="name">${p.name}</span>
      <span class="price">${fmt(p.price)}</span>
    </a>
  `).join('');
}

// ── CANTIDAD ─────────────────────────────────────────────────────
function changeQtySelector(delta) {
  qty = Math.max(1, qty + delta);
  document.getElementById('qtySelector').textContent = qty;
}

function addDetailToCart() {
  if (!detailProduct) return;
  // Use central cart manager
  if (typeof addToCart === 'function') addToCart(detailProduct.id, qty);
}

// Cart is handled by src/js/cart.js (global functions: addToCart, changeQty, updateCartUI, openCart, closeCart)

// ── INIT ────────────────────────────────────────────────────────
loadDetail();
updateCartUI();