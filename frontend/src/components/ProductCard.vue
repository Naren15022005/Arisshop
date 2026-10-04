<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const cartStore = useCartStore()

const discountPercent = computed(() => {
  if (props.product.originalPrice && props.product.originalPrice > props.product.price) {
    const diff = props.product.originalPrice - props.product.price
    return `-${Math.round((diff / props.product.originalPrice) * 100)}%`
  }
  return null
})

function goToDetail() {
  router.push(`/producto/${props.product.id}`)
}

function handleAdd(e) {
  e.stopPropagation()
  cartStore.addItem(props.product, 1)
}
</script>

<template>
  <div class="product-card glass-panel" @click="goToDetail">
    <!-- Top badge -->
    <div class="card-badges">
      <span v-if="product.badge" class="badge-tag">{{ product.badge }}</span>
      <span v-if="discountPercent" class="discount-tag">{{ discountPercent }}</span>
    </div>

    <!-- Image -->
    <div class="card-img-wrapper">
      <img
        :src="product.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'"
        :alt="product.name"
        loading="lazy"
        class="card-img"
      />
    </div>

    <!-- Details -->
    <div class="card-body">
      <span class="card-category">{{ product.category }}</span>
      <h3 class="card-title">{{ product.name }}</h3>

      <div class="card-footer">
        <div class="price-box">
          <span class="price-val">${{ Number(product.price).toLocaleString('es-CO') }}</span>
          <span v-if="product.originalPrice && product.originalPrice > product.price" class="price-orig">
            ${{ Number(product.originalPrice).toLocaleString('es-CO') }}
          </span>
        </div>

        <button
          class="card-add-btn"
          @click="handleAdd"
          title="Agregar al carrito"
          aria-label="Agregar"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-4px);
  border-color: var(--card-hover-border);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
}

.card-badges {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  gap: 6px;
  z-index: 5;
}
.badge-tag {
  background: rgba(26, 29, 34, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--white);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: uppercase;
}
.discount-tag {
  background: rgba(244, 63, 94, 0.2);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.4);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 6px;
}

.card-img-wrapper {
  height: 200px;
  background: rgba(18, 20, 23, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}
.card-img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: transform 0.4s ease;
}
.product-card:hover .card-img {
  transform: scale(1.08);
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-category {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 4px;
}

.card-title {
  font-family: var(--font-heading);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--white);
  line-height: 1.3;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.price-box {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.price-val {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--white);
}
.price-orig {
  font-size: 0.75rem;
  text-decoration: line-through;
  color: #71717a;
}

.card-add-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--white);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.card-add-btn:hover {
  background: var(--white);
  color: #0f172a;
  transform: scale(1.1);
}
</style>
