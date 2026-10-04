// Lógica de Panel de Administración con Vista Principal Hub, Métricas, Ventas, Facturación, JWT y WebSockets
const API_BASE = (window.ARIS_CONFIG && window.ARIS_CONFIG.API_URL) || (window.ArisAuth && window.ArisAuth.baseUrl) || 'http://localhost:3005';

let currentAdminTab = 'dashboard';
let currentSalesData = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
    showDashboard();
  } else {
    showAdminAuth();
    if (window.location.search.includes('preview')) {
      autoLoginAdmin();
    }
  }

  // Cerrar modales y sidebar móvil al presionar la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeInvoiceModal();
      closeAdminSidebarMobile();
    }
  });

  // ── ESCUCHA DE EVENTOS REALTIME Y SINCRONIZACIÓN MULTI-PESTAÑA ──
  window.addEventListener('aris:order:new', () => {
    if (adminDataCache.orders) adminDataCache.orders.timestamp = 0;
    if (adminDataCache.sales) adminDataCache.sales.timestamp = 0;
    if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
      if (currentAdminTab === 'dashboard') loadAdminOrders(true);
      if (currentAdminTab === 'ventas') loadAdminSales(true);
    }
  });

  window.addEventListener('aris:order:status', () => {
    if (adminDataCache.orders) adminDataCache.orders.timestamp = 0;
    if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
      if (currentAdminTab === 'dashboard') loadAdminOrders(true);
    }
  });

  window.addEventListener('aris:stock:update', () => {
    if (adminDataCache.products) adminDataCache.products.timestamp = 0;
    if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
      if (currentAdminTab === 'productos') loadAdminProducts(true);
    }
  });

  // Resincronización automática de caché cuando el WebSocket se reconecta tras una pérdida de red
  window.addEventListener('aris:socket:reconnect', () => {
    console.log('⚡ Socket reconectado: invalidando caché y resincronizando datos del admin panel...');
    if (adminDataCache.orders) adminDataCache.orders.timestamp = 0;
    if (adminDataCache.sales) adminDataCache.sales.timestamp = 0;
    if (adminDataCache.products) adminDataCache.products.timestamp = 0;
    if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
      refreshCurrentAdminModule();
      if (currentAdminTab === 'hub') {
        updateHubBadges();
      }
    }
  });

  // Sincronización entre pestañas abiertas del navegador vía storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'aris_cache_sync' && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        if (payload.module && adminDataCache[payload.module]) {
          adminDataCache[payload.module].timestamp = 0;
          if (currentAdminTab === 'dashboard' && payload.module === 'orders') loadAdminOrders(true);
          else if (currentAdminTab === 'ventas' && payload.module === 'sales') loadAdminSales(true);
          else if (currentAdminTab === 'productos' && payload.module === 'products') loadAdminProducts(true);
        }
      } catch (_) {}
    }
  });

  // Escuchar conexiones activas WebSockets
  if (typeof io !== 'undefined') {
    const socket = io(API_BASE);
    socket.on('users:active', (count) => {
      const activeEl = document.getElementById('metricActiveSockets');
      if (activeEl) activeEl.textContent = count;
    });

    // Actualizar datos si entra una nueva orden en tiempo real
    socket.on('order:new', () => {
      if (adminDataCache.orders) adminDataCache.orders.timestamp = 0;
      if (adminDataCache.sales) adminDataCache.sales.timestamp = 0;

      if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
        if (currentAdminTab === 'dashboard') loadAdminOrders(true);
        if (currentAdminTab === 'ventas') loadAdminSales(true);
      }
    });
  }
});

// ── UTILIDADES ANTI-XSS Y SANITIZACIÓN ESTRICTA ──
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeURL(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/|\.\/)/i.test(trimmed)) {
    return escapeHTML(trimmed);
  }
  return '';
}

function broadcastTabSync(module) {
  try {
    localStorage.setItem('aris_cache_sync', JSON.stringify({ module, t: Date.now() }));
  } catch (_) {}
}

