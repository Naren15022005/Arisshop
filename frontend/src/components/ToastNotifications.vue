<script setup>
import { useSocketStore } from '../stores/socket'

const socketStore = useSocketStore()
</script>

<template>
  <div class="toast-container">
    <transition-group name="toast-slide">
      <div
        v-for="toast in socketStore.notifications"
        :key="toast.id"
        class="toast-item glass-panel"
        :class="toast.type"
      >
        <div class="toast-icon">
          <i v-if="toast.type === 'order'" class="fa-solid fa-cart-shopping"></i>
          <i v-else class="fa-solid fa-bell"></i>
        </div>
        <div class="toast-content">
          <div class="toast-header">
            <strong>{{ toast.title }}</strong>
            <span class="toast-time">{{ toast.time }}</span>
          </div>
          <p>{{ toast.message }}</p>
        </div>
        <button class="toast-close" @click="socketStore.removeToast(toast.id)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 380px;
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: rgba(20, 24, 30, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.toast-item.order {
  border-left: 4px solid #10b981;
}
.toast-item.order .toast-icon {
  color: #10b981;
}

.toast-item.status {
  border-left: 4px solid #38bdf8;
}
.toast-item.status .toast-icon {
  color: #38bdf8;
}

.toast-icon {
  font-size: 1.2rem;
  margin-top: 2px;
}

.toast-content {
  flex: 1;
}

.toast-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.toast-header strong {
  font-family: var(--font-heading);
  font-size: 0.88rem;
  color: var(--white);
}
.toast-time {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: #71717a;
}
.toast-content p {
  font-size: 0.8rem;
  color: var(--platinum);
  line-height: 1.3;
}

.toast-close {
  background: none;
  border: none;
  color: #71717a;
  cursor: pointer;
  padding: 2px;
  font-size: 0.9rem;
  transition: color 0.2s;
}
.toast-close:hover {
  color: var(--white);
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.9);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(50px) scale(0.9);
}
</style>
