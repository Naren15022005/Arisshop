// Configuración centralizada para ArisShop Frontend
(function() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Limpiar cualquier túnel obsoleto que haya quedado almacenado en localStorage
  try {
    const cached = localStorage.getItem('aris_custom_backend_url');
    if (cached && (cached.includes('machines-infectious') || cached.includes('trycloudflare.com'))) {
      localStorage.removeItem('aris_custom_backend_url');
    }
  } catch (e) {}

  // Si la página se abre por HTTP/HTTPS (local o túnel), el backend es el mismo origen
  const sameOrigin = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    ? window.location.origin
    : null;

  // Backend activo de producción
  const activeTunnel = 'https://mph-seven-edit-additionally.trycloudflare.com';
  const defaultBackend = sameOrigin || (isLocal ? 'http://localhost:3005' : activeTunnel);

  window.ARIS_CONFIG = Object.assign({
    API_URL: window.__ARIS_API_URL__ || defaultBackend,
    WS_URL: window.__ARIS_WS_URL__ || defaultBackend
  }, window.ARIS_CONFIG || {});
})();
