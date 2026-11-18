<script setup lang="ts">
/** Tarjeta de la tienda en la barra lateral (nombre comercial y RUC), Figma 4b y 12. */
import icono from '@/assets/icons/nav-tienda-card.svg'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div v-if="auth.tienda" class="flex items-center gap-2 bg-white/5 p-4">
    <span class="flex size-8 shrink-0 items-center justify-center rounded-control bg-primary-container">
      <img :src="icono" alt="" width="15.07" height="13.5" />
    </span>
    <div class="min-w-0">
      <p class="truncate text-body font-semibold tracking-[0.14px] text-white">{{ auth.tienda.nombre_comercial }}</p>
      <p class="text-label font-bold text-primary-fixed-dim">RUC {{ auth.tienda.ruc }}</p>
    </div>
  </div>
</template>
