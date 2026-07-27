// Lógica de Panel de Administración con Módulo de Ventas, Facturación, Sidebar Derecho, JWT y WebSockets

let currentAdminTab = 'dashboard';
let currentSalesData = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
    showDashboard();
  } else {
    showAdminAuth();
  }

  // Cerrar sidebar o modales al presionar la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAdminSidebar();
      closeInvoiceModal();
    }
  });

  // Escuchar conexiones activas WebSockets
  if (typeof io !== 'undefined') {
    const socket = io('http://localhost:3001');
    socket.on('users:active', (count) => {
      const activeEl = document.getElementById('metricActiveSockets');
      if (activeEl) activeEl.textContent = count;
    });

    // Actualizar datos si entra una nueva orden en tiempo real
    socket.on('order:new', () => {
      if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
        if (currentAdminTab === 'dashboard') loadAdminOrders();
        if (currentAdminTab === 'ventas') loadAdminSales();
      }
    });
  }
});

function openAdminSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  if (sidebar) sidebar.classList.add('active');
  if (overlay) overlay.classList.add('active');

  // Actualizar datos del usuario autenticado en la cabecera del sidebar
  if (window.ArisAuth && window.ArisAuth.getUser) {
    const user = window.ArisAuth.getUser();
    if (user) {
      const nameEl = document.getElementById('sidebarAdminName');
      const emailEl = document.getElementById('sidebarAdminEmail');
      if (nameEl && user.name) nameEl.textContent = user.name;
      if (emailEl && user.email) emailEl.textContent = user.email;
    }
  }
}

function closeAdminSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

function selectAdminTab(tabName) {
  currentAdminTab = tabName;
  const tabs = {
    dashboard: { id: 'adminTabDashboard', navId: 'sideNavDashboard', title: 'Dashboard & Pedidos', sub: 'Métricas y control de estados en tiempo real con WebSockets & JWT' },
    ventas: { id: 'adminTabVentas', navId: 'sideNavVentas', title: 'Ventas, Comprobantes & Facturación', sub: 'Historial de ventas completadas, comprobantes de pago y emisión de facturas' },
    productos: { id: 'adminTabProductos', navId: 'sideNavProductos', title: 'Gestión de Productos', sub: 'Catálogo e inventario de productos en Firestore Database' },
    cupones: { id: 'adminTabCupones', navId: 'sideNavCupones', title: 'Cupones & Fidelidad', sub: 'Auditoría de puntos, bonos y emisión de cupones de 90 días' },
    clientes: { id: 'adminTabClientes', navId: 'sideNavClientes', title: 'Clientes & Rangos de XP', sub: 'Directorio de usuarios, niveles y comportamiento de compra' },
    configuracion: { id: 'adminTabConfig', navId: 'sideNavConfig', title: 'Configuración del Sistema', sub: 'Parámetros maestros, llaves JWT y ajustes de infraestructura' }
  };

  // Persistir la pestaña en el hash de la URL sin recargar la página
  if (window.location.hash !== `#${tabName}`) {
    window.history.replaceState(null, '', `#${tabName}`);
  }

  // Ocultar todos los módulos
  Object.keys(tabs).forEach(k => {
    const tabEl = document.getElementById(tabs[k].id);
    const navEl = document.getElementById(tabs[k].navId);
    if (tabEl) tabEl.style.display = 'none';
    if (navEl) navEl.classList.remove('active');
  });

  // Mostrar módulo seleccionado
  const selected = tabs[tabName] || tabs.dashboard;
  const activeTabEl = document.getElementById(selected.id);
  const activeNavEl = document.getElementById(selected.navId);
  const titleEl = document.getElementById('adminModuleTitle');
  const subEl = document.getElementById('adminModuleSubtitle');

  if (activeTabEl) activeTabEl.style.display = 'block';
  if (activeNavEl) activeNavEl.classList.add('active');
  if (titleEl) titleEl.textContent = selected.title;
  if (subEl) subEl.textContent = selected.sub;

  closeAdminSidebar();

  // Cargar datos correspondientes al módulo activo únicamente
  if (tabName === 'dashboard') loadAdminOrders();
  if (tabName === 'ventas') loadAdminSales();
  if (tabName === 'productos') loadAdminProducts();
}

// Escuchar navegación del historial del navegador (atrás / adelante)
window.addEventListener('hashchange', () => {
  const hashTab = window.location.hash.replace('#', '').split('/')[0];
  const validTabs = ['dashboard', 'ventas', 'productos', 'cupones', 'clientes', 'configuracion'];
  if (validTabs.includes(hashTab) && hashTab !== currentAdminTab) {
    selectAdminTab(hashTab);
  }
});

