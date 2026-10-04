import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref(JSON.parse(localStorage.getItem('aris_cart') || '[]'))
  const isOpen = ref(false)

  // Persistir en localStorage automáticamente
  watch(
    items,
    (val) => {
      localStorage.setItem('aris_cart', JSON.stringify(val))
    },
    { deep: true }
  )

  const totalCount = computed(() => {
    return items.value.reduce((acc, item) => acc + (item.qty || 1), 0)
  })

  const totalAmount = computed(() => {
    return items.value.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.qty || 1), 0)
  })

  function addItem(product, qty = 1) {
    const existing = items.value.find((i) => i.id === product.id)
    if (existing) {
      existing.qty += qty
    } else {
      items.value.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        qty: qty
      })
    }
    isOpen.value = true
  }

  function removeItem(productId) {
    items.value = items.value.filter((i) => i.id !== productId)
  }

  function updateQty(productId, qty) {
    const item = items.value.find((i) => i.id === productId)
    if (item) {
      if (qty <= 0) {
        removeItem(productId)
      } else {
        item.qty = qty
      }
    }
  }

  function clearCart() {
    items.value = []
  }

  function toggleCart() {
    isOpen.value = !isOpen.value
  }

  return {
    items,
    isOpen,
    totalCount,
    totalAmount,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    toggleCart
  }
})
