import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useProductStore } from './products'

export const useSocketStore = defineStore('socket', () => {
  const isConnected = ref(false)
  const activeUsers = ref(1)
  const notifications = ref([])
  let ws = null
  let reconnectTimer = null

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const loc = window.location
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:'
    // En desarrollo con Vite en puerto 5173, conectar al backend en 3005
    let wsHost = loc.host
    if (loc.port === '5173' || loc.port === '3000') {
      wsHost = `${loc.hostname}:3005`
    }
    const wsUrl = `${protocol}//${wsHost}/ws`

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        isConnected.value = true
        if (reconnectTimer) clearTimeout(reconnectTimer)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleEvent(msg.event, msg.data)
        } catch (e) {
          // Mensaje no JSON
        }
      }

      ws.onclose = () => {
        isConnected.value = false
        // Reintentar reconexión exponencial / periódica segura
        reconnectTimer = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (e) {
      // Ignorar fallo de inicio de socket
    }
  }

  function handleEvent(event, data) {
    const productStore = useProductStore()

    switch (event) {
      case 'users:active':
        if (data && typeof data.count === 'number') {
          activeUsers.value = data.count
        }
        break

      case 'product:new':
      case 'product:update':
        if (data) {
          productStore.onProductUpdated(data)
        }
        break

      case 'product:delete':
        if (data && data.id) {
          productStore.onProductDeleted(data.id)
        }
        break

      case 'order:new':
        addToast({
          id: Date.now(),
          type: 'order',
          title: '¡Nueva compra en vivo!',
          message: `${data.name || 'Un cliente'} acaba de ordenar por $${Number(data.total || 0).toLocaleString('es-CO')}`,
          time: data.time || 'Ahora'
        })
        break

      case 'order:status':
        addToast({
          id: Date.now(),
          type: 'status',
          title: 'Estado de Pedido Actualizado',
          message: `Orden #${data.orderId}: nuevo estado ${data.status}`,
          time: data.time || 'Ahora'
        })
        break
    }
  }

  function addToast(toast) {
    notifications.value.unshift(toast)
    if (notifications.value.length > 5) {
      notifications.value.pop()
    }
    setTimeout(() => {
      notifications.value = notifications.value.filter((t) => t.id !== toast.id)
    }, 6000)
  }

  function removeToast(id) {
    notifications.value = notifications.value.filter((t) => t.id !== id)
  }

  return {
    isConnected,
    activeUsers,
    notifications,
    connect,
    removeToast
  }
})