function refreshCurrentAdminModule() {
  if (currentAdminTab === 'dashboard') loadAdminOrders();
  else if (currentAdminTab === 'ventas') loadAdminSales();
  else if (currentAdminTab === 'productos') loadAdminProducts();
}

function showAdminAuth() {
  const authWrap = document.getElementById('adminAuthWrap');
  const dashView = document.getElementById('adminDashboardView');
  if (authWrap) authWrap.style.display = 'flex';
  if (dashView) dashView.style.display = 'none';
}

function showDashboard() {
  const authWrap = document.getElementById('adminAuthWrap');
  const dashView = document.getElementById('adminDashboardView');
  if (authWrap) authWrap.style.display = 'none';
  if (dashView) dashView.style.display = 'block';

  // Leer la pestaña activa guardada en la URL hash o mantener la pestaña actual
  const hashTab = window.location.hash.replace('#', '').split('/')[0];
  const validTabs = ['dashboard', 'ventas', 'productos', 'cupones', 'clientes', 'configuracion'];
  const targetTab = validTabs.includes(hashTab) ? hashTab : currentAdminTab || 'dashboard';

  selectAdminTab(targetTab);
}

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('adminLoginEmail').value;
  const password = document.getElementById('adminLoginPassword').value;
  const errEl = document.getElementById('adminLoginErrorMsg');
  const succEl = document.getElementById('adminLoginSuccessMsg');

  errEl.style.display = 'none';
  succEl.style.display = 'none';

  try {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Credenciales administrativas inválidas';
      errEl.style.display = 'block';
      return;
    }

    succEl.textContent = '¡Inicio de sesión admin exitoso! Ingresando al panel...';
    succEl.style.display = 'block';

    window.ArisAuth.setToken(data.token);
    setTimeout(() => {
      showDashboard();
    }, 400);
  } catch (err) {
    errEl.textContent = 'Error de conexión con el servidor Node.js';
    errEl.style.display = 'block';
  }
}

function logoutAdmin() {
  window.ArisAuth.removeToken();
  closeAdminSidebar();
  showAdminAuth();
}

