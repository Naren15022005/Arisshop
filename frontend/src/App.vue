<script setup>
import { onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import CartDrawer from './components/CartDrawer.vue'
import ToastNotifications from './components/ToastNotifications.vue'
import { useSocketStore } from './stores/socket'
import { useAuthStore } from './stores/auth'

const socketStore = useSocketStore()
const authStore = useAuthStore()

onMounted(() => {
  // Conectar WebSockets en tiempo real
  socketStore.connect()
  // Validar sesión si existe token
  authStore.fetchMe()
})
</script>

<template>
  <div class="app-layout">
    <Navbar />

    <main class="main-content">
      <router-view />
    </main>

    <CartDrawer />
    <ToastNotifications />

    <!-- Footer -->
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-col brand-col">
          <div class="footer-logo">ARIS<span>SHOP</span></div>
          <p>
            Plataforma líder en tecnología de alto nivel, periféricos gaming y audio pro en Colombia.
            Construido con Go y Vue 3 para una velocidad y estabilidad sin precedentes.
          </p>
          <div class="social-links">
            <a href="https://instagram.com" target="_blank" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://facebook.com" target="_blank" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
            <a href="https://tiktok.com" target="_blank" aria-label="TikTok"><i class="fa-brands fa-tiktok"></i></a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Colecciones</h4>
          <ul>
            <li><router-link to="/catalogo?category=Gaming Setup">Gaming Setup</router-link></li>
            <li><router-link to="/catalogo?category=Audio Pro">Audio Pro</router-link></li>
            <li><router-link to="/catalogo?category=Accesorios Celulares">Accesorios Celulares</router-link></li>
            <li><router-link to="/catalogo?category=Accesorios Streaming">Streaming Setup</router-link></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Atención al Cliente</h4>
          <ul>
            <li><a href="https://wa.me/573000000000" target="_blank">WhatsApp Directo</a></li>
            <li><router-link to="/catalogo">Preguntas Frecuentes</router-link></li>
            <li><router-link to="/catalogo">Políticas de Garantía</router-link></li>
            <li><router-link to="/login">Acceso Clientes / Admin</router-link></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Medios de Pago</h4>
          <p class="payment-desc">Transferencias seguras e inmediatas:</p>
          <div class="payment-tags">
            <span>Nequi</span>
            <span>Bancolombia</span>
            <span>Daviplata</span>
            <span>Contraentrega</span>
          </div>
        </div>
      </div>

      <div class="footer-bottom container">
        <span>© 2026 ArisShop. Todos los derechos reservados. Desarrollado con Golang + Vue 3.</span>
        <div class="server-status-pill">
          <span class="status-pulse"></span>
          <span>Core Go Engine v2.0 Activo</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
}

.site-footer {
  background: #0e1013;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 60px 0 30px;
  margin-top: 80px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
  gap: 40px;
  margin-bottom: 50px;
}

.brand-col p {
  color: var(--ash);
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 14px 0 20px;
}

.footer-logo {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--white);
  letter-spacing: 0.1em;
}
.footer-logo span {
  color: var(--accent);
}

.social-links {
  display: flex;
  gap: 12px;
}
.social-links a {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--platinum);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  text-decoration: none;
}
.social-links a:hover {
  background: var(--white);
  color: #0f172a;
}

.footer-col h4 {
  font-family: var(--font-heading);
  font-size: 1rem;
  color: var(--white);
  margin-bottom: 16px;
}
.footer-col ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-col ul a {
  color: var(--ash);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s;
}
.footer-col ul a:hover {
  color: var(--accent);
}

.payment-desc {
  font-size: 0.82rem;
  color: var(--ash);
  margin-bottom: 12px;
}
.payment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.payment-tags span {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--platinum);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 6px;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: #71717a;
  font-size: 0.78rem;
  flex-wrap: wrap;
  gap: 14px;
}

.server-status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.2);
  padding: 4px 12px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: #38bdf8;
}

.status-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 600px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
