// Socket.io & JWT Client helper for ArisShop

(function() {
  let SERVER_URL = (window.ARIS_CONFIG && window.ARIS_CONFIG.API_URL) || 'http://localhost:3005';
  if (SERVER_URL.includes('machines-infectious')) {
    SERVER_URL = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
      ? window.location.origin
      : 'https://mph-seven-edit-additionally.trycloudflare.com';
  }
  let socket = null;

  // JWT Helper methods
  const ArisAuth = {
    baseUrl: SERVER_URL,
    apiUrl(path) {
      if (!path) return SERVER_URL;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      return `${SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    },
    setToken(token) {
      localStorage.setItem('aris_jwt_token', token);
    },
    getToken() {
      return localStorage.getItem('aris_jwt_token');
    },
    removeToken() {
      localStorage.removeItem('aris_jwt_token');
    },
    isAuthenticated() {
      return !!this.getToken();
    },
    async logout() {
      try {
        await fetch(this.apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {})
          },
          credentials: 'include'
        });
      } catch (e) {
        // En caso de fallo de red, se procede con la limpieza local
      } finally {
        this.removeToken();
        localStorage.removeItem('aris_current_user');
      }
    },
    async fetchWithAuth(url, options = {}) {
      const fullUrl = this.apiUrl(url);
      const token = this.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include' // Envía automáticamente la cookie HttpOnly aris_token
      });
      if (response.status === 401 || response.status === 403) {
        this.removeToken();
      }
      return response;
    }
  };

  // Inicializar cliente WebSocket con fallback tolerante a fallos
  function initWebSocket() {
    if (typeof io === 'undefined') return;

    try {
      socket = io(SERVER_URL, {
        transports: ['polling', 'websocket'], // Prioriza polling para evitar errores nativos de handshake en CDNs y escala a WebSocket
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 2, // Intentos controlados para no saturar memoria ni consola
        reconnectionDelay: 2500,
        reconnectionDelayMax: 6000,
        timeout: 4000
      });

      socket.on('connect', () => {
        console.log('⚡ Conectado al canal en tiempo real de ArisShop.');
        window.dispatchEvent(new CustomEvent('aris:socket:connect'));
      });

      socket.on('reconnect', (attempt) => {
        console.log(`⚡ Reconectado al canal en tiempo real (intento #${attempt})`);
        window.dispatchEvent(new CustomEvent('aris:socket:reconnect', { detail: { attempt } }));
      });

      socket.on('connect_error', () => {
        // Manejo silencioso: en entornos estáticos sin backend activo, detener reconexiones continuas
        if (socket && socket.io && socket.io.opts && socket.io.opts.reconnectionAttempts <= 1) {
          socket.disconnect();
        }
      });

      // Escuchar notificaciones de nuevas compras en tiempo real
      socket.on('order:new', (data) => {
        showLivePurchaseToast(data);
        window.dispatchEvent(new CustomEvent('aris:order:new', { detail: data }));
      });

      // Escuchar cambios de estado de pedidos en tiempo real
      socket.on('order:status', (data) => {
        window.dispatchEvent(new CustomEvent('aris:order:status', { detail: data }));
      });

      // Escuchar cambios de stock en tiempo real
      socket.on('stock:update', (data) => {
        console.log('⚡ Actualización de stock en tiempo real:', data);
        const stockEl = document.getElementById(`stock-${data.productId}`);
        if (stockEl) {
          stockEl.textContent = `Stock: ${data.newStock}`;
        }
        window.dispatchEvent(new CustomEvent('aris:stock:update', { detail: data }));
      });
    } catch (e) {
      console.warn('Servidor WebSocket no disponible offline.');
    }
  }

  // Cola FIFO y Throttling para notificaciones de compra en vivo
  const purchaseToastQueue = [];
  let isToastDisplaying = false;

  function processPurchaseToastQueue() {
    if (isToastDisplaying || purchaseToastQueue.length === 0) return;
    isToastDisplaying = true;
    const data = purchaseToastQueue.shift();

    let toast = document.getElementById('livePurchaseToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'livePurchaseToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(56, 189, 248, 0.3);
        color: #fff;
        padding: 14px 20px;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.85rem;
        backdrop-filter: blur(12px);
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
      `;
      document.body.appendChild(toast);
    }

    const escape = window.escapeHTML || (str => String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]));
    const safeName = escape(data.name || 'Un cliente');

    toast.innerHTML = `
      <span style="font-size: 1.3rem;">🛍️</span>
      <div>
        <div style="font-weight: 700; color: #38bdf8;">¡Nueva compra en vivo!</div>
        <div style="color: #cbd5e1;">${safeName} acaba de realizar un pedido.</div>
      </div>
    `;

    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => {
        isToastDisplaying = false;
        processPurchaseToastQueue();
      }, 400); // 400ms de transición fluida antes de la siguiente notificación
    }, 3500);
  }

  function showLivePurchaseToast(data) {
    if (!data) return;
    // Si hay más de 5 en espera, descartar el más viejo para prevenir saturación de memoria
    if (purchaseToastQueue.length >= 5) {
      purchaseToastQueue.shift();
    }
    purchaseToastQueue.push(data);
    processPurchaseToastQueue();
  }

  // Notificar emisión de pedido al servidor WebSocket
  function emitOrderPlaced(orderData) {
    if (socket && socket.connected) {
      socket.emit('order:place', orderData);
    }
  }

  // Exponer a scope global
  window.ArisAuth = ArisAuth;
  window.emitOrderPlaced = emitOrderPlaced;

  // Actualizar icono de usuario en el menú según el estado de la sesión
  function updateNavUserIcon() {
    const userBtns = document.querySelectorAll('.nav-icon[title="Usuario"], .nav-btn[title="Usuario"]');
    const authenticated = ArisAuth.isAuthenticated();

    userBtns.forEach(btn => {
      btn.style.position = 'relative';
      let dot = btn.querySelector('.auth-active-dot');

      if (authenticated) {
        btn.setAttribute('title', 'Mi Perfil (Sesión Activa)');
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'auth-active-dot';
          dot.style.cssText = 'position:absolute; top:4px; right:4px; width:8px; height:8px; background:#3fe7b8; border-radius:50%; box-shadow:0 0 8px #3fe7b8;';
          btn.appendChild(dot);
        }
        btn.onclick = (e) => {
          e.preventDefault();
          window.location.href = '/src/pages/profile.html';
        };
      } else {
        btn.setAttribute('title', 'Iniciar Sesión');
        if (dot) dot.remove();
        btn.onclick = (e) => {
          e.preventDefault();
          window.location.href = '/src/pages/login.html';
        };
      }
    });
  }

  // Cargar Socket.io CDN de forma diferida en el cliente
  document.addEventListener('DOMContentLoaded', () => {
    updateNavUserIcon();
    const s = document.createElement('script');
    s.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    s.onload = initWebSocket;
    document.head.appendChild(s);
  });
})();