async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

  try {
    const res = await window.ArisAuth.fetchWithAuth('http://localhost:3001/api/orders');
    if (!res.ok) throw new Error('No autorizado');

    const data = await res.json();
    const orders = data.orders || [];

    const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const orderCount = orders.length;

    // Calcular clientes únicos desde las órdenes
    const clientMap = {};
    const productMap = {};
    let deliveredCount = 0;

    orders.forEach(o => {
      const email = o.email || o.phone || o.name || 'Cliente Anonimo';
      if (!clientMap[email]) {
        clientMap[email] = { name: o.name || 'Cliente', email: o.email || 'N/A', orders: 0, total: 0 };
      }
      clientMap[email].orders += 1;
      clientMap[email].total += (o.total || 0);

      if (o.status === 'DELIVERED' || o.status === 'SHIPPED') {
        deliveredCount += 1;
      }

      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          productMap[it.name] = (productMap[it.name] || 0) + (it.qty || 1) * (it.unitPrice || 0);
        });
      }
    });

    const uniqueClients = Object.keys(clientMap).length;
    const repeatClients = Object.values(clientMap).filter(c => c.orders > 1).length;
    const recurrentRate = uniqueClients > 0 ? Math.round((repeatClients / uniqueClients) * 100) : 0;
    const deliveryRate = orderCount > 0 ? Math.round((deliveredCount / orderCount) * 100) : 0;

    // Actualizar elementos DOM dinámicamente
    const salesEl = document.getElementById('metricTotalSales');
    const orderCountEl = document.getElementById('metricOrderCount');
    const newCustEl = document.getElementById('metricNewCustomers');
    const deliveryRateEl = document.getElementById('metricDeliveryRate');
    const subDeliveryEl = document.getElementById('subDeliveryRate');
    const lineValEl = document.getElementById('lineChartValue');
    const lineTrendEl = document.getElementById('lineChartTrend');
    const donutValEl = document.getElementById('donutTotalValue');
    const monthOrderCountEl = document.getElementById('currentMonthOrderCount');
    const monthOrderBarEl = document.getElementById('currentMonthOrderBar');
    const kpiBaseClientesEl = document.getElementById('kpiBaseClientes');
    const kpiRecurrentesEl = document.getElementById('kpiRecurrentes');

    if (salesEl) salesEl.textContent = format(totalSales);
    if (orderCountEl) orderCountEl.textContent = orderCount;
    if (newCustEl) newCustEl.textContent = uniqueClients;
    if (deliveryRateEl) deliveryRateEl.textContent = `${deliveryRate}%`;
    if (subDeliveryEl) subDeliveryEl.textContent = orderCount > 0 ? `${deliveredCount} de ${orderCount} completados` : 'Esperando datos BD';
    if (lineValEl) lineValEl.textContent = format(totalSales);
    if (lineTrendEl) lineTrendEl.textContent = orderCount > 0 ? `${orderCount} órdenes en BD` : 'Sin datos acumulados';
    if (donutValEl) donutValEl.textContent = format(totalSales);
    if (monthOrderCountEl) monthOrderCountEl.textContent = orderCount;
    if (monthOrderBarEl) monthOrderBarEl.style.height = orderCount > 0 ? `${Math.min(100, Math.max(10, orderCount * 15))}px` : '4px';
    if (kpiBaseClientesEl) kpiBaseClientesEl.textContent = uniqueClients;
    if (kpiRecurrentesEl) kpiRecurrentesEl.textContent = `${recurrentRate}%`;

    // Renderizar Productos Top dinámicamente
    const topProdContainer = document.getElementById('topProductsContainer');
    if (topProdContainer) {
      const prodKeys = Object.keys(productMap);
      if (prodKeys.length === 0) {
        topProdContainer.innerHTML = `<div style="color:var(--ash); font-family:'DM Mono',monospace; font-size:0.8rem; text-align:center; padding:32px;">No hay productos vendidos aún en la base de datos.</div>`;
      } else {
        const maxVal = Math.max(...Object.values(productMap));
        topProdContainer.innerHTML = prodKeys.map(pName => {
          const val = productMap[pName];
          const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
          return `
            <div class="product-progress-item">
              <div class="product-progress-head">
                <span style="color:var(--white); font-weight:600;">${pName}</span>
                <span style="font-family:'DM Mono',monospace; font-weight:700;">${format(val)}</span>
              </div>
              <div class="product-progress-bar-bg">
                <div class="product-progress-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Renderizar Clientes Top dinámicamente
    const topClientsContainer = document.getElementById('topClientsContainer');
    if (topClientsContainer) {
      const clientList = Object.values(clientMap);
      if (clientList.length === 0) {
        topClientsContainer.innerHTML = `<div style="color:var(--ash); font-family:'DM Mono',monospace; font-size:0.8rem; text-align:center; padding:24px;">No hay clientes registrados en la base de datos aún.</div>`;
      } else {
        topClientsContainer.innerHTML = clientList.map(c => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--jet); border:1px solid var(--graphite); border-radius:12px;">
            <div>
              <div style="font-weight:600; color:var(--white); font-size:0.85rem;">${c.name}</div>
              <div style="font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--ash);">${c.orders} Pedidos · ${format(c.total)}</div>
            </div>
            <span style="font-family:'DM Mono',monospace; font-size:0.68rem; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:3px 8px; border-radius:10px;">CLIENTE ACTIVO</span>
          </div>
        `).join('');
      }
    }

    // Renderizar Tabla de Órdenes
    if (tbody) {
      if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--ash); padding:24px;">No hay órdenes registradas aún en Firestore.</td></tr>`;
        return;
      }

      tbody.innerHTML = orders.map(o => `
        <tr>
          <td style="font-family:'DM Mono',monospace; font-weight:700; color:#38bdf8;">#${o.orderId}</td>
          <td>${o.name || 'Cliente'}</td>
          <td style="font-weight:700;">${format(o.total || 0)}</td>
          <td style="color:var(--ash); font-size:0.8rem;">${new Date(o.createdAt || Date.now()).toLocaleDateString('es-CO')}</td>
          <td>
            <select class="status-select" onchange="changeOrderStatus('${o.orderId}', this.value)">
              <option value="PENDING" ${o.status === 'PENDING' ? 'selected' : ''}>1. Recibido</option>
              <option value="CONFIRMED" ${o.status === 'CONFIRMED' ? 'selected' : ''}>2. Confirmado</option>
              <option value="SHIPPED" ${o.status === 'SHIPPED' ? 'selected' : ''}>3. En Camino</option>
              <option value="DELIVERED" ${o.status === 'DELIVERED' ? 'selected' : ''}>4. Entregado</option>
            </select>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#f43f5e; padding:24px;">Error cargando órdenes. Inicia sesión nuevamente.</td></tr>`;
  }
}