// ── CAPA DE CACHÉ SWR (STALE-WHILE-REVALIDATE) PARA FLUIDEZ TOTAL ──
const adminDataCache = {
  orders: { data: null, timestamp: 0 },
  sales: { data: null, timestamp: 0 },
  products: { data: null, timestamp: 0 }
};
const ADMIN_CACHE_TTL = 30000; // 30 segundos de vigencia

function isCacheValid(key) {
  return adminDataCache[key] &&
         adminDataCache[key].data &&
         (Date.now() - adminDataCache[key].timestamp < ADMIN_CACHE_TTL);
}

// Control del Sidebar izquierdo colapsable al nivel de iconos (de izquierda a derecha)
function toggleAdminSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  if (window.innerWidth <= 768) {
    if (sidebar) sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('active');
  } else {
    const isCollapsed = sidebar ? sidebar.classList.toggle('collapsed') : false;
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    localStorage.setItem('aris_admin_sidebar_collapsed', isCollapsed ? '1' : '0');
    updateSidebarToggleButtons(isCollapsed);
  }
}

function updateSidebarToggleButtons(isCollapsed) {
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const footerText = document.getElementById('sidebarFooterToggleText');
  const footerBtn = document.getElementById('sidebarFooterToggleBtn');
  if (toggleBtn) {
    toggleBtn.setAttribute('title', isCollapsed ? 'Expandir' : 'Colapsar');
  }
  if (footerBtn) {
    const icon = footerBtn.querySelector('svg polyline');
    if (icon) {
      icon.setAttribute('points', isCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6');
    }
  }
  if (footerText) {
    footerText.textContent = isCollapsed ? '' : 'Colapsar';
  }
}

function openAdminSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (window.innerWidth <= 768) {
    if (sidebar) sidebar.classList.add('mobile-open');
    const overlay = document.getElementById('adminSidebarOverlay');
    if (overlay) overlay.classList.add('active');
  } else {
    if (sidebar) sidebar.classList.remove('collapsed');
    document.body.classList.remove('sidebar-collapsed');
    localStorage.setItem('aris_admin_sidebar_collapsed', '0');
    updateSidebarToggleButtons(false);
  }
}

function closeAdminSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (window.innerWidth <= 768) {
    closeAdminSidebarMobile();
  } else {
    if (sidebar) sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    localStorage.setItem('aris_admin_sidebar_collapsed', '1');
    updateSidebarToggleButtons(true);
  }
}

function closeAdminSidebarMobile() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

function initAdminSidebarState() {
  const saved = localStorage.getItem('aris_admin_sidebar_collapsed');
  const sidebar = document.getElementById('adminSidebar');
  // Por defecto, colapsado al nivel de iconos para abrir de izquierda a derecha con fluidez
  const isCollapsed = (saved === null || saved === '1') && window.innerWidth > 768;
  if (sidebar) {
    sidebar.classList.toggle('collapsed', isCollapsed);
  }
  document.body.classList.toggle('sidebar-collapsed', isCollapsed);
  updateSidebarToggleButtons(isCollapsed);
  updateSidebarAdminProfile();
}

function getAdminUser() {
  try {
    const raw = localStorage.getItem('aris_current_user');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  try {
    const token = window.ArisAuth && window.ArisAuth.getToken();
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return {
          name: payload.name || payload.username || 'Alfonso Navarro',
          email: payload.email || 'alfonsonavarroch@gmail.com',
          role: payload.role || 'admin'
        };
      }
    }
  } catch (_) {}
  return { name: 'Alfonso Navarro', email: 'alfonsonavarroch@gmail.com', role: 'admin' };
}

