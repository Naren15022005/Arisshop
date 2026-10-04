<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HeroSection from '../components/HeroSection.vue'
import ProductCard from '../components/ProductCard.vue'
import { useProductStore } from '../stores/products'

const router = useRouter()
const productStore = useProductStore()

onMounted(() => {
  productStore.fetchProducts()
})

const categories = [
  {
    name: 'Gaming Setup',
    icon: 'fa-solid fa-gamepad',
    desc: 'Teclados mecánicos, mouses 16K DPI & monitores 165Hz',
    count: '14 productos'
  },
  {
    name: 'Audio Pro',
    icon: 'fa-solid fa-headphones',
    desc: 'AirPods, audífonos ANC & audio de alta fidelidad',
    count: '8 productos'
  },
  {
    name: 'Accesorios Celulares',
    icon: 'fa-solid fa-mobile-screen-button',
    desc: 'Cables MagSafe, powerbanks & carcasas premium',
    count: '19 productos'
  },
  {
    name: 'Accesorios Streaming',
    icon: 'fa-solid fa-video',
    desc: 'Micrófonos USB, luces clave & capturadoras 4K',
    count: '6 productos'
  }
]

function selectCat(catName) {
  productStore.selectedCategory = catName
  router.push('/catalogo')
}
</script>

<template>
  <div class="home-view">
    <!-- Hero Section elevated with both components -->
    <HeroSection />

    <!-- Categorías Destacadas -->
    <section class="section categories-section container">
      <div class="section-header">
        <div>
          <span class="section-tag">Colecciones de Alto Rendimiento</span>
          <h2 class="section-title">EXPLORA POR CATEGORÍA</h2>
        </div>
        <router-link to="/catalogo" class="btn-secondary view-all-btn">
          <span>Ver Todo</span>
          <i class="fa-solid fa-arrow-right"></i>
        </router-link>
      </div>

      <div class="categories-grid">
        <div
          v-for="cat in categories"
          :key="cat.name"
          class="cat-card glass-panel"
          @click="selectCat(cat.name)"
        >
          <div class="cat-icon-box">
            <i :class="cat.icon"></i>
          </div>
          <h3 class="cat-name">{{ cat.name }}</h3>
          <p class="cat-desc">{{ cat.desc }}</p>
          <span class="cat-count">{{ cat.count }}</span>
        </div>
      </div>
    </section>

    <!-- Catálogo Destacado -->
    <section class="section featured-section container">
      <div class="section-header">
        <div>
          <span class="section-tag">Selección Curada</span>
          <h2 class="section-title">PRODUCTOS DESTACADOS</h2>
        </div>
        <!-- Filter pills -->
        <div class="filter-pills">
          <button
            v-for="cat in productStore.categories"
            :key="cat"
            :class="['filter-btn', { active: productStore.selectedCategory === cat }]"
            @click="productStore.selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div v-if="productStore.loading" class="loading-state">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>Cargando productos de última generación...</span>
      </div>

      <div v-else-if="productStore.filteredProducts.length > 0" class="products-grid">
        <ProductCard
          v-for="product in productStore.filteredProducts.slice(0, 8)"
          :key="product.id"
          :product="product"
        />
      </div>

      <div v-else class="empty-products">
        <p>No se encontraron productos disponibles en esta categoría.</p>
      </div>
    </section>

    <!-- Banner de Compromiso y Calidad -->
    <section class="container value-banner-wrapper">
      <div class="value-banner glass-panel">
        <div class="banner-content">
          <span class="banner-tag">EXPERIENCIA ARISSHOP</span>
          <h2>TECNOLOGÍA QUE TRANSFORMA TU WORKSPACE</h2>
          <p>
            Cada componente de nuestra tienda es seleccionado minuciosamente por expertos en hardware
            y acústica. Entregas ultra rápidas, soporte humano y garantía directa en Colombia.
          </p>
          <div class="banner-actions">
            <router-link to="/catalogo" class="btn-primary">
              Comprar Ahora
            </router-link>
            <a href="https://wa.me/573000000000" target="_blank" class="btn-secondary">
              <i class="fa-brands fa-whatsapp"></i> Hablar con un Asesor
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section {
  padding: 80px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 36px;
  flex-wrap: wrap;
  gap: 20px;
}

.section-tag {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
  display: block;
  margin-bottom: 6px;
}

.section-title {
  font-family: var(--font-display);
  font-size: 2.4rem;
  letter-spacing: 0.05em;
  color: var(--white);
}

.view-all-btn {
  padding: 10px 20px;
  font-size: 0.8rem;
}

/* Categorías */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.cat-card {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.cat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
}

.cat-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-size: 1.2rem;
  margin-bottom: 8px;
}

.cat-name {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--white);
}

.cat-desc {
  font-size: 0.85rem;
  color: var(--ash);
  line-height: 1.4;
  flex: 1;
}

.cat-count {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: #71717a;
  text-transform: uppercase;
}

/* Featured Products */
.filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--ash);
  padding: 7px 16px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.filter-btn.active, .filter-btn:hover {
  background: var(--white);
  color: #0f172a;
  font-weight: 600;
  border-color: var(--white);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.loading-state, .empty-products {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 0;
  color: var(--ash);
  font-family: var(--font-mono);
  font-size: 0.95rem;
}
.loading-state i {
  font-size: 2rem;
  color: var(--accent);
}

/* Value Banner */
.value-banner-wrapper {
  padding: 40px 24px 100px;
}
.value-banner {
  padding: 60px 48px;
  border-radius: 24px;
  background: radial-gradient(ellipse at center right, rgba(56, 189, 248, 0.15), rgba(26, 29, 34, 0.9) 70%);
  border: 1px solid rgba(56, 189, 248, 0.25);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.banner-content {
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.banner-tag {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--accent);
  letter-spacing: 0.15em;
}
.banner-content h2 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: 0.04em;
  color: var(--white);
  line-height: 1.05;
}
.banner-content p {
  color: var(--ash);
  font-size: 0.98rem;
  line-height: 1.6;
}
.banner-actions {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  flex-wrap: wrap;
}
</style>