async function loadAdminSales() {
  const tbody = document.getElementById('adminSalesTableBody');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

  try {
    const res = await fetch('http://localhost:3001/api/sales');
    if (!res.ok) throw new Error('Error al cargar ventas');

    const data = await res.json();
    currentSalesData = data.sales || [];

    const totalFacturado = currentSalesData.reduce((sum, s) => sum + (s.total || 0), 0);
    const verifiedCount = currentSalesData.filter(s => s.receiptStatus === 'VERIFICADO').length;

    document.getElementById('metricSalesTotal').textContent = format(totalFacturado);
    document.getElementById('metricInvoiceCount').textContent = currentSalesData.length;
    document.getElementById('metricReceiptCount').textContent = verifiedCount;

    if (currentSalesData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--ash);">No hay ventas registradas en el sistema.</td></tr>`;
      return;
    }

    tbody.innerHTML = currentSalesData.map(s => `
      <tr>
        <td style="font-family:'DM Mono',monospace; font-weight:700; color:#38bdf8;">${s.invoiceNumber}</td>
        <td style="font-family:'DM Mono',monospace; font-size:0.85rem; color:var(--ash);">${s.orderId}</td>
        <td>
          <div style="font-weight:600; color:var(--white);">${s.clientName}</div>
          <div style="font-size:0.75rem; color:var(--ash); font-family:'DM Mono',monospace;">NIT: ${s.clientNit}</div>
        </td>
        <td style="font-size:0.85rem;">${s.paymentMethod}</td>
        <td style="font-weight:700; font-family:'DM Mono',monospace;">${format(s.total)}</td>
        <td>
          <span style="font-family:'DM Mono',monospace; font-size:0.72rem; background:rgba(63,231,184,0.15); color:#3fe7b8; padding:3px 8px; border-radius:6px; border:1px solid rgba(63,231,184,0.3);">
            ${s.receiptCode}
          </span>
        </td>
        <td>
          <span style="font-family:'DM Mono',monospace; font-size:0.72rem; background:rgba(56,189,248,0.15); color:#38bdf8; padding:3px 8px; border-radius:6px;">
            ${s.status}
          </span>
        </td>
        <td>
          <button onclick="viewInvoiceDetail('${s.id}')" class="btn-ghost" style="padding:6px 12px; font-size:0.75rem; cursor:pointer;">
            📄 Ver Factura
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#f43f5e;">Error de conexión cargando registro de ventas.</td></tr>`;
  }
}

function viewInvoiceDetail(saleId) {
  const sale = currentSalesData.find(s => s.id === saleId);
  if (!sale) return;

  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
  const bodyEl = document.getElementById('invoiceModalBody');
  const overlay = document.getElementById('invoiceModalOverlay');
  const modal = document.getElementById('invoiceModal');

  const itemsListHtml = (sale.items || []).map(i => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid var(--graphite); color:var(--white); font-weight:500;">${i.name}</td>
      <td style="padding:10px; border-bottom:1px solid var(--graphite); font-family:'DM Mono',monospace; text-align:center;">${i.qty}</td>
      <td style="padding:10px; border-bottom:1px solid var(--graphite); font-family:'DM Mono',monospace; text-align:right;">${format(i.unitPrice)}</td>
      <td style="padding:10px; border-bottom:1px solid var(--graphite); font-family:'DM Mono',monospace; text-align:right; font-weight:700;">${format(i.qty * i.unitPrice)}</td>
    </tr>
  `).join('');

  bodyEl.innerHTML = `
    <div style="background:var(--jet); border:1px solid var(--graphite); border-radius:14px; padding:20px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash); text-transform:uppercase;">Factura N°</div>
          <div style="font-family:'DM Mono',monospace; font-size:1.4rem; font-weight:700; color:#38bdf8;">${sale.invoiceNumber}</div>
          <div style="font-size:0.8rem; color:var(--ash); margin-top:4px;">Orden de Referencia: <strong>${sale.orderId}</strong></div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash); text-transform:uppercase;">Fecha de Emisión</div>
          <div style="font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:600; color:var(--white);">${new Date(sale.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div style="margin-top:4px;">
            <span style="font-family:'DM Mono',monospace; font-size:0.7rem; background:rgba(63,231,184,0.15); color:#3fe7b8; padding:3px 8px; border-radius:6px; border:1px solid rgba(63,231,184,0.3);">
              Comprobante Verificado (${sale.receiptCode})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- DATOS DEL CLIENTE -->
    <div style="margin-bottom:20px;">
      <div style="font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">Datos del Cliente</div>
      <div style="background:var(--jet); border:1px solid var(--graphite); border-radius:12px; padding:14px 18px; font-size:0.9rem;">
        <div style="color:var(--white); font-weight:700;">${sale.clientName}</div>
        <div style="color:var(--ash); font-family:'DM Mono',monospace; font-size:0.8rem; margin-top:2px;">Correo: ${sale.clientEmail} · NIT/CC: ${sale.clientNit}</div>
        <div style="color:var(--ash); font-size:0.8rem; margin-top:4px;">Método de Pago: <span style="color:#38bdf8; font-weight:600;">${sale.paymentMethod}</span></div>
      </div>
    </div>

    <!-- DETALLE DE ARTÍCULOS -->
    <div style="margin-bottom:20px;">
      <div style="font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">Detalle de Productos Facturados</div>
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead>
          <tr style="background:var(--jet); text-transform:uppercase; font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash);">
            <th style="padding:10px; text-align:left;">Producto</th>
            <th style="padding:10px; text-align:center;">Cant.</th>
            <th style="padding:10px; text-align:right;">P. Unitario</th>
            <th style="padding:10px; text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
      </table>
    </div>

    <!-- RESUMEN LIQUIDACIÓN DE IMPUESTOS -->
    <div style="background:var(--jet); border:1px solid var(--graphite); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:8px; width:260px; margin-left:auto;">
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--ash);">
        <span>Subtotal Neto:</span>
        <span style="font-family:'DM Mono',monospace; color:var(--white);">${format(sale.subtotal)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--ash);">
        <span>IVA (19%):</span>
        <span style="font-family:'DM Mono',monospace; color:var(--white);">${format(sale.tax)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; color:#38bdf8; border-top:1px solid var(--graphite); padding-top:8px; margin-top:4px;">
        <span>Total Pagado:</span>
        <span style="font-family:'DM Mono',monospace;">${format(sale.total)}</span>
      </div>
    </div>
  `;

  if (overlay) overlay.classList.add('active');
  if (modal) modal.style.display = 'block';
}

function closeInvoiceModal() {
  const overlay = document.getElementById('invoiceModalOverlay');
  const modal = document.getElementById('invoiceModal');
  if (overlay) overlay.classList.remove('active');
  if (modal) modal.style.display = 'none';
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await window.ArisAuth.fetchWithAuth(`http://localhost:3001/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      console.log(`⚡ Estado de orden #${orderId} cambiado a: ${newStatus}`);
    } else {
      alert('Error cambiando estado');
    }
  } catch (err) {
    alert('Error al conectar con el servidor');
  }
}

