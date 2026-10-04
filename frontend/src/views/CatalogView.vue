<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { useProductStore } from '../stores/products'

const route = useRoute()
const productStore = useProductStore()

onMounted(() => {
  productStore.fetchProducts()
  if (route.query.category) {
    productStore.selectedCategory = route.query.category
  }
  if (route.query.q) {
    productStore.searchQuery = route.query.q
  }
})

watch(
  () => route.query,
  (query) => {
    if (query.category) {
      productStore.selectedCategory = query.category
    }
    if (query.q !== undefined) {
      productStore.searchQuery = query.q
    }
  }
)
</script>

<template>
  <div class="catalog-page container">
    <div class="catalog-header">
      <h1 class="catalog-title">CATÁLOGO DE PRODUCTOS</h1>
      <p class="catalog-subtitle">
        Descubre dispositivos de élite diseñados para máxima durabilidad, precisión y rendimiento.
      </p>
    </div>

    <!-- Search & Control Bar -->
    <div class="catalog-controls glass-panel">
      <!-- Search Input -->
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          v-model="productStore.searchQuery"
          type="text"
          placeholder="Buscar por nombre, categoría o especificaciones..."
          class="catalog-search-input"
        />
        <button
          v-if="productStore.searchQuery"
          @click="productStore.searchQuery = ''"
          class="clear-search"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Sort dropdown -->
      <div class="sort-box">
        <label for="catalog-sort"><i class="fa-solid fa-arrow-down-short-wide"></i> Ordenar:</label>
        <select id="catalog-sort" v-model="productStore.sortBy" class="sort-select">
          <option value="featured">Recomendados</option>
          <option value="price-asc">Precio: Menor a Mayor</option>
          <option value="price-desc">Precio: Mayor a Menor</option>
        </select>
      </div>
    </div>

    <!-- Category Pills -->
    <div class="category-tabs">
      <button
        v-for="cat in productStore.categories"
        :key="cat"
        :class="['cat-tab', { active: productStore.selectedCategory === cat }]"
        @click="productStore.selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Products Grid -->
    <div v-if="productStore.loading" class="catalog-loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>Cargando catálogo...</span>
    </div>

    <div
      v-else-if="productStore.filteredProducts.length > 0"
      class="catalog-grid"
    >
      <ProductCard
        v-for="product in productStore.filteredProducts"
        :key="product.id"
        :product="product"
      />
    </div>

    <div v-else class="catalog-empty glass-panel">
      <i class="fa-solid fa-box-open empty-icon"></i>
      <h3>No encontramos resultados</h3>
      <p>Intenta con otros términos de búsqueda o selecciona otra categoría.</p>
      <button
        class="btn-secondary"
        @click="
          productStore.searchQuery = '';
          productStore.selectedCategory = 'Todos';
        "
      >
        Restablecer Filtros
      </button>
    </div>
  </div>
</template>

<style scoped>
.catalog-page {
  padding-top: 110px;
  padding-bottom: 80px;
}

.catalog-header {
  margin-bottom: 32px;
}
.catalog-title {
  font-family: var(--font-display);
  font-size: 3rem;
  letter-spacing: 0.05em;
  color: var(--white);
}
.catalog-subtitle {
  color: var(--ash);
  font-size: 0.95rem;
  max-width: 600px;
}

.catalog-controls {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 260px;
}
.search-box i {
  color: var(--ash);
}
.catalog-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--white);
  font-family: var(--font-main);
  font-size: 0.95rem;
}
.clear-search {
  background: none;
  border: none;
  color: #71717a;
  cursor: pointer;
}

.sort-box {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sort-box label {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--ash);
  display: flex;
  align-items: center;
  gap: 6px;
}
.sort-select {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--white);
  padding: 8px 14px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  outline: none;
  cursor: pointer;
}

.category-tabs {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 32px;
}
.cat-tab {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--ash);
  padding: 8px 18px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cat-tab.active, .cat-tab:hover {
  background: var(--white);
  color: #0f172a;
  font-weight: 600;
  border-color: var(--white);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.catalog-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--ash);
  font-family: var(--font-mono);
}
.catalog-loading i {
  font-size: 2.2rem;
  color: var(--accent);
}

.catalog-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  gap: 14px;
}
.empty-icon {
  font-size: 3rem;
  color: #3f444e;
}
.catalog-empty h3 {
  font-family: var(--font-heading);
  color: var(--white);
}
.catalog-empty p {
  color: var(--ash);
  font-size: 0.9rem;
}
</style>
