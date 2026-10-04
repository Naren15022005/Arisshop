<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'

const router = useRouter()
const cartStore = useCartStore()

const searchQuery = ref('')

// Catálogo interactivo de productos destacados para el Hero Showcase
const heroProducts = [
  {
    id: 'hero-airpods',
    name: 'AirPods Pro Series 4',
    category: 'Audio Pro Hi-Res',
    tagline: 'Cancelación Activa de Ruido 2X & Audio Espacial',
    price: 320000,
    originalPrice: 420000,
    discount: '-24%',
    image: '/img/AirpodsProSeries4.webp',
    rating: '4.9',
    reviews: 142,
    badge: 'Flagship 2026',
    specs: ['Cancelación ANC 2X', 'Batería 32 Horas', 'Carga MagSafe Qi'],
    stock: 12
  },
  {
    id: 'PROD-101',
    name: 'Teclado Mecánico RGB Pro',
    category: 'Gaming Setup',
    tagline: 'Switches Red Ópticos, Anti-Ghosting & Chasis CNC',
    price: 250000,
    originalPrice: 290000,
    discount: '-14%',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    rating: '4.8',
    reviews: 98,
    badge: 'Setup Gamer',
    specs: ['Switches Red', 'RGB Personalizable', 'Cable Trenzado USB-C'],
    stock: 15
  },
  {
    id: 'tMWYoHXohLLfGosKpWOv',
    name: 'Mouse Ergonómico Inalámbrico',
    category: 'Gaming & Work',
    tagline: 'Sensor Óptico 16.000 DPI & Conectividad Dual 2.4G',
    price: 120000,
    originalPrice: 150000,
    discount: '-20%',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
    rating: '4.9',
    reviews: 64,
    badge: 'Ultraligero',
    specs: ['16K DPI Óptico', 'Doble Conexión BT/2.4G', 'Autonomía 70H'],
    stock: 25
  }
]

const activeIndex = ref(0)
const activeProduct = ref(heroProducts[0])

function selectProduct(index) {
  activeIndex.value = index
  activeProduct.value = heroProducts[index]
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/catalogo', query: { q: searchQuery.value.trim() } })
  }
}

function handleHeroAddToCart() {
  cartStore.addItem(activeProduct.value, 1)
}
</script>