function updateDashboardTimeframe(period) {
  const poly = document.getElementById('lineChartPath');
  const fill = document.getElementById('lineChartPolygon');
  const valEl = document.getElementById('lineChartValue');
  const trendEl = document.getElementById('lineChartTrend');

  if (period === 'Trimestral') {
    if (valEl) valEl.textContent = '$4.290.000';
    if (trendEl) trendEl.textContent = '↑ 24.8% vs trimestre anterior';
    if (poly) poly.setAttribute('points', '0,140 45,120 90,80 135,100 180,60 225,40 270,70 315,30 360,50 405,20 450,30 500,15');
    if (fill) fill.setAttribute('points', '0,140 45,120 90,80 135,100 180,60 225,40 270,70 315,30 360,50 405,20 450,30 500,15 500,160 0,160');
  } else if (period === 'Anual') {
    if (valEl) valEl.textContent = '$17.160.000';
    if (trendEl) trendEl.textContent = '↑ 45.2% vs año anterior';
    if (poly) poly.setAttribute('points', '0,150 45,130 90,110 135,90 180,70 225,50 270,40 315,30 360,25 405,20 450,15 500,10');
    if (fill) fill.setAttribute('points', '0,150 45,130 90,110 135,90 180,70 225,50 270,40 315,30 360,25 405,20 450,15 500,10 500,160 0,160');
  } else {
    // Mensual
    if (valEl) valEl.textContent = '$1.430.000';
    if (trendEl) trendEl.textContent = '↑ 12.5% vs mes anterior';
    if (poly) poly.setAttribute('points', '0,130 45,110 90,95 135,115 180,85 225,70 270,90 315,60 360,75 405,45 450,55 500,25');
    if (fill) fill.setAttribute('points', '0,130 45,110 90,95 135,115 180,85 225,70 270,90 315,60 360,75 405,45 450,55 500,25 500,160 0,160');
  }
}

function showProductSubView(viewName) {
  const listView = document.getElementById('prodSubViewList');
  const createView = document.getElementById('prodSubViewCreate');
  const editView = document.getElementById('prodSubViewEdit');

  if (listView) listView.style.display = viewName === 'list' ? 'block' : 'none';
  if (createView) createView.style.display = viewName === 'create' ? 'block' : 'none';
  if (editView) editView.style.display = viewName === 'edit' ? 'block' : 'none';

  if (viewName === 'list') {
    loadAdminProducts();
  } else if (viewName === 'create') {
    const form = document.getElementById('newProductPageForm');
    if (form) form.reset();
    const prevWrap = document.getElementById('createImgPreviewWrap');
    if (prevWrap) prevWrap.style.display = 'none';
  }
}

