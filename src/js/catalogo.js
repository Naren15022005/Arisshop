// Data is centralized in src/js/data.js (window.ALL)

const CATS = ['Todos', 'Smartphones', 'Laptops', 'Audio', 'Wearables', 'Tablets', 'Accesorios', 'Gaming', 'Cámaras', 'Smart Home'];
const PER_PAGE = 12;

// ── STATE ────────────────────────────────────────────────────────
let state = {
  cat: 'Todos',
  search: '',
  priceMin: 0,
  priceMax: 10000000,
  badges: [],
  sort: 'default',
  view: 'grid',
  page: 1,
};

// Cart handled by src/js/cart.js

// ── FILTER ENGINE ────────────────────────────────────────────────
function filtered() {
  return ALL.filter(p => {
    const matchCat  = state.cat === 'Todos' || p.cat === state.cat;
    const matchQ    = p.name.toLowerCase().includes(state.search.toLowerCase()) ||
                      p.cat.toLowerCase().includes(state.search.toLowerCase()) ||
                      (p.specs || '').toLowerCase().includes(state.search.toLowerCase());
    const matchMin  = p.price >= state.priceMin;
    const matchMax  = p.price <= state.priceMax;
    const matchBadge = state.badges.length === 0 || state.badges.includes(p.badge);
    return matchCat && matchQ && matchMin && matchMax && matchBadge;
  }).sort((a,b) => {
    if (state.sort === 'price-asc')  return a.price - b.price;
    if (state.sort === 'price-desc') return b.price - a.price;
    if (state.sort === 'name-asc')   return a.name.localeCompare(b.name);
    if (state.sort === 'newest')     return b.id - a.id;
    return 0;
  });
}

// ── RENDER PRODUCTS ──────────────────────────────────────────────
function render() {
  const data   = filtered();
  const total  = data.length;
  const pages  = Math.ceil(total / PER_PAGE);
  state.page   = Math.min(state.page, pages || 1);
  const slice  = data.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

  document.getElementById('resultCount').textContent = total;
  document.getElementById('breadCat').textContent    = state.cat === 'Todos' ? 'Todos los productos' : state.cat;
  document.getElementById('pageTitle').innerHTML     = state.cat === 'Todos'
    ? 'Todos los <span>Productos</span>'
    : `<span>${state.cat}</span>`;

  const grid  = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');

  if (slice.length === 0) {
    grid.innerHTML = '';
    empty.classList.add('visible');
  } else {
    empty.classList.remove('visible');
    if (state.view === 'list') {
      grid.innerHTML = slice.map(p => cardList(p)).join('');
    } else {
      grid.innerHTML = slice.map(p => cardGrid(p)).join('');
    }
    // Reveal animation
    requestAnimationFrame(() => {
      grid.querySelectorAll('.product-card').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        setTimeout(() => {
          el.style.transition = 'opacity .4s ease, transform .4s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, i * 40);
      });
    });
  }

  renderPagination(pages);
  renderActiveFilters();
}

function badge(p) {
  if (!p.badge) return '';
  const labels = {new:'Nuevo', sale:'Oferta', hot:'Popular'};
  return `<span class="card-badge ${p.badge}">${labels[p.badge]}</span>`;
}

function cardGrid(p) {
  return `
  <div class="product-card">
    <div class="card-img">
      <div class="card-img-bg"></div>
      ${badge(p)}
      <div class="card-img-inner" style="${p.img ? `background-image:url('${p.img}')` : ''}">
        ${p.img ? '' : '<span class="img-placeholder">Imagen</span>'}
      </div>
      <div class="card-overlay">
        <button class="overlay-btn" onclick="addToCart(${p.id})">Agregar al carrito</button>
        <a href="/src/pages/detalle.html?id=${p.id}" class="overlay-btn ghost">Ver detalles</a>
      </div>
    </div>
    <div class="card-body">
      <div class="card-cat">${p.cat}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-specs">${p.specs||''}</div>
      <div class="card-footer">
        <div class="card-price">
          ${p.old ? `<span class="old">${fmt(p.old)}</span>` : ''}
          ${fmt(p.price)}
        </div>
        <div class="card-stock ${Math.random()>.7?'low':''}">
          ${Math.random()>.7 ? '↓ Pocas unidades' : 'En stock'}
        </div>
      </div>
    </div>
  </div>`;
}

