<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor completa todos los campos'
    return
  }

  const res = await authStore.login(email.value, password.value)
  if (res.success) {
    if (res.user.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/')
    }
  } else {
    errorMessage.value = res.error || 'Credenciales inválidas'
  }
}

function fillAdminDemo(adminEmail) {
  email.value = adminEmail
  password.value = 'AdminAris2026!'
}
</script>

<template>
  <div class="auth-page container">
    <div class="auth-card glass-panel">
      <div class="auth-header">
        <span class="auth-tag">ACCESO SEGURO</span>
        <h1 class="auth-title">INICIAR SESIÓN</h1>
        <p class="auth-subtitle">Ingresa a tu cuenta de ArisShop o panel administrativo</p>
      </div>

      <div v-if="errorMessage" class="error-alert">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="login-email">Correo Electrónico</label>
          <div class="input-wrap">
            <i class="fa-regular fa-envelope"></i>
            <input
              id="login-email"
              v-model="email"
              type="email"
              placeholder="tu@correo.com"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="login-password">Contraseña</label>
          <div class="input-wrap">
            <i class="fa-solid fa-lock"></i>
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              class="eye-btn"
              @click="showPassword = !showPassword"
              aria-label="Ver u ocultar contraseña"
            >
              <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="btn-primary auth-submit-btn"
          id="btn-login-submit"
          :disabled="authStore.loading"
        >
          <i v-if="authStore.loading" class="fa-solid fa-circle-notch fa-spin"></i>
          <span>{{ authStore.loading ? 'Verificando...' : 'Iniciar Sesión' }}</span>
        </button>
      </form>

      <!-- Demo shortcuts for convenience -->
      <div class="quick-admin-box">
        <span class="quick-title">Cuentas Administrativas:</span>
        <div class="quick-btns">
          <button @click="fillAdminDemo('admin@arisshop.co')">
            admin@arisshop.co
          </button>
          <button @click="fillAdminDemo('alfonsonavarroch@gmail.com')">
            alfonsonavarroch@gmail.com
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 76px);
  padding-top: 110px;
  padding-bottom: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  padding: 40px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}
.auth-tag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  color: var(--accent);
}
.auth-title {
  font-family: var(--font-display);
  font-size: 2.2rem;
  color: var(--white);
  letter-spacing: 0.05em;
  margin: 4px 0 8px;
}
.auth-subtitle {
  color: var(--ash);
  font-size: 0.88rem;
}

.error-alert {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #fb7185;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.82rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group label {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--ash);
  letter-spacing: 0.05em;
}

.input-wrap {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0 14px;
  transition: all 0.2s;
}
.input-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
}
.input-wrap i {
  color: var(--ash);
  font-size: 0.95rem;
}
.input-wrap input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  padding: 13px 12px;
  color: var(--white);
  font-family: var(--font-main);
  font-size: 0.9rem;
}
.eye-btn {
  background: none;
  border: none;
  color: var(--ash);
  cursor: pointer;
  padding: 4px;
}

.auth-submit-btn {
  width: 100%;
  margin-top: 10px;
}

.quick-admin-box {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.quick-title {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: #71717a;
  display: block;
  margin-bottom: 8px;
}
.quick-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quick-btns button {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--ash);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.quick-btns button:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  color: var(--accent);
}
</style>