<template>
  <section class="hero-section">
    <!-- Ambient Backdrop Glows -->
    <div class="ambient-glow glow-blue"></div>
    <div class="ambient-glow glow-cyan"></div>

    <div class="container hero-grid">
      <!-- ══════════════════════════════════════════
           COMPONENTE 1: Editorial, Search & Action
      ══════════════════════════════════════════ -->
      <div class="hero-left">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          <span>NUEVA COLECCIÓN OFICIAL 2026</span>
        </div>

        <h1 class="hero-title">
          TECNOLOGÍA & <br />
          <span class="gradient-text">AUDIO DE ÉLITE</span>
        </h1>

        <p class="hero-lead">
          Eleva tu día a día con periféricos de alto rendimiento, headsets con cancelación acústica 
          y setups de nivel competitivo respaldados por garantía oficial directa.
        </p>

        <!-- Barra de Búsqueda Interactiva -->
        <form @submit.prevent="handleSearch" class="hero-search-bar">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar AirPods, teclados RGB, mouses, monitores..."
            class="search-input"
            id="hero-search-input"
          />
          <button type="submit" class="search-btn" id="btn-hero-search">
            <span>Explorar</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </form>

        <!-- Chips de Exploración Rápida -->
        <div class="quick-tags">
          <span class="tag-label">Tendencias:</span>
          <router-link to="/catalogo?category=Audio Pro" class="chip">Audio Pro</router-link>
          <router-link to="/catalogo?category=Gaming Setup" class="chip">Gaming Setup</router-link>
          <router-link to="/catalogo?category=Accesorios Celulares" class="chip">Celulares</router-link>
        </div>

        <!-- Fila de Confianza y Calidad -->
        <div class="trust-row">
          <div class="trust-item">
            <i class="fa-solid fa-truck-fast"></i>
            <div>
              <strong>Envíos Nacionales</strong>
              <span>Despachos asegurados</span>
            </div>
          </div>
          <div class="trust-item">
            <i class="fa-solid fa-shield-check"></i>
            <div>
              <strong>100% Garantizado</strong>
              <span>Equipos certificados</span>
            </div>
          </div>
          <div class="trust-item">
            <i class="fa-solid fa-comments-dollar"></i>
            <div>
              <strong>Pagos Seguros</strong>
              <span>Nequi / Bancolombia / Contraentrega</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════
           COMPONENTE 2: Showcase 3D & Product Switcher
      ══════════════════════════════════════════ -->
      <div class="hero-right">
        <!-- Segmented Tab Switcher -->
        <div class="product-switcher">
          <button
            v-for="(prod, idx) in heroProducts"
            :key="prod.id"
            :class="['switch-btn', { active: activeIndex === idx }]"
            @click="selectProduct(idx)"
          >
            <span>{{ prod.name.split(' ')[0] }}</span>
          </button>
        </div>

        <!-- 3D Glass Card Container -->
        <div class="spotlight-card glass-panel">
          <!-- Top Spotlight Header -->
          <div class="spotlight-top">
            <span class="product-badge">{{ activeProduct.badge }}</span>
            <div class="rating-pill">
              <i class="fa-solid fa-star"></i>
              <span>{{ activeProduct.rating }}</span>
              <small>({{ activeProduct.reviews }})</small>
            </div>
          </div>

          <!-- Product Image Stage with smooth hover -->
          <div class="product-stage">
            <div class="stage-backdrop"></div>
            <img
              :src="activeProduct.image"
              :alt="activeProduct.name"
              class="hero-product-img animate-float"
              :key="activeProduct.id"
            />
          </div>

          <!-- Product Info & Specs -->
          <div class="spotlight-details">
            <span class="product-cat">{{ activeProduct.category }}</span>
            <h2 class="product-title">{{ activeProduct.name }}</h2>
            <p class="product-tagline">{{ activeProduct.tagline }}</p>

            <!-- Key Feature Badges -->
            <div class="specs-pills">
              <span v-for="spec in activeProduct.specs" :key="spec" class="spec-pill">
                <i class="fa-solid fa-check"></i> {{ spec }}
              </span>
            </div>

            <!-- Price & Action Dock -->
            <div class="spotlight-dock">
              <div class="price-block">
                <span class="current-price">${{ Number(activeProduct.price).toLocaleString('es-CO') }}</span>
                <span v-if="activeProduct.originalPrice" class="original-price">
                  ${{ Number(activeProduct.originalPrice).toLocaleString('es-CO') }}
                </span>
                <span class="discount-badge">{{ activeProduct.discount }}</span>
              </div>

              <button
                class="btn-primary buy-btn"
                @click="handleHeroAddToCart"
                id="btn-hero-add-to-cart"
              >
                <i class="fa-solid fa-cart-plus"></i>
                <span>Lo Quiero</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  min-height: calc(100vh - 76px);
  margin-top: 76px;
  display: flex;
  align-items: center;
  padding: 60px 0 80px;
  overflow: hidden;
  background: radial-gradient(ellipse 70% 60% at 50% 20%, rgba(26, 32, 44, 0.6), #121417);
}

/* Ambient glows */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  pointer-events: none;
  opacity: 0.18;
  z-index: 1;
}
.glow-blue {
  width: 500px;
  height: 500px;
  background: #0284c7;
  top: -100px;
  right: 10%;
}
.glow-cyan {
  width: 450px;
  height: 450px;
  background: #38bdf8;
  bottom: 0;
  left: 5%;
}