function cardList(p) {
  return `
  <div class="product-card">
    <div class="card-img">
      <div class="card-img-bg"></div>
      ${badge(p)}
      <div class="card-img-inner" style="${p.img ? `background-image:url('${p.img}')` : ''}">
        ${p.img ? '' : '<span class="img-placeholder">Imagen</span>'}
      </div>
    </div>
    <div class="card-body">
      <div>
        <div class="card-cat">${p.cat}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-specs">${p.specs||''}</div>
      </div>
      <div class="card-footer">
        <div class="card-price">
          ${p.old ? `<span class="old">${fmt(p.old)}</span>` : ''}
          ${fmt(p.price)}
        </div>
          <div class="card-actions">
          <button class="overlay-btn" onclick="addToCart(${p.id})">+ Carrito</button>
          <a href="/src/pages/detalle.html?id=${p.id}" class="overlay-btn ghost" style="width:auto;padding:8px 16px;font-size:.62rem;">Detalles</a>
        </div>
      </div>
    </div>
  </div>`;
}

// ── PAGINATION ───────────────────────────────────────────────────
function renderPagination(pages) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  let h = `<button class="page-btn" onclick="goPage(${state.page-1})" ${state.page===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - state.page) <= 1) {
      h += `<button class="page-btn ${i===state.page?'active':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - state.page) === 2) {
      h += `<button class="page-btn" style="pointer-events:none">…</button>`;
    }
  }
  h += `<button class="page-btn" onclick="goPage(${state.page+1})" ${state.page===pages?'disabled':''}>›</button>`;
  el.innerHTML = h;
}

function goPage(n) {
  state.page = n;
  render();
  document.querySelector('.content-head').scrollIntoView({behavior:'smooth',block:'start'});
}

// ── CATEGORIES ───────────────────────────────────────────────────
function renderCats() {
  const el = document.getElementById('catList');
  el.innerHTML = CATS.map(c => {
    const count = c === 'Todos' ? ALL.length : ALL.filter(p => p.cat === c).length;
    return `<button class="cat-btn ${state.cat===c?'active':''}" onclick="setCat('${c}')">${c}<span class="cat-btn-count">${count}</span></button>`;
  }).join('');
}

function setCat(c) {
  state.cat  = c;
  state.page = 1;
  renderCats();
  render();
}

// ── ACTIVE FILTER TAGS ───────────────────────────────────────────
function renderActiveFilters() {
  const el = document.getElementById('activeFilters');
  let tags = `<button class="mobile-filter-btn" onclick="openSidebar()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg> Filtros</button>`;

  if (state.cat !== 'Todos') {
    tags += `<span class="active-tag">${state.cat}<button onclick="setCat('Todos')">✕</button></span>`;
  }
  if (state.search) {
    tags += `<span class="active-tag">"${state.search}"<button onclick="clearSearch()">✕</button></span>`;
  }
  if (state.priceMin > 0 || state.priceMax < 10000000) {
    tags += `<span class="active-tag">${fmt(state.priceMin)} – ${fmt(state.priceMax)}<button onclick="resetPrice()">✕</button></span>`;
  }
  state.badges.forEach(b => {
    const labels = {new:'Nuevo', sale:'Oferta', hot:'Popular'};
    tags += `<span class="active-tag">${labels[b]}<button onclick="removeBadge('${b}')">✕</button></span>`;
  });

  const any = state.cat !== 'Todos' || state.search || state.priceMin > 0 || state.priceMax < 10000000 || state.badges.length;
  if (any) tags += `<button class="clear-all-btn" onclick="resetFilters()">Limpiar todo</button>`;

  el.innerHTML = tags;
}

// ── FILTER CONTROLS ──────────────────────────────────────────────
function applyFilters() {
  state.page = 1;
  render();
  closeSidebar();
}

function resetFilters() {
  state = { ...state, cat:'Todos', search:'', priceMin:0, priceMax:10000000, badges:[], sort:'default', page:1 };
  document.getElementById('searchInput').value = '';
  document.getElementById('priceMin').value    = '';
  document.getElementById('priceMax').value    = '';
  document.getElementById('sliderMin').value   = 0;
  document.getElementById('sliderMax').value   = 10000000;
  document.getElementById('sortDesktop').value = 'default';
  document.getElementById('sortMobile').value  = 'default';
  updateSliderUI();
  document.querySelectorAll('.badge-filter').forEach(b => b.classList.remove('active'));
  renderCats();
  render();
}

function clearSearch() {
  state.search = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('searchWrap').classList.remove('has-value');
  state.page = 1;
  render();
}

