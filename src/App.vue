<script setup lang="ts">
// Componente raíz: la vista de la ruta actual (con su layout) y los mensajes emergentes (toasts).
import ToastHost from '@/components/ui/ToastHost.vue'
</script>

<template>
  <RouterView />
  <ToastHost />
</template>