function previewProductImage(mode, url) {
  const wrapId = mode === 'create' ? 'createImgPreviewWrap' : 'editImgPreviewWrap';
  const imgId = mode === 'create' ? 'createImgPreview' : 'editImgPreview';

  const wrap = document.getElementById(wrapId);
  const img = document.getElementById(imgId);

  if (url && url.trim()) {
    if (img) img.src = url.trim();
    if (wrap) wrap.style.display = 'block';
  } else {
    if (wrap) wrap.style.display = 'none';
  }
}

async function handleCreateProductSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('prodNamePage').value.trim();
  const category = document.getElementById('prodCategoryPage').value;
  const price = document.getElementById('prodPricePage').value;
  const originalPrice = document.getElementById('prodOrigPricePage').value;
  const stock = document.getElementById('prodStockPage').value;
  const status = document.getElementById('prodStatusPage').value;
  const badge = document.getElementById('prodBadgePage').value;
  const image = document.getElementById('prodImagePage').value.trim();
  const addImage = document.getElementById('prodAddImagePage').value.trim();
  const description = document.getElementById('prodDescPage').value.trim();
  const features = document.getElementById('prodFeaturesPage').value.trim();

  const errEl = document.getElementById('newProdPageErrorMsg');
  const succEl = document.getElementById('newProdPageSuccessMsg');

  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  try {
    const res = await window.ArisAuth.fetchWithAuth('http://localhost:3001/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name, category, price, originalPrice, stock, status, badge, image,
        additionalImages: addImage ? [addImage] : [],
        description, features
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al guardar el producto');
    }

    if (succEl) {
      succEl.textContent = '✅ Producto registrado exitosamente en Firestore Database';
      succEl.style.display = 'block';
    }

    setTimeout(() => {
      showProductSubView('list');
      loadAdminOrders();
    }, 1000);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Error al conectar con el servidor';
      errEl.style.display = 'block';
    }
  }
}

let currentProductsData = [];

