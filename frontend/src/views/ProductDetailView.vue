<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/products'
import { useCartStore } from '../stores/cart'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const cartStore = useCartStore()

const product = ref(null)
const loading = ref(true)
const selectedImage = ref('')
const quantity = ref(1)

onMounted(async () => {
  const id = route.params.id
  try {
    const data = await productStore.fetchProductById(id)
    product.value = data
    selectedImage.value = data.image
  } catch (e) {
    product.value = null
  } finally {
    loading.value = false
  }
})

function addToCart() {
  if (product.value) {
    cartStore.addItem(product.value, quantity.value)
  }
}
</script>

<template>
  <div class="product-detail-page container">
    <button class="back-btn" @click="router.back()">
      <i class="fa-solid fa-arrow-left"></i> Volver
    </button>

    <div v-if="loading" class="detail-loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>Cargando detalles del producto...</span>
    </div>

    <div v-else-if="product" class="detail-grid">
      <!-- Media Gallery -->
      <div class="detail-media">
        <div class="main-image-card glass-panel">
          <img :src="selectedImage || product.image" :alt="product.name" class="main-img" />
        </div>

        <div v-if="product.additionalImages && product.additionalImages.length > 0" class="gallery-thumbs">
          <div
            class="thumb glass-panel"
            :class="{ active: selectedImage === product.image }"
            @click="selectedImage = product.image"
          >
            <img :src="product.image" alt="Thumbnail" />
          </div>
          <div
            v-for="(img, idx) in product.additionalImages"
            :key="idx"
            class="thumb glass-panel"
            :class="{ active: selectedImage === img }"
            @click="selectedImage = img"
          >
            <img :src="img" alt="Thumbnail" />
          </div>
        </div>
      </div>

      <!-- Info & Buy Column -->
      <div class="detail-info">
        <div class="meta-row">
          <span class="category-pill">{{ product.category }}</span>
          <span v-if="product.badge" class="badge-pill">{{ product.badge }}</span>
        </div>

        <h1 class="product-name">{{ product.name }}</h1>

        <div class="price-section">
          <span class="detail-price">${{ Number(product.price).toLocaleString('es-CO') }}</span>
          <span v-if="product.originalPrice && product.originalPrice > product.price" class="detail-original-price">
            ${{ Number(product.originalPrice).toLocaleString('es-CO') }}
          </span>
          <span class="iva-label">IVA incluido / Factura legal</span>
        </div>

        <div class="stock-indicator">
          <span class="stock-dot"></span>
          <span>{{ product.stock > 0 ? `En Stock (${product.stock} disponibles)` : 'Agotado' }}</span>
        </div>

        <p class="description-text">
          {{ product.description || 'Producto premium garantizado con los más altos estándares de fabricación, durabilidad y acústica de precisión.' }}
        </p>

        <!-- Features list -->
        <div v-if="product.features" class="features-box glass-panel">
          <h4><i class="fa-solid fa-list-check"></i> Especificaciones Clave</h4>
          <p>{{ product.features }}</p>
        </div>

        <!-- Quantity & Add Button -->
        <div class="action-dock">
          <div class="qty-selector">
            <button @click="quantity = Math.max(1, quantity - 1)">-</button>
            <span>{{ quantity }}</span>
            <button @click="quantity = quantity + 1">+</button>
          </div>

          <button
            class="btn-primary add-cart-btn"
            @click="addToCart"
            id="btn-detail-add-to-cart"
          >
            <i class="fa-solid fa-cart-plus"></i>
            <span>Agregar al Carrito</span>
          </button>
        </div>

        <!-- Guarantees -->
        <div class="guarantees-grid">
          <div class="guarantee-item">
            <i class="fa-solid fa-shield-halved"></i>
            <div>
              <strong>Garantía Oficial</strong>
              <span>12 meses contra defectos de fábrica</span>
            </div>
          </div>
          <div class="guarantee-item">
            <i class="fa-solid fa-truck-fast"></i>
            <div>
              <strong>Envío Express</strong>
              <span>Despachos seguros en 24-48 horas</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="not-found glass-panel">
      <h2>Producto no encontrado</h2>
      <p>El producto que buscas ya no está disponible o el enlace es incorrecto.</p>
      <router-link to="/catalogo" class="btn-primary">Explorar Catálogo</router-link>
    </div>
  </div>
</template>

<style scoped>
.product-detail-page {
  padding-top: 100px;
  padding-bottom: 80px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--ash);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 24px;
  transition: color 0.2s;
}
.back-btn:hover {
  color: var(--white);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}

.main-image-card {
  height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border-radius: 20px;
  background: rgba(18, 20, 23, 0.6);
}
.main-img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.6));
}

.gallery-thumbs {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.thumb {
  width: 72px;
  height: 72px;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.thumb.active, .thumb:hover {
  border-color: var(--accent);
}
.thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.meta-row {
  display: flex;
  gap: 8px;
}
.category-pill {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.badge-pill {
  background: rgba(255, 255, 255, 0.08);
  color: var(--white);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
}

.product-name {
  font-family: var(--font-heading);
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--white);
  line-height: 1.15;
}

.price-section {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.detail-price {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 800;
  color: var(--white);
}
.detail-original-price {
  font-size: 1.1rem;
  text-decoration: line-through;
  color: #71717a;
}
.iva-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: #10b981;
}

.stock-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: #34d399;
}
.stock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.description-text {
  color: var(--ash);
  line-height: 1.6;
  font-size: 0.95rem;
}

.features-box {
  padding: 18px;
  border-radius: 12px;
}
.features-box h4 {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  color: var(--white);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.features-box p {
  color: var(--ash);
  font-size: 0.88rem;
  line-height: 1.5;
}

.action-dock {
  display: flex;
  gap: 14px;
  margin-top: 10px;
}

.qty-selector {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0 8px;
}
.qty-selector button {
  background: none;
  border: none;
  color: var(--white);
  font-size: 1.1rem;
  padding: 10px 14px;
  cursor: pointer;
}
.qty-selector span {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--white);
  min-width: 24px;
  text-align: center;
}

.add-cart-btn {
  flex: 1;
  font-size: 0.92rem;
}

.guarantees-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.guarantee-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.guarantee-item i {
  font-size: 1.4rem;
  color: var(--accent);
}
.guarantee-item strong {
  display: block;
  font-size: 0.82rem;
  color: var(--white);
}
.guarantee-item span {
  display: block;
  font-size: 0.72rem;
  color: var(--ash);
}

@media (max-width: 860px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