function updateSidebarAdminProfile(overrideUser) {
  const user = overrideUser || getAdminUser();
  if (user) {
    const nameEl = document.getElementById('sidebarAdminName');
    const emailEl = document.getElementById('sidebarAdminEmail');
    const miniEl = document.getElementById('sidebarAdminAvatarMini');
    if (nameEl && user.name) nameEl.textContent = user.name;
    if (emailEl && user.email) emailEl.textContent = user.email;
    if (miniEl && user.name) {
      const initials = user.name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
      if (initials) miniEl.textContent = initials;
    }
  }
}

function updateHubAdminProfile(overrideUser) {
  const user = overrideUser || getAdminUser();
  if (user) {
    const nameEl = document.getElementById('hubAdminName');
    const emailEl = document.getElementById('hubAdminEmail');
    const avatarEl = document.getElementById('hubAdminAvatarText');
    if (nameEl && user.name) nameEl.textContent = user.name;
    if (emailEl && user.email) emailEl.textContent = user.email;
    if (avatarEl && user.name) {
      const initials = user.name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
      if (initials) avatarEl.textContent = initials;
    }
  }
}

async function fetchAdminProfile() {
  try {
    if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
      const res = await window.ArisAuth.fetchWithAuth('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        const user = data.user || data;
        if (user) {
          localStorage.setItem('aris_current_user', JSON.stringify(user));
          updateHubAdminProfile(user);
          updateSidebarAdminProfile(user);
        }
      }
    }
  } catch (_) {}
}

function updateHubBadges() {
  if (adminDataCache.orders && adminDataCache.orders.data) {
    const count = adminDataCache.orders.data.length;
    const el = document.getElementById('hubDashboardBadge');
    if (el) el.textContent = `${count} pedidos en total`;
    const quickOrders = document.getElementById('hubQuickOrdersCount');
    if (quickOrders) quickOrders.textContent = count;
  }
  if (adminDataCache.sales && adminDataCache.sales.data) {
    const count = adminDataCache.sales.data.length;
    const el = document.getElementById('hubVentasBadge');
    if (el) el.textContent = `${count} ventas registradas`;
    const quickSales = document.getElementById('hubQuickSalesCount');
    if (quickSales) quickSales.textContent = count;
  }
  if (adminDataCache.products && adminDataCache.products.data) {
    const count = adminDataCache.products.data.length;
    const el = document.getElementById('hubProductosBadge');
    if (el) el.textContent = `${count} productos en stock`;
    const quickProducts = document.getElementById('hubQuickProductsCount');
    if (quickProducts) quickProducts.textContent = count;
  }
}