async function loadAdminProducts() {
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

  try {
    const res = await fetch('http://localhost:3001/api/products');
    if (!res.ok) throw new Error('Error cargando catálogo');

    const data = await res.json();
    currentProductsData = data.products || [];

    const totalStock = currentProductsData.reduce((sum, p) => sum + (p.stock || 0), 0);
    const valuation = currentProductsData.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

    const countEl = document.getElementById('prodMetricCount');
    const stockEl = document.getElementById('prodMetricStock');
    const valEl = document.getElementById('prodMetricValuation');

    if (countEl) countEl.textContent = currentProductsData.length;
    if (stockEl) stockEl.textContent = totalStock;
    if (valEl) valEl.textContent = format(valuation);

    renderProductsTable(currentProductsData);
  } catch (err) {
    const tbody = document.getElementById('adminProductsTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#f43f5e; padding:24px;">Error al cargar catálogo de productos desde Firestore.</td></tr>`;
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('adminProductsTableBody');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--ash); padding:28px;">No se encontraron productos coincidentes en Firestore.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const isHidden = p.status === 'Oculto';
    const isOut = (p.stock || 0) <= 0;
    const hasMoreImg = Array.isArray(p.additionalImages) && p.additionalImages.length > 0;
    
    return `
      <tr style="${isHidden ? 'opacity:0.6;' : ''}">
        <td>
          <div style="position:relative; width:44px; height:44px;">
            <img src="${p.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'}" alt="${p.name}" style="width:44px; height:44px; object-fit:cover; border-radius:8px; border:1px solid var(--graphite);" />
            ${hasMoreImg ? `<span style="position:absolute; bottom:-4px; right:-4px; font-family:'DM Mono',monospace; font-size:0.6rem; background:#38bdf8; color:#000; font-weight:700; padding:1px 3px; border-radius:4px;" title="Galería secundaria incluida">+${p.additionalImages.length}</span>` : ''}
          </div>
        </td>
        <td>
          <div style="font-weight:700; color:var(--white);">${p.name}</div>
          <div style="font-family:'DM Mono',monospace; font-size:0.72rem; color:#38bdf8;">ID: ${p.id}</div>
        </td>
        <td>
          <span style="font-family:'DM Mono',monospace; font-size:0.75rem; background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:3px 8px; border-radius:10px;">${p.category || 'General'}</span>
        </td>
        <td style="font-family:'DM Mono',monospace; font-weight:700; color:#3fe7b8; font-size:0.92rem;">
          ${format(p.price || 0)}
        </td>
        <td style="font-family:'DM Mono',monospace; font-size:0.85rem; color:var(--ash);">
          ${p.originalPrice && Number(p.originalPrice) > Number(p.price) 
            ? `<span style="text-decoration:line-through;">${format(p.originalPrice)}</span>` 
            : '<span style="color:rgba(255,255,255,0.2);">-</span>'}
        </td>
        <td style="font-family:'DM Mono',monospace; font-weight:700;">
          ${isOut 
            ? `<span style="color:#f43f5e;">Agotado (0)</span>` 
            : `<span style="color:#3fe7b8;">${p.stock} un.</span>`}
        </td>
        <td>
          <span style="font-family:'DM Mono',monospace; font-size:0.75rem; padding:3px 8px; border-radius:10px; ${isHidden ? 'background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.3);' : 'background:rgba(63,231,184,0.12); color:#3fe7b8; border:1px solid rgba(63,231,184,0.3);'}">
            ● ${p.status || 'Activo'}
          </span>
        </td>
        <td>
          ${p.badge 
            ? `<span style="font-family:'DM Mono',monospace; font-size:0.72rem; background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3); padding:3px 8px; border-radius:10px;">${p.badge}</span>` 
            : '<span style="color:rgba(255,255,255,0.2);">-</span>'}
        </td>
        <td style="color:var(--ash); font-size:0.8rem; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.description || ''}">
          ${p.description || 'Sin descripción'}
        </td>
        <td style="color:var(--ash); font-size:0.8rem; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.features || ''}">
          ${p.features || 'Sin características'}
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button onclick="openEditProductPage('${p.id}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; cursor:pointer;" title="Editar producto">✏️ Editar</button>
            <button onclick="toggleProductStatus('${p.id}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; cursor:pointer; color:#f59e0b; border-color:rgba(245,158,11,0.3);" title="Cambiar visibilidad">${isHidden ? '👁️ Mostrar' : '🙈 Ocultar'}</button>
            <button onclick="duplicateProduct('${p.id}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; cursor:pointer; color:#a855f7; border-color:rgba(168,85,247,0.3);" title="Duplicar ítem">📋 Duplicar</button>
            <button onclick="deleteProduct('${p.id}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; color:#f43f5e; border-color:rgba(244,63,94,0.3); cursor:pointer;" title="Eliminar de Firestore">🗑️ Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminProducts() {
  const query = (document.getElementById('prodSearchInput')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('prodCategoryFilter')?.value || 'ALL';
  const status = document.getElementById('prodStatusFilter')?.value || 'ALL';

  const filtered = currentProductsData.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(query) || (p.id || '').toLowerCase().includes(query);
    const matchesCat = cat === 'ALL' || p.category === cat;
    const matchesStatus = status === 'ALL' || 
      (status === 'Activo' && p.status === 'Activo' && (p.stock || 0) > 0) ||
      (status === 'Oculto' && p.status === 'Oculto') ||
      (status === 'Agotado' && (p.stock || 0) <= 0);

    return matchesSearch && matchesCat && matchesStatus;
  });

  renderProductsTable(filtered);
}

async function toggleProductStatus(id) {
  try {
    const res = await window.ArisAuth.fetchWithAuth(`http://localhost:3001/api/products/${encodeURIComponent(id)}/toggle-status`, {
      method: 'PATCH'
    });

    if (res.ok) {
      loadAdminProducts();
    } else {
      alert('Error al alternar estado');
    }
  } catch (err) {
    alert('Error al conectar con el servidor');
  }
}

function duplicateProduct(id) {
  const prod = currentProductsData.find(p => p.id === id);
  if (!prod) return;

  showProductSubView('create');

  document.getElementById('prodNamePage').value = `${prod.name} (Copia)`;
  document.getElementById('prodCategoryPage').value = prod.category || 'Accesorios Celulares';
  document.getElementById('prodPricePage').value = prod.price || '';
  document.getElementById('prodOrigPricePage').value = prod.originalPrice || '';
  document.getElementById('prodStockPage').value = prod.stock || 10;
  document.getElementById('prodStatusPage').value = prod.status || 'Activo';
  document.getElementById('prodBadgePage').value = prod.badge || 'Nuevo';
  document.getElementById('prodImagePage').value = prod.image || '';
  document.getElementById('prodAddImagePage').value = (prod.additionalImages && prod.additionalImages[0]) || '';
  document.getElementById('prodDescPage').value = prod.description || '';
  document.getElementById('prodFeaturesPage').value = prod.features || '';

  previewProductImage('create', prod.image || '');
}