.hero-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 56px;
  align-items: center;
  position: relative;
  z-index: 10;
}

/* ── COMPONENTE 1 (LEFT) ── */
.hero-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: var(--accent);
  padding: 6px 16px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  width: fit-content;
}
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3.2rem, 5.5vw, 5.2rem);
  line-height: 0.95;
  letter-spacing: 0.04em;
  color: var(--white);
}

.gradient-text {
  background: linear-gradient(135deg, #ffffff 30%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-lead {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--ash);
  max-width: 520px;
}

/* Search Bar */
.hero-search-bar {
  display: flex;
  align-items: center;
  background: rgba(26, 29, 34, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 6px 6px 6px 20px;
  max-width: 540px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
}
.hero-search-bar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 8px 35px rgba(56, 189, 248, 0.2);
}
.search-icon {
  color: var(--ash);
  font-size: 1.1rem;
  margin-right: 12px;
}
.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--white);
  font-family: var(--font-main);
  font-size: 0.92rem;
}
.search-input::placeholder {
  color: #71717a;
}
.search-btn {
  background: var(--white);
  color: #0f172a;
  border: none;
  padding: 10px 22px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.search-btn:hover {
  background: var(--accent);
  color: #0f172a;
  transform: translateX(2px);
}

/* Quick Tags */
.quick-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.tag-label {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: #71717a;
}
.chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--platinum);
  padding: 5px 14px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-decoration: none;
  transition: all 0.2s ease;
}
.chip:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  color: var(--accent);
}

/* Trust Row */
.trust-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.trust-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.trust-item i {
  font-size: 1.3rem;
  color: var(--accent);
}
.trust-item strong {
  display: block;
  font-size: 0.82rem;
  color: var(--white);
  font-weight: 600;
}
.trust-item span {
  display: block;
  font-size: 0.72rem;
  color: var(--ash);
}

/* ── COMPONENTE 2 (RIGHT) ── */
.hero-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.product-switcher {
  display: flex;
  background: rgba(26, 29, 34, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px;
  border-radius: 999px;
  gap: 6px;
}
.switch-btn {
  background: none;
  border: none;
  color: var(--ash);
  padding: 8px 20px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.25s ease;
}
.switch-btn.active {
  background: var(--white);
  color: #0f172a;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(255, 255, 255, 0.2);
}

.spotlight-card {
  width: 100%;
  max-width: 480px;
  padding: 28px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.spotlight-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.product-badge {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 4px 12px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
}
.rating-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: #fbbf24;
}
.rating-pill small {
  color: #71717a;
}

/* Stage */
.product-stage {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 10px 0 20px;
}
.stage-backdrop {
  position: absolute;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.2), transparent 70%);
  border-radius: 50%;
}
.hero-product-img {
  max-height: 210px;
  max-width: 90%;
  object-fit: contain;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.6));
  transition: transform 0.3s ease;
}

.spotlight-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.product-cat {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}
.product-title {
  font-family: var(--font-heading);
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--white);
  line-height: 1.2;
}
.product-tagline {
  font-size: 0.85rem;
  color: var(--ash);
  line-height: 1.4;
}

.specs-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}
.spec-pill {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--platinum);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  gap: 5px;
}
.spec-pill i {
  color: #38bdf8;
  font-size: 0.65rem;
}

.spotlight-dock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.price-block {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.current-price {
  font-family: var(--font-heading);
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--white);
}
.original-price {
  font-size: 0.85rem;
  text-decoration: line-through;
  color: #71717a;
}
.discount-badge {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
}

.buy-btn {
  padding: 10px 22px;
  font-size: 0.8rem;
}

@media (max-width: 992px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }
  .hero-left {
    align-items: center;
  }
  .trust-row {
    grid-template-columns: 1fr;
    gap: 12px;
    text-align: left;
  }
  .hero-search-bar {
    width: 100%;
  }
}
</style>
