// Socket.io & JWT Client helper for ArisShop

(function() {
  const SERVER_URL = 'http://localhost:3001';
  let socket = null;

  // JWT Helper methods
  const ArisAuth = {
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
    async fetchWithAuth(url, options = {}) {
      const token = this.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        this.removeToken();
      }
      return response;
    }
  };

  // Inicializar cliente WebSocket
  function initWebSocket() {
    if (typeof io === 'undefined') return;

    try {
      socket = io(SERVER_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 3000
      });

      socket.on('connect', () => {
        console.log('⚡ Conectado a WebSockets en tiempo real de ArisShop.');
      });

      // Escuchar notificaciones de nuevas compras en tiempo real
      socket.on('order:new', (data) => {
        showLivePurchaseToast(data);
      });

      // Escuchar cambios de stock en tiempo real
      socket.on('stock:update', (data) => {
        console.log('⚡ Actualización de stock en tiempo real:', data);
        const stockEl = document.getElementById(`stock-${data.productId}`);
        if (stockEl) {
          stockEl.textContent = `Stock: ${data.newStock}`;
        }
      });
    } catch (e) {
      console.warn('Servidor WebSocket no disponible offline.');
    }
  }

  // Mostrar notificación emergente de compra en tiempo real
  function showLivePurchaseToast(data) {
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
        transition: all 0.4s ease;
      `;
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span style="font-size: 1.3rem;">🛍️</span>
      <div>
        <div style="font-weight: 700; color: #38bdf8;">¡Nueva compra en vivo!</div>
        <div style="color: #cbd5e1;">${data.name || 'Un cliente'} acaba de realizar un pedido.</div>
      </div>
    `;

    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 4500);
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
