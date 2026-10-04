<script setup>
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'

const router = useRouter()
const cartStore = useCartStore()

function handleCheckout() {
  cartStore.isOpen = false
  router.push('/checkout')
}
</script>

<template>
  <div v-if="cartStore.isOpen" class="cart-backdrop" @click="cartStore.isOpen = false">
    <div class="cart-drawer glass-panel" @click.stop>
      <!-- Header -->
      <div class="drawer-header">
        <div class="header-title">
          <i class="fa-solid fa-bag-shopping"></i>
          <h3>Tu Carrito</h3>
          <span class="count-badge">{{ cartStore.totalCount }}</span>
        </div>
        <button class="close-btn" @click="cartStore.isOpen = false" aria-label="Cerrar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Items List -->
      <div v-if="cartStore.items.length > 0" class="drawer-body">
        <div v-for="item in cartStore.items" :key="item.id" class="cart-item">
          <img :src="item.image" :alt="item.name" class="item-img" />
          <div class="item-info">
            <h4 class="item-title">{{ item.name }}</h4>
            <span class="item-price">${{ Number(item.price).toLocaleString('es-CO') }}</span>
            <div class="qty-control">
              <button @click="cartStore.updateQty(item.id, item.qty - 1)">-</button>
              <span>{{ item.qty }}</span>
              <button @click="cartStore.updateQty(item.id, item.qty + 1)">+</button>
            </div>
          </div>
          <button class="remove-btn" @click="cartStore.removeItem(item.id)" title="Quitar">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <i class="fa-solid fa-cart-shopping empty-icon"></i>
        <p>Tu carrito está vacío</p>
        <router-link to="/catalogo" class="btn-secondary" @click="cartStore.isOpen = false">
          Explorar Catálogo
        </router-link>
      </div>

      <!-- Footer -->
      <div v-if="cartStore.items.length > 0" class="drawer-footer">
        <div class="summary-row">
          <span>Subtotal:</span>
          <strong>${{ cartStore.totalAmount.toLocaleString('es-CO') }}</strong>
        </div>
        <div class="summary-row shipping-row">
          <span>Envío nacional:</span>
          <span class="free-text">¡Gratis!</span>
        </div>
        <div class="summary-total">
          <span>Total:</span>
          <strong>${{ cartStore.totalAmount.toLocaleString('es-CO') }}</strong>
        </div>

        <button class="btn-primary checkout-btn" @click="handleCheckout" id="btn-cart-checkout">
          <span>Proceder al Pago</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.25s ease;
}

.cart-drawer {
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: #14171b;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.drawer-header {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-title h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--white);
}
.count-badge {
  background: var(--accent);
  color: #0f172a;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}
.close-btn {
  background: none;
  border: none;
  color: var(--ash);
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.2s;
}
.close-btn:hover {
  color: var(--white);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px;
  border-radius: 12px;
}
.item-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 4px;
}
.item-info {
  flex: 1;
}
.item-title {
  font-family: var(--font-heading);
  font-size: 0.9rem;
  color: var(--white);
  line-height: 1.2;
  margin-bottom: 4px;
}
.item-price {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--accent);
  display: block;
  margin-bottom: 6px;
}

.qty-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 2px 8px;
}
.qty-control button {
  background: none;
  border: none;
  color: var(--white);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0 4px;
}
.qty-control span {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--white);
}

.remove-btn {
  background: none;
  border: none;
  color: #71717a;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
}
.remove-btn:hover {
  color: var(--rose);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--ash);
  padding: 40px;
}
.empty-icon {
  font-size: 3rem;
  color: #3f444e;
}

.drawer-footer {
  padding: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #111317;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.summary-row, .summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: var(--ash);
}
.free-text {
  color: #10b981;
  font-weight: 600;
  font-family: var(--font-mono);
}
.summary-total {
  font-size: 1.15rem;
  color: var(--white);
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.summary-total strong {
  font-family: var(--font-heading);
  color: var(--accent);
}

.checkout-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
