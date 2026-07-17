// Home page uses central data in src/js/data.js (window.ALL)
const featuredIds = [1, 9, 5, 13, 3, 10, 17, 20];
const featuredProducts = (window.ALL || [])
  .filter(p => featuredIds.includes(p.id))
  .sort((a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  const categories = window.CATEGORIES || [];
  const counts = categories.reduce((acc, cat) => {
    acc[cat.label] = ALL.filter(p => p.cat === cat.label).length;
    return acc;
  }, {});
  grid.innerHTML = categories.map((cat, index) => `
    <div class="cat-card reveal" style="transition-delay:${0.05 * (index + 1)}s; background-image:url('${cat.image || ''}')" onclick="window.location.href='/src/pages/catalogo.html?cat=${encodeURIComponent(cat.label)}'">
      <div class="cat-icon" aria-hidden="true"></div>
      <div class="cat-name">${cat.label}</div>
      <div class="cat-count">${counts[cat.label] || 0} productos</div>
      <div class="cat-arrow">↗</div>
    </div>
  `).join('');
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
  grid.innerHTML = featuredProducts.map(p => `
    <div class="product-card reveal">
      <div class="card-img">
        <div class="card-img-bg"></div>
        ${p.badge ? `<span class="card-badge ${p.badge}">${p.badge === 'new' ? 'Nuevo' : p.badge === 'hot' ? 'Popular' : 'Oferta'}</span>` : ''}
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
        <div class="card-specs">${p.specs || ''}</div>
        <div class="card-footer">
          <div class="card-price">
            ${p.old ? `<span class="old">${format(p.old)}</span>` : ''}
            ${format(p.price)}
          </div>
          <div class="card-stock">En stock</div>
        </div>
      </div>
    </div>
  `).join('');
  observeReveal();
}

function subscribeEmail() {
  const el = document.getElementById('emailInput');
  if (!el.value || !el.value.includes('@')) {
    el.style.borderColor = '#888';
    return;
  }
  el.value = '';
  el.placeholder = '¡Gracias! Te mantendremos al tanto.';
}

function observeReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

function renderExclusives() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  const exclusiveIds = [33, 34, 11];
  const exclusiveProducts = (window.ALL || [])
    .filter(p => exclusiveIds.includes(p.id))
    .sort((a, b) => exclusiveIds.indexOf(a.id) - exclusiveIds.indexOf(b.id));
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
  grid.innerHTML = exclusiveProducts.map(p => `
    <div class="product-card reveal">
      <div class="card-img">
        <div class="card-img-bg"></div>
        ${p.badge ? `<span class="card-badge ${p.badge}">${p.badge === 'new' ? 'Nuevo' : p.badge === 'hot' ? 'Popular' : 'Oferta'}</span>` : ''}
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
        <div class="card-specs">${p.specs || ''}</div>
        <div class="card-footer">
          <div class="card-price">
            ${p.old ? `<span class="old">${format(p.old)}</span>` : ''}
            ${format(p.price)}
          </div>
          <div class="card-stock">En stock</div>
        </div>
      </div>
    </div>
  `).join('');
  observeReveal();
}

function setupNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  nav.style.padding = window.scrollY > 40 ? '12px 48px' : '20px 48px';
}

function setupCarousel(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid || window.innerWidth > 640) return;
  let interval;
  const scroll = () => {
    const cards = grid.querySelectorAll('.product-card');
    if (!cards.length) return;
    const next = Array.from(cards).find(c => c.getBoundingClientRect().left > 16);
    if (next) grid.scrollTo({ left: next.offsetLeft - grid.offsetLeft, behavior:'smooth' });
    else grid.scrollTo({ left:0, behavior:'smooth' });
  };
  const start = () => { stop(); interval = setInterval(scroll, 3500); };
  const stop = () => clearInterval(interval);
  grid.addEventListener('touchstart', stop, { once:true });
  grid.addEventListener('mouseenter', stop);
  grid.addEventListener('mouseleave', start);
  start();
  window.addEventListener('resize', () => { if (window.innerWidth > 640) stop(); });
}

renderCategories();
renderProducts();
renderExclusives();
observeReveal();
setupCarousel('productsGrid');
setupCarousel('featuredGrid');
window.addEventListener('scroll', setupNavScroll);