function openEditProductPage(id) {
  const prod = currentProductsData.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('editProdIdPage').value = prod.id;
  document.getElementById('editProdNamePage').value = prod.name || '';
  document.getElementById('editProdCategoryPage').value = prod.category || 'Accesorios Celulares';
  document.getElementById('editProdPricePage').value = prod.price || '';
  document.getElementById('editProdOrigPricePage').value = prod.originalPrice || '';
  document.getElementById('editProdStockPage').value = prod.stock || 0;
  document.getElementById('editProdStatusPage').value = prod.status || 'Activo';
  document.getElementById('editProdBadgePage').value = prod.badge || 'Nuevo';
  document.getElementById('editProdImagePage').value = prod.image || '';
  document.getElementById('editProdAddImagePage').value = (prod.additionalImages && prod.additionalImages[0]) || '';
  document.getElementById('editProdDescPage').value = prod.description || '';
  document.getElementById('editProdFeaturesPage').value = prod.features || '';

  previewProductImage('edit', prod.image || '');

  const errEl = document.getElementById('editProdPageErrorMsg');
  const succEl = document.getElementById('editProdPageSuccessMsg');
  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  showProductSubView('edit');
}

async function handleEditProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editProdIdPage').value;
  const name = document.getElementById('editProdNamePage').value.trim();
  const category = document.getElementById('editProdCategoryPage').value;
  const price = document.getElementById('editProdPricePage').value;
  const originalPrice = document.getElementById('editProdOrigPricePage').value;
  const stock = document.getElementById('editProdStockPage').value;
  const status = document.getElementById('editProdStatusPage').value;
  const badge = document.getElementById('editProdBadgePage').value;
  const image = document.getElementById('editProdImagePage').value.trim();
  const addImage = document.getElementById('editProdAddImagePage').value.trim();
  const description = document.getElementById('editProdDescPage').value.trim();
  const features = document.getElementById('editProdFeaturesPage').value.trim();

  const errEl = document.getElementById('editProdPageErrorMsg');
  const succEl = document.getElementById('editProdPageSuccessMsg');

  try {
    const res = await window.ArisAuth.fetchWithAuth(`http://localhost:3001/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name, category, price, originalPrice, stock, status, badge, image,
        additionalImages: addImage ? [addImage] : [],
        description, features
      })
    });

    if (!res.ok) throw new Error('Error al actualizar el producto en Firestore');

    if (succEl) {
      succEl.textContent = '✅ Producto actualizado exitosamente en Firestore Database';
      succEl.style.display = 'block';
    }

    setTimeout(() => {
      showProductSubView('list');
      loadAdminOrders();
    }, 1000);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Error al conectar con el servidor';
      errEl.style.display = 'block';
    }
  }
}

async function deleteProduct(id) {
  if (!confirm(`¿Estás seguro de eliminar permanentemente el producto #${id} de Firestore Database?`)) return;

  try {
    const res = await window.ArisAuth.fetchWithAuth(`http://localhost:3001/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      loadAdminProducts();
      loadAdminOrders();
    } else {
      alert('Error eliminando producto');
    }
  } catch (err) {
    alert('Error de conexión con el servidor');
  }
}

function goToAddProductPage() {
  selectAdminTab('productos');
  showProductSubView('create');
}

window.openAdminSidebar = openAdminSidebar;
window.closeAdminSidebar = closeAdminSidebar;
window.selectAdminTab = selectAdminTab;
window.updateDashboardTimeframe = updateDashboardTimeframe;
window.refreshCurrentAdminModule = refreshCurrentAdminModule;
window.handleAdminLoginSubmit = handleAdminLoginSubmit;
window.logoutAdmin = logoutAdmin;
window.loadAdminOrders = loadAdminOrders;
window.loadAdminSales = loadAdminSales;
window.loadAdminProducts = loadAdminProducts;
window.viewInvoiceDetail = viewInvoiceDetail;
window.closeInvoiceModal = closeInvoiceModal;
window.changeOrderStatus = changeOrderStatus;
window.showProductSubView = showProductSubView;
window.previewProductImage = previewProductImage;
window.handleCreateProductSubmit = handleCreateProductSubmit;
window.openEditProductPage = openEditProductPage;
window.openEditProductModal = openEditProductPage;
window.handleEditProductSubmit = handleEditProductSubmit;
window.deleteProduct = deleteProduct;
window.toggleProductStatus = toggleProductStatus;
window.duplicateProduct = duplicateProduct;
window.filterAdminProducts = filterAdminProducts;
window.goToAddProductPage = goToAddProductPage;