function selectAdminTab(tabName) {
  currentAdminTab = tabName;
  const tabs = {
    dashboard: { id: 'adminTabDashboard', navId: 'sideNavDashboard', title: 'Dashboard Ejecutivo de Métricas', sub: 'Panel de analítica visual e indicadores clave de rendimiento (KPIs) en tiempo real' },
    ventas: { id: 'adminTabVentas', navId: 'sideNavVentas', title: 'Ventas, Comprobantes & Facturación', sub: 'Historial de ventas completadas, comprobantes de pago y emisión de facturas' },
    productos: { id: 'adminTabProductos', navId: 'sideNavProductos', title: 'Gestión de Productos', sub: 'Catálogo e inventario de productos en Supabase' },
    cupones: { id: 'adminTabCupones', navId: 'sideNavCupones', title: 'Cupones & Fidelidad', sub: 'Auditoría de puntos, bonos y emisión de cupones de 90 días' },
    clientes: { id: 'adminTabClientes', navId: 'sideNavClientes', title: 'Clientes & Rangos de XP', sub: 'Directorio de usuarios, niveles y comportamiento de compra' },
    configuracion: { id: 'adminTabConfig', navId: 'sideNavConfig', title: 'Configuración del Sistema', sub: 'Parámetros maestros, llaves JWT y ajustes de infraestructura' }
  };

  // En dispositivos móviles, cerrar el drawer lateral al navegar
  if (window.innerWidth <= 768) {
    closeAdminSidebarMobile();
  }

  // Persistir la pestaña en el hash de la URL sin recargar la página
  if (window.location.hash !== `#${tabName}`) {
    window.history.replaceState(null, '', `#${tabName}`);
  }

  // Ocultar todos los módulos y desmarcar enlaces del sidebar
  Object.keys(tabs).forEach(k => {
    const tabEl = document.getElementById(tabs[k].id);
    const navEl = document.getElementById(tabs[k].navId);
    if (tabEl) {
      tabEl.style.display = 'none';
      tabEl.classList.remove('admin-tab-pane');
    }
    if (navEl) navEl.classList.remove('active');
  });

  // Mostrar módulo seleccionado con animación suave de entrada
  const selected = tabs[tabName] || tabs.dashboard;
  const activeTabEl = document.getElementById(selected.id);
  const activeNavEl = document.getElementById(selected.navId);
  const titleEl = document.getElementById('adminModuleTitle');
  const subEl = document.getElementById('adminModuleSubtitle');

  if (activeTabEl) {
    activeTabEl.style.display = 'block';
    void activeTabEl.offsetWidth; // Forzar reflow para animación suave
    activeTabEl.classList.add('admin-tab-pane');
  }
  if (activeNavEl) activeNavEl.classList.add('active');
  if (titleEl) titleEl.textContent = selected.title;
  if (subEl) subEl.textContent = selected.sub;

  // Comprobar si tenemos caché cálido para render instantáneo (0ms)
  const isWarm = (tabName === 'dashboard' && isCacheValid('orders')) ||
                 (tabName === 'ventas' && isCacheValid('sales')) ||
                 (tabName === 'productos' && isCacheValid('products'));

  const delay = isWarm ? 0 : 50;
  setTimeout(() => {
    if (tabName === 'dashboard') loadAdminOrders();
    if (tabName === 'ventas') loadAdminSales();
    if (tabName === 'productos') loadAdminProducts();
  }, delay);
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
  if (currentAdminTab === 'dashboard') loadAdminOrders(true);
  else if (currentAdminTab === 'ventas') loadAdminSales(true);
  else if (currentAdminTab === 'productos') loadAdminProducts(true);
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

  // Inicializar estado del sidebar (colapsado o expandido según preferencia guardada)
  initAdminSidebarState();
  updateSidebarAdminProfile();
  fetchAdminProfile();

  // Leer la pestaña activa guardada en la URL hash o abrir por defecto el Dashboard
  const hashTab = window.location.hash.replace('#', '').split('/')[0];
  const validTabs = ['dashboard', 'ventas', 'productos', 'cupones', 'clientes', 'configuracion'];
  const targetTab = (hashTab && validTabs.includes(hashTab)) ? hashTab : 'dashboard';

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
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.status === 404) {
      errEl.innerHTML = 'El backend no está desplegado en este host estático.<br>Para gestionar el panel admin, ingresa en: <a href="http://localhost:3005/src/pages/admin.html" style="color:#38bdf8; text-decoration:underline;">http://localhost:3005/src/pages/admin.html</a>';
      errEl.style.display = 'block';
      return;
    }

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

async function autoLoginAdmin() {
  const emailInput = document.getElementById('adminLoginEmail');
  const passInput = document.getElementById('adminLoginPassword');
  if (emailInput) emailInput.value = 'alfonsonavarroch@gmail.com';
  if (passInput) passInput.value = 'admin123';
  const fakeEvent = { preventDefault: () => {} };
  await handleAdminLoginSubmit(fakeEvent);
}

function logoutAdmin() {
  window.ArisAuth.removeToken();
  showAdminAuth();
}

