// Lógica de Perfil del Cliente protegida por JWT

document.addEventListener('DOMContentLoaded', () => {
  enforceActiveSession();
});

async function enforceActiveSession() {
  if (!window.ArisAuth || !window.ArisAuth.isAuthenticated()) {
    // Si no tiene sesión activa, redirigir obligatoriamente a login.html
    window.location.href = '/src/pages/login.html';
    return;
  }

  try {
    const res = await window.ArisAuth.fetchWithAuth('http://localhost:3001/api/auth/me');
    if (!res.ok) {
      window.ArisAuth.removeToken();
      window.location.href = '/src/pages/login.html';
      return;
    }

    const data = await res.json();
    const user = data.user;

    document.getElementById('userName').textContent = user.name || 'Mi Perfil';
    document.getElementById('userEmail').textContent = user.email || '';

    loadUserOrders(user.email);
  } catch (err) {
    window.location.href = '/src/pages/login.html';
  }
}

async function loadUserOrders(userEmail) {
  const listBox = document.getElementById('userOrdersList');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

  try {
    const res = await window.ArisAuth.fetchWithAuth('http://localhost:3001/api/orders');
    if (!res.ok) throw new Error('Error buscando órdenes');

    const data = await res.json();
    const allOrders = data.orders || [];

    // Filtrar órdenes pertenecientes a este usuario por correo
    const userOrders = allOrders.filter(o => o.email === userEmail);

    if (userOrders.length === 0) {
      listBox.innerHTML = `<div style="text-align:center; color:var(--ash); font-family:'DM Mono',monospace; font-size:0.8rem; padding:12px;">Aún no has realizado compras.</div>`;
      return;
    }

    listBox.innerHTML = userOrders.map(o => `
      <div class="order-item-row">
        <div>
          <div class="order-id">#${o.orderId}</div>
          <div style="font-size:0.75rem; color:var(--ash); font-family:'DM Mono',monospace;">${new Date(o.createdAt || Date.now()).toLocaleDateString('es-CO')}</div>
        </div>
        <div class="order-total">${format(o.total || 0)}</div>
      </div>
    `).join('');
  } catch (err) {
    listBox.innerHTML = `<div style="text-align:center; color:var(--ash); font-family:'DM Mono',monospace; font-size:0.8rem; padding:12px;">Sin compras registradas aún.</div>`;
  }
}

function handleLogout() {
  window.ArisAuth.removeToken();
  window.location.href = '/home.html';
}

window.handleLogout = handleLogout;
