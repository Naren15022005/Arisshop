import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('aris_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('aris_user') || 'null'))
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(email, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      token.value = data.token
      user.value = data.user
      localStorage.setItem('aris_token', data.token)
      localStorage.setItem('aris_user', JSON.stringify(data.user))
      return { success: true, user: data.user }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function register(name, email, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error en el registro')
      }

      token.value = data.token
      user.value = data.user
      localStorage.setItem('aris_token', data.token)
      localStorage.setItem('aris_user', JSON.stringify(data.user))
      return { success: true, user: data.user }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (res.ok) {
        const data = await res.json()
        user.value = data.user
        localStorage.setItem('aris_user', JSON.stringify(data.user))
      } else {
        logout()
      }
    } catch (e) {
      // Offline fallback: keep cached user
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token.value}` }
        })
      }
    } catch (e) {
      // Ignorar fallo de red en logout
    } finally {
      token.value = ''
      user.value = null
      localStorage.removeItem('aris_token')
      localStorage.removeItem('aris_user')
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    register,
    fetchMe,
    logout
  }
})