async function loadAdminOrders(forceRefresh = false) {
  const tbody = document.getElementById('adminOrdersTableBody');

  // 1. Si tenemos datos en caché, renderizar de inmediato (0ms sin esperas ni parpadeos)
  if (adminDataCache.orders.data) {
    renderAdminOrdersDOM(adminDataCache.orders.data);
    if (!forceRefresh && isCacheValid('orders')) {
      return;
    }
  } else if (tbody && (!tbody.children || tbody.children.length === 0)) {
    // Mostrar skeleton elegante en primera carga
    tbody.innerHTML = `
      <tr><td colspan="5"><div class="admin-skeleton-row"></div></td></tr>
      <tr><td colspan="5"><div class="admin-skeleton-row"></div></td></tr>
      <tr><td colspan="5"><div class="admin-skeleton-row"></div></td></tr>
    `;
  }

  try {
    const res = await window.ArisAuth.fetchWithAuth('/api/orders?limit=50');
    if (!res.ok) throw new Error('No autorizado');

    const data = await res.json();
    const orders = data.orders || [];

    // Guardar en caché SWR
    adminDataCache.orders = { data: orders, timestamp: Date.now() };
    updateHubBadges();

    renderAdminOrdersDOM(orders);
  } catch (err) {
    if (tbody && !adminDataCache.orders.data) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#f43f5e; padding:24px;">Error cargando órdenes. Inicia sesión nuevamente.</td></tr>`;
    }
  }
}

function renderAdminOrdersDOM(orders) {
  const tbody = document.getElementById('adminOrdersTableBody');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

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
        productMap[it.name] = (productMap[it.name] || 0) + (it.qty || 1) * (it.unitPrice || it.price || 0);
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
              <span style="color:var(--white); font-weight:600;">${escapeHTML(pName)}</span>
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
            <div style="font-weight:600; color:var(--white); font-size:0.85rem;">${escapeHTML(c.name)}</div>
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
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--ash); padding:24px;">No hay órdenes registradas aún en Supabase.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td style="font-family:'DM Mono',monospace; font-weight:700; color:#38bdf8;">#${escapeHTML(o.orderId)}</td>
        <td>${escapeHTML(o.name || 'Cliente')}</td>
        <td style="font-weight:700;">${format(o.total || 0)}</td>
        <td style="color:var(--ash); font-size:0.8rem;">${new Date(o.createdAt || Date.now()).toLocaleDateString('es-CO')}</td>
        <td>
          <select class="status-select" onchange="changeOrderStatus('${escapeHTML(o.orderId)}', this.value)">
            <option value="PENDING" ${o.status === 'PENDING' ? 'selected' : ''}>1. Recibido</option>
            <option value="CONFIRMED" ${o.status === 'CONFIRMED' ? 'selected' : ''}>2. Confirmado</option>
            <option value="SHIPPED" ${o.status === 'SHIPPED' ? 'selected' : ''}>3. En Camino</option>
            <option value="DELIVERED" ${o.status === 'DELIVERED' ? 'selected' : ''}>4. Entregado</option>
          </select>
        </td>
      </tr>
    `).join('');
  }
}

async function loadAdminSales(forceRefresh = false) {
  const tbody = document.getElementById('adminSalesTableBody');

  // 1. Si tenemos datos en caché, renderizar de inmediato (0ms sin esperas ni parpadeos)
  if (adminDataCache.sales.data) {
    renderAdminSalesDOM(adminDataCache.sales.data);
    if (!forceRefresh && isCacheValid('sales')) {
      return;
    }
  } else if (tbody && (!tbody.children || tbody.children.length === 0)) {
    // Mostrar skeleton elegante en primera carga
    tbody.innerHTML = `
      <tr><td colspan="8"><div class="admin-skeleton-row"></div></td></tr>
      <tr><td colspan="8"><div class="admin-skeleton-row"></div></td></tr>
      <tr><td colspan="8"><div class="admin-skeleton-row"></div></td></tr>
    `;
  }

  try {
    const res = await window.ArisAuth.fetchWithAuth('/api/sales?limit=50');
    if (!res.ok) throw new Error('Error al cargar ventas');

    const data = await res.json();
    const sales = data.sales || [];
    currentSalesData = sales;

    // Guardar en caché SWR
    adminDataCache.sales = { data: sales, timestamp: Date.now() };
    updateHubBadges();

    renderAdminSalesDOM(sales);
  } catch (err) {
    if (tbody && !adminDataCache.sales.data) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#f43f5e; padding:24px;">Error de conexión cargando registro de ventas.</td></tr>`;
    }
  }
}

