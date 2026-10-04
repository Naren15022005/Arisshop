<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useSocketStore } from '../stores/socket'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const socketStore = useSocketStore()

const mobileMenuOpen = ref(false)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="navbar-wrapper">
    <nav class="navbar container">
      <!-- Logo -->
      <router-link to="/" class="nav-logo">
        ARIS<span>SHOP</span>
      </router-link>

      <!-- Desktop Links -->
      <ul class="nav-links">
        <li><router-link to="/">Inicio</router-link></li>
        <li><router-link to="/catalogo">Catálogo</router-link></li>
        <li>
          <router-link to="/catalogo?category=Gaming Setup">Gaming Setup</router-link>
        </li>
        <li>
          <router-link to="/catalogo?category=Audio Pro">Audio Pro</router-link>
        </li>
        <li v-if="authStore.isAdmin">
          <router-link to="/admin" class="admin-badge-link">
            <i class="fa-solid fa-shield-halved"></i> Panel Admin
          </router-link>
        </li>
      </ul>

      <!-- Actions -->
      <div class="nav-actions">
        <!-- Live Users Indicator -->
        <div class="live-pill" title="Usuarios explorando ArisShop en tiempo real">
          <span class="live-dot"></span>
          <span class="live-text">{{ socketStore.activeUsers }} en vivo</span>
        </div>

        <!-- Cart Button -->
        <button
          class="nav-icon-btn cart-btn"
          id="btn-cart-toggle"
          @click="cartStore.toggleCart()"
          aria-label="Abrir Carrito"
        >
          <i class="fa-solid fa-bag-shopping"></i>
          <span v-if="cartStore.totalCount > 0" class="cart-badge">
            {{ cartStore.totalCount }}
          </span>
        </button>

        <!-- Auth / Profile -->
        <template v-if="authStore.isAuthenticated">
          <div class="user-menu">
            <span class="user-name">{{ authStore.user?.name?.split(' ')[0] }}</span>
            <button @click="handleLogout" class="logout-btn" title="Cerrar sesión">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="login-link">
            <i class="fa-regular fa-user"></i>
            <span>Ingresar</span>
          </router-link>
        </template>

        <!-- Mobile hamburger -->
        <button
          class="mobile-toggle"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Menu"
        >
          <i :class="mobileMenuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'"></i>
        </button>
      </div>
    </nav>

    <!-- Mobile Drawer -->
    <div v-if="mobileMenuOpen" class="mobile-drawer">
      <router-link to="/" @click="mobileMenuOpen = false">Inicio</router-link>
      <router-link to="/catalogo" @click="mobileMenuOpen = false">Catálogo Completo</router-link>
      <router-link to="/catalogo?category=Gaming Setup" @click="mobileMenuOpen = false">Gaming Setup</router-link>
      <router-link to="/catalogo?category=Audio Pro" @click="mobileMenuOpen = false">Audio Pro</router-link>
      <router-link v-if="authStore.isAdmin" to="/admin" @click="mobileMenuOpen = false">Panel Administrador</router-link>
      <router-link v-if="!authStore.isAuthenticated" to="/login" @click="mobileMenuOpen = false">Iniciar Sesión</router-link>
    </div>
  </header>
</template>

<style scoped>
.navbar-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(18, 20, 23, 0.75);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
}

.nav-logo {
  font-family: var(--font-display);
  font-size: 2rem;
  letter-spacing: 0.12em;
  color: var(--white);
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;
}
.nav-logo:hover {
  transform: scale(1.02);
}
.nav-logo span {
  color: var(--accent);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
  list-style: none;
}

.nav-links a {
  color: var(--ash);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: color 0.2s ease;
  position: relative;
  padding: 4px 0;
}
.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--white);
}
.nav-links a::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--accent);
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.nav-links a:hover::after,
.nav-links a.router-link-active::after {
  width: 100%;
}

.admin-badge-link {
  color: #38bdf8 !important;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(56, 189, 248, 0.1);
  padding: 6px 14px !important;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.live-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 5px 12px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: #34d399;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
  animation: pulseGlow 2s infinite ease-in-out;
}

.nav-icon-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--platinum);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  font-size: 1.05rem;
}
.nav-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--white);
  border-color: rgba(255, 255, 255, 0.25);
}

.cart-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  background: var(--accent);
  color: #0f172a;
  border-radius: 50%;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(56, 189, 248, 0.5);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.user-name {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--platinum);
}
.logout-btn {
  background: none;
  border: none;
  color: var(--ash);
  cursor: pointer;
  transition: color 0.2s ease;
}
.logout-btn:hover {
  color: var(--rose);
}

.login-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--platinum);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
}
.login-link:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: var(--white);
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--white);
  font-size: 1.3rem;
  cursor: pointer;
}

.mobile-drawer {
  display: none;
}

@media (max-width: 900px) {
  .nav-links, .live-pill {
    display: none;
  }
  .mobile-toggle {
    display: block;
  }
  .mobile-drawer {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    background: #16181d;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .mobile-drawer a {
    color: var(--platinum);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: 0.95rem;
    padding: 8px 0;
  }
}
</style>
