<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSocketStore } from '../stores/socket'

const router = useRouter()
const authStore = useAuthStore()
const socketStore = useSocketStore()

const activeTab = ref('overview')
const loading = ref(false)
const products = ref([])
const orders = ref([])
const sales = ref([])

// Formulario de nuevo producto
const newProductModalOpen = ref(false)
const productForm = ref({
  name: '',
  category: 'Gaming Setup',
  price: 0,
  originalPrice: 0,
  stock: 10,
  status: 'Activo',
  badge: 'Nuevo',
  image: '',
  description: '',
  features: ''
})

onMounted(async () => {
  if (!authStore.isAuthenticated || !authStore.isAdmin) {
    router.push('/login')
    return
  }
  await fetchAllAdminData()
})

async function fetchAllAdminData() {
  loading.value = true
  const token = authStore.token
  try {
    const [pRes, oRes, sRes] = await Promise.all([
      fetch('/api/products?limit=100'),
      fetch('/api/orders?limit=50', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/sales?limit=50', { headers: { Authorization: `Bearer ${token}` } })
    ])

    if (pRes.ok) {
      const pData = await pRes.json()
      products.value = pData.products || []
    }
    if (oRes.ok) {
      const oData = await oRes.json()
      orders.value = oData.orders || []
    }
    if (sRes.ok) {
      const sData = await sRes.json()
      sales.value = sData.sales || []
    }
  } catch (err) {
    console.error('Error cargando datos de administración:', err)
  } finally {
    loading.value = false
  }
}

// ── ACCIONES DE PRODUCTOS ──
async function handleCreateProduct() {
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`
      },
      body: JSON.stringify(productForm.value)
    })
    if (res.ok) {
      newProductModalOpen.value = false
      await fetchAllAdminData()
    }
  } catch (e) {
    console.error(e)
  }
}

async function handleToggleStatus(id) {
  try {
    await fetch(`/api/products/${id}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchAllAdminData()
  } catch (e) {
    console.error(e)
  }
}

async function handleDeleteProduct(id) {
  if (!confirm('¿Estás seguro de eliminar este producto del catálogo?')) return
  try {
    await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    products.value = products.value.filter((p) => p.id !== id)
  } catch (e) {
    console.error(e)
  }
}