function renderAdminSalesDOM(sales) {
  const tbody = document.getElementById('adminSalesTableBody');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

  const totalFacturado = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const verifiedCount = sales.filter(s => s.receiptStatus === 'VERIFICADO').length;

  const totalEl = document.getElementById('metricSalesTotal');
  const invoiceCountEl = document.getElementById('metricInvoiceCount');
  const receiptCountEl = document.getElementById('metricReceiptCount');

  if (totalEl) totalEl.textContent = format(totalFacturado);
  if (invoiceCountEl) invoiceCountEl.textContent = sales.length;
  if (receiptCountEl) receiptCountEl.textContent = verifiedCount;

  if (!tbody) return;

  if (sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--ash); padding:24px;">No hay ventas registradas en el sistema.</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map(s => `
    <tr>
      <td style="font-family:'DM Mono',monospace; font-weight:700; color:#38bdf8;">${escapeHTML(s.invoiceNumber)}</td>
      <td style="font-family:'DM Mono',monospace; font-size:0.85rem; color:var(--ash);">${escapeHTML(s.orderId)}</td>
      <td>
        <div style="font-weight:600; color:var(--white);">${escapeHTML(s.clientName)}</div>
        <div style="font-size:0.75rem; color:var(--ash); font-family:'DM Mono',monospace;">NIT: ${escapeHTML(s.clientNit)}</div>
      </td>
      <td style="font-size:0.85rem;">${escapeHTML(s.paymentMethod)}</td>
      <td style="font-weight:700; font-family:'DM Mono',monospace;">${format(s.total)}</td>
      <td>
        <span style="font-family:'DM Mono',monospace; font-size:0.72rem; background:rgba(63,231,184,0.15); color:#3fe7b8; padding:3px 8px; border-radius:6px; border:1px solid rgba(63,231,184,0.3);">
          ${escapeHTML(s.receiptCode)}
        </span>
      </td>
      <td>
        <span style="font-family:'DM Mono',monospace; font-size:0.72rem; background:rgba(56,189,248,0.15); color:#38bdf8; padding:3px 8px; border-radius:6px;">
          ${escapeHTML(s.status)}
        </span>
      </td>
      <td>
        <button onclick="viewInvoiceDetail('${escapeHTML(s.id)}')" class="btn-ghost" style="padding:6px 12px; font-size:0.75rem; cursor:pointer;">
          📄 Ver Factura
        </button>
      </td>
    </tr>
  `).join('');
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
      <td style="padding:10px; border-bottom:1px solid var(--graphite); color:var(--white); font-weight:500;">${escapeHTML(i.name)}</td>
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
          <div style="font-family:'DM Mono',monospace; font-size:1.4rem; font-weight:700; color:#38bdf8;">${escapeHTML(sale.invoiceNumber)}</div>
          <div style="font-size:0.8rem; color:var(--ash); margin-top:4px;">Orden de Referencia: <strong>${escapeHTML(sale.orderId)}</strong></div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash); text-transform:uppercase;">Fecha de Emisión</div>
          <div style="font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:600; color:var(--white);">${new Date(sale.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div style="margin-top:4px;">
            <span style="font-family:'DM Mono',monospace; font-size:0.7rem; background:rgba(63,231,184,0.15); color:#3fe7b8; padding:3px 8px; border-radius:6px; border:1px solid rgba(63,231,184,0.3);">
              Comprobante Verificado (${escapeHTML(sale.receiptCode)})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- DATOS DEL CLIENTE -->
    <div style="margin-bottom:20px;">
      <div style="font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">Datos del Cliente</div>
      <div style="background:var(--jet); border:1px solid var(--graphite); border-radius:12px; padding:14px 18px; font-size:0.9rem;">
        <div style="color:var(--white); font-weight:700;">${escapeHTML(sale.clientName)}</div>
        <div style="color:var(--ash); font-family:'DM Mono',monospace; font-size:0.8rem; margin-top:2px;">Correo: ${escapeHTML(sale.clientEmail)} · NIT/CC: ${escapeHTML(sale.clientNit)}</div>
        <div style="color:var(--ash); font-size:0.8rem; margin-top:4px;">Método de Pago: <span style="color:#38bdf8; font-weight:600;">${escapeHTML(sale.paymentMethod)}</span></div>
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
    const res = await window.ArisAuth.fetchWithAuth(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      console.log(`⚡ Estado de orden #${orderId} cambiado a: ${newStatus}`);
      broadcastTabSync('orders');
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
    const res = await window.ArisAuth.fetchWithAuth('/api/products', {
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
      succEl.textContent = '✅ Producto registrado exitosamente en la Base de Datos';
      succEl.style.display = 'block';
    }

    setTimeout(() => {
      showProductSubView('list');
      loadAdminProducts(true);
      broadcastTabSync('products');
    }, 1000);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Error al conectar con el servidor';
      errEl.style.display = 'block';
    }
  }
}

