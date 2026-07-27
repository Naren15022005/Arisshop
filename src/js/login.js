// Lógica de Autenticación de Usuario (Login & Register) con JWT

document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
});

function checkAuthStatus() {
  if (window.ArisAuth && window.ArisAuth.isAuthenticated()) {
    window.location.href = '/src/pages/profile.html';
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errBox = document.getElementById('loginErrorMsg');
  const succBox = document.getElementById('loginSuccessMsg');

  if (errBox) errBox.style.display = 'none';
  if (succBox) succBox.style.display = 'none';

  try {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      if (errBox) {
        errBox.textContent = data.error || 'Error al ingresar.';
        errBox.style.display = 'block';
      }
      return;
    }

    // Almacenar token JWT
    window.ArisAuth.setToken(data.token);
    if (succBox) {
      succBox.textContent = '¡Sesión iniciada con éxito!';
      succBox.style.display = 'block';
    }

    setTimeout(() => {
      window.location.href = '/src/pages/profile.html';
    }, 600);
  } catch (err) {
    if (errBox) {
      errBox.textContent = 'Error de conexión con el servidor.';
      errBox.style.display = 'block';
    }
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const errBox = document.getElementById('regErrorMsg');
  const succBox = document.getElementById('regSuccessMsg');

  if (errBox) errBox.style.display = 'none';
  if (succBox) succBox.style.display = 'none';

  try {
    const res = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      if (errBox) {
        errBox.textContent = data.error || 'Error al registrar usuario.';
        errBox.style.display = 'block';
      }
      return;
    }

    window.ArisAuth.setToken(data.token);
    if (succBox) {
      succBox.textContent = '¡Cuenta registrada con éxito!';
      succBox.style.display = 'block';
    }

    setTimeout(() => {
      window.location.href = '/src/pages/profile.html';
    }, 600);
  } catch (err) {
    if (errBox) {
      errBox.textContent = 'Error de conexión con el servidor.';
      errBox.style.display = 'block';
    }
  }
}

async function fetchProfileData() {
  const formContainer = document.getElementById('loginFormContainer');
  const profileContainer = document.getElementById('profileContainer');

  try {
    const res = await window.ArisAuth.fetchWithAuth('http://localhost:3001/api/auth/me');
    if (!res.ok) {
      window.ArisAuth.removeToken();
      if (formContainer) formContainer.style.display = 'block';
      if (profileContainer) profileContainer.style.display = 'none';
      return;
    }

    const data = await res.json();
    if (formContainer) formContainer.style.display = 'none';
    if (profileContainer) profileContainer.style.display = 'block';

    const pName = document.getElementById('profileName');
    const pEmail = document.getElementById('profileEmail');

    if (pName) pName.textContent = data.user.name || 'Mi Perfil';
    if (pEmail) pEmail.textContent = data.user.email || '';
  } catch (err) {
    if (formContainer) formContainer.style.display = 'block';
    if (profileContainer) profileContainer.style.display = 'none';
  }
}

function handleLogoutClick() {
  window.ArisAuth.removeToken();
  window.location.reload();
}

window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.handleLogoutClick = handleLogoutClick;