// ── ACCIONES DE ÓRDENES ──
async function handleUpdateOrderStatus(orderId, newStatus) {
  try {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ status: newStatus })
    })
    const ord = orders.value.find((o) => o.orderId === orderId || o.id === orderId)
    if (ord) ord.status = newStatus
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <div class="admin-dashboard container">
    <!-- Header -->
    <div class="admin-header">
      <div>
        <span class="admin-tag"><i class="fa-solid fa-shield-halved"></i> PANEL DE CONTROL</span>
        <h1 class="admin-title">ADMINISTRACIÓN ARISSHOP</h1>
      </div>
      <div class="header-actions">
        <button class="btn-primary" @click="newProductModalOpen = true">
          <i class="fa-solid fa-plus"></i> Nuevo Producto
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="admin-tabs">
      <button :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
        <i class="fa-solid fa-chart-line"></i> Resumen
      </button>
      <button :class="{ active: activeTab === 'products' }" @click="activeTab = 'products'">
        <i class="fa-solid fa-boxes-stacked"></i> Productos ({{ products.length }})
      </button>
      <button :class="{ active: activeTab === 'orders' }" @click="activeTab = 'orders'">
        <i class="fa-solid fa-truck-ramp-box"></i> Pedidos ({{ orders.length }})
      </button>
      <button :class="{ active: activeTab === 'sales' }" @click="activeTab = 'sales'">
        <i class="fa-solid fa-file-invoice-dollar"></i> Facturación ({{ sales.length }})
      </button>
    </div>

    <!-- ════════ TAB 1: OVERVIEW ════════ -->
    <div v-if="activeTab === 'overview'" class="tab-pane">
      <div class="kpi-grid">
        <div class="kpi-card glass-panel">
          <div class="kpi-icon"><i class="fa-solid fa-users"></i></div>
          <div class="kpi-info">
            <span>Usuarios Conectados</span>
            <strong>{{ socketStore.activeUsers }} en vivo</strong>
          </div>
        </div>

        <div class="kpi-card glass-panel">
          <div class="kpi-icon accent"><i class="fa-solid fa-boxes-stacked"></i></div>
          <div class="kpi-info">
            <span>Catálogo Activo</span>
            <strong>{{ products.filter(p => p.status === 'Activo').length }} artículos</strong>
          </div>
        </div>

        <div class="kpi-card glass-panel">
          <div class="kpi-icon emerald"><i class="fa-solid fa-receipt"></i></div>
          <div class="kpi-info">
            <span>Total Pedidos</span>
            <strong>{{ orders.length }} órdenes</strong>
          </div>
        </div>

        <div class="kpi-card glass-panel">
          <div class="kpi-icon gold"><i class="fa-solid fa-sack-dollar"></i></div>
          <div class="kpi-info">
            <span>Facturación Total</span>
            <strong>${{ sales.reduce((a, s) => a + (Number(s.total) || 0), 0).toLocaleString('es-CO') }}</strong>
          </div>
        </div>
      </div>

      <!-- Live orders quick preview -->
      <div class="recent-box glass-panel">
        <h3><i class="fa-solid fa-bolt"></i> Últimas Órdenes Registradas</h3>
        <div v-if="orders.length > 0" class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ord in orders.slice(0, 5)" :key="ord.orderId">
                <td><strong class="order-link">{{ ord.orderId }}</strong></td>
                <td>{{ ord.name }} <br /><small>{{ ord.email }}</small></td>
                <td><strong>${{ Number(ord.total).toLocaleString('es-CO') }}</strong></td>
                <td><span :class="['status-badge', ord.status]">{{ ord.status }}</span></td>
                <td>{{ new Date(ord.createdAt).toLocaleDateString('es-CO') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-note">No hay órdenes registradas aún.</p>
      </div>
    </div>

    <!-- ════════ TAB 2: PRODUCTOS ════════ -->
    <div v-if="activeTab === 'products'" class="tab-pane">
      <div class="glass-panel panel-table">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id">
              <td>
                <img :src="p.image" :alt="p.name" class="table-thumb" />
              </td>
              <td>
                <strong>{{ p.name }}</strong>
                <span v-if="p.badge" class="badge-mini">{{ p.badge }}</span>
              </td>
              <td>{{ p.category }}</td>
              <td><strong>${{ Number(p.price).toLocaleString('es-CO') }}</strong></td>
              <td>{{ p.stock }} un.</td>
              <td>
                <button
                  :class="['toggle-status-btn', p.status === 'Activo' ? 'active' : 'hidden']"
                  @click="handleToggleStatus(p.id)"
                >
                  {{ p.status }}
                </button>
              </td>
              <td>
                <button class="action-btn delete-btn" @click="handleDeleteProduct(p.id)" title="Eliminar">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ════════ TAB 3: PEDIDOS ════════ -->
    <div v-if="activeTab === 'orders'" class="tab-pane">
      <div class="glass-panel panel-table">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Método</th>
              <th>Cambiar Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ord in orders" :key="ord.orderId">
              <td>
                <strong>{{ ord.orderId }}</strong>
                <small>{{ new Date(ord.createdAt).toLocaleTimeString('es-CO') }}</small>
              </td>
              <td>
                <strong>{{ ord.name }}</strong>
                <small>{{ ord.phone }} | {{ ord.address }}</small>
              </td>
              <td>
                <span v-for="item in ord.items" :key="item.id" class="order-item-chip">
                  {{ item.name }} (x{{ item.qty }})
                </span>
              </td>
              <td><strong>${{ Number(ord.total).toLocaleString('es-CO') }}</strong></td>
              <td>{{ ord.paymentMethod }}</td>
              <td>
                <select
                  :value="ord.status"
                  @change="handleUpdateOrderStatus(ord.orderId, $event.target.value)"
                  class="status-select"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ════════ TAB 4: VENTAS Y FACTURAS ════════ -->
    <div v-if="activeTab === 'sales'" class="tab-pane">
      <div class="glass-panel panel-table">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Factura / Comprobante</th>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Subtotal</th>
              <th>IVA (19%)</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in sales" :key="sale.id">
              <td>
                <strong>{{ sale.invoiceNumber }}</strong>
                <small>{{ sale.receiptCode }}</small>
              </td>
              <td>{{ sale.orderId }}</td>
              <td>
                <strong>{{ sale.clientName }}</strong>
                <small>NIT/CC: {{ sale.clientNit }}</small>
              </td>
              <td>${{ Number(sale.subtotal).toLocaleString('es-CO') }}</td>
              <td>${{ Number(sale.tax).toLocaleString('es-CO') }}</td>
              <td><strong>${{ Number(sale.total).toLocaleString('es-CO') }}</strong></td>
              <td>
                <span class="status-badge CONFIRMED">{{ sale.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Nuevo Producto -->
    <div v-if="newProductModalOpen" class="modal-backdrop" @click="newProductModalOpen = false">
      <div class="modal-card glass-panel" @click.stop>
        <div class="modal-header">
          <h3>Registrar Nuevo Producto</h3>
          <button class="close-btn" @click="newProductModalOpen = false">&times;</button>
        </div>

        <form @submit.prevent="handleCreateProduct" class="modal-form">
          <div class="form-group">
            <label>Nombre del Producto *</label>
            <input v-model="productForm.name" type="text" required />
          </div>

          <div class="form-group-row">
            <div class="form-group">
              <label>Categoría</label>
              <select v-model="productForm.category">
                <option value="Gaming Setup">Gaming Setup</option>
                <option value="Audio Pro">Audio Pro</option>
                <option value="Accesorios Celulares">Accesorios Celulares</option>
                <option value="Accesorios Streaming">Accesorios Streaming</option>
              </select>
            </div>
            <div class="form-group">
              <label>Precio (COP) *</label>
              <input v-model.number="productForm.price" type="number" required />
            </div>
            <div class="form-group">
              <label>Stock</label>
              <input v-model.number="productForm.stock" type="number" />
            </div>
          </div>

          <div class="form-group">
            <label>URL de Imagen</label>
            <input v-model="productForm.image" type="text" placeholder="https://..." />
          </div>

          <div class="form-group">
            <label>Descripción</label>
            <textarea v-model="productForm.description" rows="3"></textarea>
          </div>

          <div class="form-group">
            <label>Especificaciones Técnicas</label>
            <input v-model="productForm.features" type="text" placeholder="Bluetooth 5.3, Carga USB-C..." />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="newProductModalOpen = false">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar Producto</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  padding-top: 110px;
  padding-bottom: 80px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 16px;
}
.admin-tag {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: var(--accent);
}
.admin-title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  color: var(--white);
  letter-spacing: 0.05em;
}

.admin-tabs {
  display: flex;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
  margin-bottom: 28px;
  overflow-x: auto;
}
.admin-tabs button {
  background: none;
  border: none;
  color: var(--ash);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.admin-tabs button.active {
  background: var(--white);
  color: #0f172a;
  font-weight: 600;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.kpi-card {
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  color: var(--white);
}
.kpi-icon.accent { color: #38bdf8; background: rgba(56, 189, 248, 0.1); }
.kpi-icon.emerald { color: #10b981; background: rgba(16, 185, 129, 0.1); }
.kpi-icon.gold { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }

.kpi-info span {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ash);
  display: block;
}
.kpi-info strong {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  color: var(--white);
}

.panel-table, .recent-box {
  padding: 24px;
  overflow-x: auto;
}
.recent-box h3 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  color: var(--white);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.admin-table th {
  padding: 12px 14px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ash);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.admin-table td {
  padding: 14px;
  font-size: 0.88rem;
  color: var(--platinum);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.admin-table small {
  color: #71717a;
  display: block;
  font-size: 0.75rem;
}

.table-thumb {
  width: 44px;
  height: 44px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 2px;
}

.toggle-status-btn {
  border: none;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}
.toggle-status-btn.active {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}
.toggle-status-btn.hidden {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
}

.status-badge {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 4px;
}
.status-badge.PENDING { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
.status-badge.CONFIRMED { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.status-badge.SHIPPED { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.status-badge.DELIVERED { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.status-badge.CANCELLED { background: rgba(244, 63, 94, 0.15); color: #fb7185; }

.status-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--white);
  padding: 6px 10px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  outline: none;
}

.action-btn {
  background: none;
  border: none;
  color: #71717a;
  cursor: pointer;
  padding: 6px;
  font-size: 0.95rem;
  transition: color 0.2s;
}
.action-btn:hover {
  color: var(--rose);
}

.order-item-chip {
  display: inline-block;
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  margin: 2px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-card {
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.modal-header h3 {
  font-family: var(--font-heading);
  color: var(--white);
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 12px;
}
.modal-form input, .modal-form select, .modal-form textarea {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--white);
  font-family: var(--font-main);
  outline: none;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 14px;
}
</style>