let currentProductsData = [];

async function loadAdminProducts(forceRefresh = false) {
  const tbody = document.getElementById('adminProductsTableBody');

  // 1. Si tenemos datos en caché, renderizar de inmediato (0ms sin esperas ni parpadeos)
  if (adminDataCache.products.data) {
    renderAdminProductsDOM(adminDataCache.products.data);
    if (!forceRefresh && isCacheValid('products')) {
      return;
    }
  } else if (tbody && (!tbody.children || tbody.children.length === 0)) {
    // Skeleton elegante en primera carga
    tbody.innerHTML = `
      <tr><td colspan="11"><div class="admin-skeleton-row"></div></td></tr>
      <tr><td colspan="11"><div class="admin-skeleton-row"></div></td></tr>
      <tr><td colspan="11"><div class="admin-skeleton-row"></div></td></tr>
    `;
  }

  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) throw new Error('Error cargando catálogo');

    const data = await res.json();
    const products = data.products || [];
    currentProductsData = products;

    // Guardar en caché SWR
    adminDataCache.products = { data: products, timestamp: Date.now() };
    updateHubBadges();

    renderAdminProductsDOM(products);
  } catch (err) {
    if (tbody && !adminDataCache.products.data) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#f43f5e; padding:24px;">Error al cargar catálogo de productos.</td></tr>`;
    }
  }
}

function renderAdminProductsDOM(products) {
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const valuation = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  const countEl = document.getElementById('prodMetricCount');
  const stockEl = document.getElementById('prodMetricStock');
  const valEl = document.getElementById('prodMetricValuation');

  if (countEl) countEl.textContent = products.length;
  if (stockEl) stockEl.textContent = totalStock;
  if (valEl) valEl.textContent = format(valuation);

  renderProductsTable(products);
}

