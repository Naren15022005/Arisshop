import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useProductStore = defineStore('products', () => {
  const products = ref([])
  const loading = ref(false)
  const error = ref('')
  const selectedCategory = ref('Todos')
  const searchQuery = ref('')
  const sortBy = ref('featured')

  const categories = [
    'Todos',
    'Gaming Setup',
    'Audio Pro',
    'Accesorios Celulares',
    'Accesorios Streaming'
  ]

  async function fetchProducts() {
    loading.value = true
    error.value = ''
    try {
      const res = await fetch(`${API_BASE}/api/products?limit=100`)
      if (!res.ok) throw new Error('Error al cargar catálogo')
      const data = await res.json()
      products.value = data.products || []
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchProductById(id) {
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`)
      if (!res.ok) throw new Error('Producto no encontrado')
      const data = await res.json()
      return data.product
    } catch (err) {
      // Fallback a lista en memoria si ya fue cargada
      const local = products.value.find((p) => p.id === id)
      if (local) return local
      throw err
    }
  }

  const filteredProducts = computed(() => {
    let list = [...products.value]

    // Solo activos para la vista de tienda pública
    list = list.filter((p) => p.status !== 'Oculto')

    if (selectedCategory.value && selectedCategory.value !== 'Todos') {
      list = list.filter((p) => p.category === selectedCategory.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    }

    if (sortBy.value === 'price-asc') {
      list.sort((a, b) => a.price - b.price)
    } else if (sortBy.value === 'price-desc') {
      list.sort((a, b) => b.price - a.price)
    }

    return list
  })

  // Actualizaciones reactivas por WebSocket
  function onProductUpdated(updated) {
    const idx = products.value.findIndex((p) => p.id === updated.id)
    if (idx !== -1) {
      products.value[idx] = { ...products.value[idx], ...updated }
    } else {
      products.value.unshift(updated)
    }
  }

  function onProductDeleted(deletedId) {
    products.value = products.value.filter((p) => p.id !== deletedId)
  }

  return {
    products,
    loading,
    error,
    categories,
    selectedCategory,
    searchQuery,
    sortBy,
    filteredProducts,
    fetchProducts,
    fetchProductById,
    onProductUpdated,
    onProductDeleted
  }
})
