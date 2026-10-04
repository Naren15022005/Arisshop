<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'

const router = useRouter()
const cartStore = useCartStore()

const formData = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  paymentMethod: 'Nequi / Bancolombia'
})

const loading = ref(false)
const orderSuccess = ref(null)
const errorMessage = ref('')

async function submitOrder() {
  if (cartStore.items.length === 0) {
    errorMessage.value = 'El carrito está vacío'
    return
  }
  if (!formData.value.name || !formData.value.email || !formData.value.address) {
    errorMessage.value = 'Completa tu nombre, correo y dirección de entrega'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const payload = {
      name: formData.value.name,
      email: formData.value.email,
      phone: formData.value.phone,
      address: formData.value.address,
      paymentMethod: formData.value.paymentMethod,
      total: cartStore.totalAmount,
      items: cartStore.items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty
      }))
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error procesando el pedido')

    orderSuccess.value = data.order
    cartStore.clearCart()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="checkout-page container">
    <!-- Success Screen -->
    <div v-if="orderSuccess" class="success-card glass-panel">
      <div class="success-icon">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <h2>¡ORDEN RECIBIDA CON ÉXITO!</h2>
      <p class="order-id-label">Código de Seguimiento:</p>
      <span class="order-id-badge">{{ orderSuccess.orderId }}</span>

      <p class="order-msg">
        Hemos registrado tu orden por <strong>${{ Number(orderSuccess.total).toLocaleString('es-CO') }}</strong>.
        Te enviamos los detalles a <strong>{{ orderSuccess.email }}</strong>.
      </p>

      <div class="success-actions">
        <a
          :href="`https://wa.me/573000000000?text=Hola,%20acabo%20de%20realizar%20el%20pedido%20${orderSuccess.orderId}`"
          target="_blank"
          class="btn-primary"
        >
          <i class="fa-brands fa-whatsapp"></i> Confirmar por WhatsApp
        </a>
        <router-link to="/" class="btn-secondary">
          Volver a la Tienda
        </router-link>
      </div>
    </div>

    <!-- Checkout Form Grid -->
    <div v-else class="checkout-grid">
      <!-- Shipping & Info Form -->
      <div class="checkout-form-col glass-panel">
        <h2 class="form-title">DATOS DE ENTREGA</h2>

        <div v-if="errorMessage" class="error-alert">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="submitOrder" class="checkout-form">
          <div class="form-group">
            <label>Nombre y Apellido *</label>
            <input v-model="formData.name" type="text" placeholder="Ej: Alfonso Navarro" required />
          </div>

          <div class="form-group">
            <label>Correo Electrónico *</label>
            <input v-model="formData.email" type="email" placeholder="tu@correo.com" required />
          </div>

          <div class="form-group">
            <label>Teléfono / WhatsApp *</label>
            <input v-model="formData.phone" type="tel" placeholder="+57 300 123 4567" required />
          </div>

          <div class="form-group">
            <label>Dirección Completa y Ciudad *</label>
            <input v-model="formData.address" type="text" placeholder="Calle 123 # 45 - 67, Medellín" required />
          </div>

          <div class="form-group">
            <label>Método de Pago</label>
            <select v-model="formData.paymentMethod" class="payment-select">
              <option value="Nequi / Bancolombia">Nequi / Bancolombia (Transferencia)</option>
              <option value="Pago Contraentrega">Pago Contraentrega (Pagas al recibir)</option>
              <option value="Daviplata">Daviplata</option>
            </select>
          </div>

          <button
            type="submit"
            class="btn-primary confirm-btn"
            id="btn-confirm-order"
            :disabled="loading || cartStore.items.length === 0"
          >
            <i v-if="loading" class="fa-solid fa-circle-notch fa-spin"></i>
            <span>{{ loading ? 'Generando Orden...' : 'Finalizar Pedido' }}</span>
          </button>
        </form>
      </div>

      <!-- Order Summary Column -->
      <div class="checkout-summary-col glass-panel">
        <h3 class="summary-title">RESUMEN DEL PEDIDO</h3>

        <div v-if="cartStore.items.length > 0" class="summary-items">
          <div v-for="item in cartStore.items" :key="item.id" class="summary-item">
            <img :src="item.image" :alt="item.name" />
            <div class="item-desc">
              <h4>{{ item.name }}</h4>
              <span class="item-qty">Cantidad: {{ item.qty }}</span>
            </div>
            <span class="item-val">${{ (item.price * item.qty).toLocaleString('es-CO') }}</span>
          </div>
        </div>

        <div v-else class="empty-cart-note">
          <p>No tienes productos en el carrito.</p>
          <router-link to="/catalogo" class="btn-secondary">Ver Catálogo</router-link>
        </div>

        <div class="summary-totals">
          <div class="row">
            <span>Subtotal</span>
            <span>${{ cartStore.totalAmount.toLocaleString('es-CO') }}</span>
          </div>
          <div class="row">
            <span>Envío Nacional</span>
            <span class="free">GRATIS</span>
          </div>
          <div class="row total-row">
            <span>Total a Pagar</span>
            <strong>${{ cartStore.totalAmount.toLocaleString('es-CO') }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-page {
  padding-top: 110px;
  padding-bottom: 80px;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 36px;
}

.checkout-form-col, .checkout-summary-col {
  padding: 36px;
}

.form-title, .summary-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 0.05em;
  color: var(--white);
  margin-bottom: 24px;
}

.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--ash);
}
.form-group input, .payment-select {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--white);
  font-family: var(--font-main);
  font-size: 0.92rem;
  outline: none;
  transition: all 0.2s;
}
.form-group input:focus, .payment-select:focus {
  border-color: var(--accent);
}

.confirm-btn {
  margin-top: 14px;
  padding: 14px;
  font-size: 0.92rem;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 14px;
}
.summary-item img {
  width: 50px;
  height: 50px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 4px;
}
.item-desc {
  flex: 1;
}
.item-desc h4 {
  font-family: var(--font-heading);
  font-size: 0.88rem;
  color: var(--white);
}
.item-qty {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ash);
}
.item-val {
  font-family: var(--font-mono);
  font-size: 0.88rem;
  color: var(--accent);
}

.summary-totals {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.summary-totals .row {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: var(--ash);
}
.free {
  color: #10b981;
  font-family: var(--font-mono);
  font-weight: 700;
}
.total-row {
  font-size: 1.15rem !important;
  color: var(--white) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
}
.total-row strong {
  font-family: var(--font-heading);
  color: var(--accent);
}

/* Success Card */
.success-card {
  max-width: 600px;
  margin: 40px auto;
  padding: 48px;
  text-align: center;
}
.success-icon {
  font-size: 3.5rem;
  color: #10b981;
  margin-bottom: 16px;
}
.success-card h2 {
  font-family: var(--font-display);
  font-size: 2.2rem;
  color: var(--white);
  letter-spacing: 0.05em;
}
.order-id-label {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--ash);
  margin-top: 12px;
}
.order-id-badge {
  display: inline-block;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: var(--accent);
  padding: 6px 16px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 6px 0 16px;
}
.order-msg {
  color: var(--ash);
  line-height: 1.5;
  margin-bottom: 24px;
}
.success-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

@media (max-width: 860px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