function resetPrice() {
  state.priceMin = 0; state.priceMax = 10000000;
  document.getElementById('priceMin').value  = '';
  document.getElementById('priceMax').value  = '';
  document.getElementById('sliderMin').value = 0;
  document.getElementById('sliderMax').value = 10000000;
  updateSliderUI();
  render();
}

function removeBadge(b) {
  state.badges = state.badges.filter(x => x !== b);
  document.querySelectorAll(`.badge-filter[data-badge="${b}"]`).forEach(el => el.classList.remove('active'));
  render();
}

// ── SEARCH ──────────────────────────────────────────────────────
const handleSearchInput = window.debounce ? window.debounce(() => {
  state.page = 1;
  render();
}, 120) : (() => { let timer; return value => { clearTimeout(timer); timer = setTimeout(() => { state.page = 1; render(); }, 120); }; })();

document.getElementById('searchInput').addEventListener('input', e => {
  state.search = e.target.value;
  document.getElementById('searchWrap').classList.toggle('has-value', !!e.target.value);
  handleSearchInput();
});

// ── PRICE INPUTS ────────────────────────────────────────────────
document.getElementById('priceMin').addEventListener('change', e => {
  state.priceMin = Number(e.target.value) || 0;
  document.getElementById('sliderMin').value = state.priceMin;
  updateSliderUI(); render();
});
document.getElementById('priceMax').addEventListener('change', e => {
  state.priceMax = Number(e.target.value) || 10000000;
  document.getElementById('sliderMax').value = state.priceMax;
  updateSliderUI(); render();
});

// ── RANGE SLIDERS ────────────────────────────────────────────────
function updateSliderUI() {
  const mn = parseInt(document.getElementById('sliderMin').value);
  const mx = parseInt(document.getElementById('sliderMax').value);
  const pMin = mn / 10000000 * 100;
  const pMax = mx / 10000000 * 100;
  document.getElementById('thumbMin').style.left = pMin + '%';
  document.getElementById('thumbMax').style.left = pMax + '%';
  document.getElementById('rangeFill').style.left  = pMin + '%';
  document.getElementById('rangeFill').style.width = (pMax - pMin) + '%';
}

document.getElementById('sliderMin').addEventListener('input', e => {
  let v = parseInt(e.target.value);
  const mx = parseInt(document.getElementById('sliderMax').value);
  if (v > mx - 50000) { v = mx - 50000; e.target.value = v; }
  state.priceMin = v;
  document.getElementById('priceMin').value = fmt(v).replace('$','');
  updateSliderUI(); render();
});
document.getElementById('sliderMax').addEventListener('input', e => {
  let v = parseInt(e.target.value);
  const mn = parseInt(document.getElementById('sliderMin').value);
  if (v < mn + 50000) { v = mn + 50000; e.target.value = v; }
  state.priceMax = v;
  document.getElementById('priceMax').value = fmt(v).replace('$','');
  updateSliderUI(); render();
});

// ── BADGE FILTERS ────────────────────────────────────────────────
document.querySelectorAll('.badge-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    const b = btn.dataset.badge;
    if (state.badges.includes(b)) {
      state.badges = state.badges.filter(x => x !== b);
      btn.classList.remove('active');
    } else {
      state.badges.push(b);
      btn.classList.add('active');
    }
    state.page = 1; render();
  });
});

// ── SORT ────────────────────────────────────────────────────────
document.getElementById('sortDesktop').addEventListener('change', e => {
  state.sort = e.target.value;
  document.getElementById('sortMobile').value = e.target.value;
  state.page = 1; render();
});
document.getElementById('sortMobile').addEventListener('change', e => {
  state.sort = e.target.value;
  document.getElementById('sortDesktop').value = e.target.value;
  state.page = 1; render();
});

// ── VIEW ─────────────────────────────────────────────────────────
function setView(v) {
  state.view = v;
  document.getElementById('productsGrid').className = 'products-grid' + (v === 'list' ? ' list-view' : '');
  document.getElementById('btnGrid').classList.toggle('active', v === 'grid');
  document.getElementById('btnList').classList.toggle('active', v === 'list');
  render();
}

// Cart behaviour moved to src/js/cart.js (global handlers: addToCart, changeQty, updateCartUI, openCart, closeCart)

// ── MOBILE SIDEBAR ───────────────────────────────────────────────
function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }

// ── INIT ────────────────────────────────────────────────────────
renderCats();
render();
updateSliderUI();