function renderProductsTable(products) {
  const tbody = document.getElementById('adminProductsTableBody');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--ash); padding:28px;">No se encontraron productos coincidentes en la base de datos.</td></tr>`;
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
            <img src="${sanitizeURL(p.image) || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'}" alt="${escapeHTML(p.name)}" style="width:44px; height:44px; object-fit:cover; border-radius:8px; border:1px solid var(--graphite);" />
            ${hasMoreImg ? `<span style="position:absolute; bottom:-4px; right:-4px; font-family:'DM Mono',monospace; font-size:0.6rem; background:#38bdf8; color:#000; font-weight:700; padding:1px 3px; border-radius:4px;" title="Galería secundaria incluida">+${p.additionalImages.length}</span>` : ''}
          </div>
        </td>
        <td>
          <div style="font-weight:700; color:var(--white);">${escapeHTML(p.name)}</div>
          <div style="font-family:'DM Mono',monospace; font-size:0.72rem; color:#38bdf8;">ID: ${escapeHTML(p.id)}</div>
        </td>
        <td>
          <span style="font-family:'DM Mono',monospace; font-size:0.75rem; background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:3px 8px; border-radius:10px;">${escapeHTML(p.category || 'General')}</span>
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
            ● ${escapeHTML(p.status || 'Activo')}
          </span>
        </td>
        <td>
          ${p.badge 
            ? `<span style="font-family:'DM Mono',monospace; font-size:0.72rem; background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3); padding:3px 8px; border-radius:10px;">${escapeHTML(p.badge)}</span>` 
            : '<span style="color:rgba(255,255,255,0.2);">-</span>'}
        </td>
        <td style="color:var(--ash); font-size:0.8rem; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHTML(p.description || '')}">
          ${escapeHTML(p.description || 'Sin descripción')}
        </td>
        <td style="color:var(--ash); font-size:0.8rem; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHTML(p.features || '')}">
          ${escapeHTML(p.features || 'Sin características')}
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button onclick="openEditProductPage('${escapeHTML(p.id)}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; cursor:pointer;" title="Editar producto">✏️ Editar</button>
            <button onclick="toggleProductStatus('${escapeHTML(p.id)}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; cursor:pointer; color:#f59e0b; border-color:rgba(245,158,11,0.3);" title="Cambiar visibilidad">${isHidden ? '👁️ Mostrar' : '🙈 Ocultar'}</button>
            <button onclick="duplicateProduct('${escapeHTML(p.id)}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; cursor:pointer; color:#a855f7; border-color:rgba(168,85,247,0.3);" title="Duplicar ítem">📋 Duplicar</button>
            <button onclick="deleteProduct('${escapeHTML(p.id)}')" class="btn-ghost" style="padding:4px 8px; font-size:0.72rem; color:#f43f5e; border-color:rgba(244,63,94,0.3); cursor:pointer;" title="Eliminar producto">🗑️ Eliminar</button>
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
    const res = await window.ArisAuth.fetchWithAuth(`/api/products/${encodeURIComponent(id)}/toggle-status`, {
      method: 'PATCH'
    });

    if (res.ok) {
      loadAdminProducts(true);
      broadcastTabSync('products');
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
    const res = await window.ArisAuth.fetchWithAuth(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name, category, price, originalPrice, stock, status, badge, image,
        additionalImages: addImage ? [addImage] : [],
        description, features
      })
    });

    if (!res.ok) throw new Error('Error al actualizar el producto');

    if (succEl) {
      succEl.textContent = '✅ Producto actualizado exitosamente en la Base de Datos';
      succEl.style.display = 'block';
    }

    setTimeout(() => {
      showProductSubView('list');
      loadAdminProducts(true);
      loadAdminOrders(true);
      broadcastTabSync('products');
    }, 1000);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Error al conectar con el servidor';
      errEl.style.display = 'block';
    }
  }
}

async function deleteProduct(id) {
  if (!confirm(`¿Estás seguro de eliminar permanentemente el producto #${id} del catálogo?`)) return;

  try {
    const res = await window.ArisAuth.fetchWithAuth(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      loadAdminProducts(true);
      loadAdminOrders(true);
      broadcastTabSync('products');
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
window.toggleAdminSidebar = toggleAdminSidebar;
window.closeAdminSidebarMobile = closeAdminSidebarMobile;
window.initAdminSidebarState = initAdminSidebarState;
window.updateSidebarAdminProfile = updateSidebarAdminProfile;
window.selectAdminTab = selectAdminTab;
window.updateDashboardTimeframe = updateDashboardTimeframe;
window.refreshCurrentAdminModule = refreshCurrentAdminModule;
window.handleAdminLoginSubmit = handleAdminLoginSubmit;
window.autoLoginAdmin = autoLoginAdmin;
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
window.updateHubAdminProfile = updateHubAdminProfile;
window.updateHubBadges = updateHubBadges;
