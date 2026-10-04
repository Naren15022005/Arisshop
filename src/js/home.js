// Home page uses central data in src/js/data.js (window.ALL)
const HERO_PRODUCTS = [
  {
    id: 1,
    name: 'ChatGPT Plus (1 Mes)',
    tag: 'IA GENERATIVA // OPENAI GPT-4o',
    specs: 'Cuenta Privada · GPT-4o Ilimitado · DALL-E 3 · Modo Voz',
    price: '$90.000',
    keyPreview: 'OPENAI-GPT4-****-982X',
    stockText: 'Entrega en 60s',
    glowColor: 'rgba(34, 197, 94, 0.25)',
    accentColor: '#22c55e',
    img: 'src/img/card-chatgpt.jpg'
  },
  {
    id: 2,
    name: 'Midjourney Pro',
    tag: 'ARTE DIGITAL // STEALTH MODE v6',
    specs: 'Generación Ilimitada · Fast GPU · Modo Privado · Max Upscale',
    price: '$240.000',
    keyPreview: 'MJ-PRO-****-7741',
    stockText: 'Entrega en 60s',
    glowColor: 'rgba(168, 85, 247, 0.28)',
    accentColor: '#a855f7',
    img: 'src/img/card-midjourney.jpg'
  },
  {
    id: 4,
    name: 'Xbox Game Pass Ult.',
    tag: 'GAMING // CLOUD & PC 25 DÍGITOS',
    specs: 'Código Global · EA Play · Cloud Gaming · 100+ Juegos',
    price: '$45.000',
    keyPreview: 'XBOX-GPULT-****-441K',
    stockText: 'Entrega en 60s',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    accentColor: '#10b981',
    img: 'src/img/card-gamepass.jpg'
  }
];

function switchHeroProduct(index) {
  const p = HERO_PRODUCTS[index];
  if (!p) return;
  const imgEl = document.getElementById('heroProductImg');
  const titleEl = document.getElementById('heroProductTitle');
  const specsEl = document.getElementById('heroProductSpecs');
  const priceEl = document.getElementById('heroProductPrice');
  const keyEl = document.getElementById('heroProductKey');
  const buyBtn = document.getElementById('heroBuyBtn');
  const detailLink = document.getElementById('heroDetailLink');
  const tagEl = document.querySelector('.showcase-info .showcase-tag');
  const showcaseCard = document.getElementById('heroShowcaseCard');
  const dynamicGlow = document.getElementById('heroDynamicGlow');
  const cardGlowHalo = document.getElementById('cardGlowHalo');

  if (imgEl) {
    imgEl.style.opacity = '0';
    imgEl.style.transform = 'scale(0.94) translateY(6px)';
    setTimeout(() => {
      imgEl.src = p.img;
      imgEl.style.opacity = '1';
      imgEl.style.transform = 'scale(1) translateY(0)';
    }, 180);
  }
  if (titleEl) titleEl.textContent = p.name;
  if (tagEl) tagEl.textContent = p.tag;
  if (specsEl) specsEl.textContent = p.specs;
  if (keyEl && p.keyPreview) keyEl.textContent = p.keyPreview;
  if (priceEl) {
    priceEl.innerHTML = `${p.price} <span class="price-currency">COP</span>`;
  }
  if (buyBtn) buyBtn.setAttribute('onclick', `addToCart(${p.id})`);
  if (detailLink) detailLink.href = `/src/pages/detalle.html?id=${p.id}`;

  if (p.accentColor) {
    if (showcaseCard) showcaseCard.style.setProperty('--card-accent', p.accentColor);
    if (cardGlowHalo) cardGlowHalo.style.background = `radial-gradient(circle, ${p.glowColor || p.accentColor} 0%, transparent 70%)`;
    if (dynamicGlow) dynamicGlow.style.background = `radial-gradient(circle, ${p.glowColor} 0%, rgba(56, 189, 248, 0.05) 45%, transparent 70%)`;
  }

  const buttons = document.querySelectorAll('.switcher-btn');
  buttons.forEach((btn, i) => {
    const isActive = i === index;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function executeHeroSearch() {
  const input = document.getElementById('heroSearchInput');
  if (input && input.value.trim()) {
    window.location.href = `/src/pages/catalogo.html?q=${encodeURIComponent(input.value.trim())}`;
  }
}

const featuredIds = [1, 2, 4, 5, 8, 9, 10, 11];
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
  const escape = window.escapeHTML || (s => s);
  const safeUrl = window.sanitizeURL || (u => u);

  grid.innerHTML = categories.map((cat, index) => `
    <div class="cat-card reveal" style="transition-delay:${0.05 * (index + 1)}s; background-image:url('${safeUrl(cat.image || '')}')" onclick="window.location.href='/src/pages/catalogo.html?cat=${encodeURIComponent(cat.label)}'">
      <div class="cat-icon" aria-hidden="true"></div>
      <div class="cat-name">${escape(cat.label)}</div>
      <div class="cat-count">${counts[cat.label] || 0} productos</div>
      <div class="cat-arrow">↗</div>
    </div>
  `).join('');
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
  const escape = window.escapeHTML || (s => s);
  const safeUrl = window.sanitizeURL || (u => u);

  grid.innerHTML = featuredProducts.map(p => `
    <div class="product-card reveal">
      <div class="card-img">
        <div class="card-img-bg"></div>
        ${p.badge ? `<span class="card-badge ${escape(p.badge)}">${p.badge === 'new' ? 'Nuevo' : p.badge === 'hot' ? 'Popular' : 'Oferta'}</span>` : ''}
        <div class="card-img-inner" style="${p.img ? `background-image:url('${safeUrl(p.img)}')` : ''}">
          ${p.img ? '' : '<span class="img-placeholder">Imagen</span>'}
        </div>
        <div class="card-overlay">
          <button class="overlay-btn" onclick="addToCart(${escape(p.id)})">Agregar al carrito</button>
          <a href="/src/pages/detalle.html?id=${encodeURIComponent(p.id)}" class="overlay-btn ghost">Ver detalles</a>
        </div>
      </div>
      <div class="card-body">
        <div class="card-cat">${escape(p.cat)}</div>
        <div class="card-name">${escape(p.name)}</div>
        <div class="card-specs">${escape(p.specs || '')}</div>
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
  const exclusiveIds = [1, 8, 12];
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
