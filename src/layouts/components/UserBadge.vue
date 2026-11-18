<script setup lang="ts">
/**
 * Usuario de la sesión en la cabecera: avatar con iniciales, nombre y (opcional) una etiqueta de rol.
 * El Figma usa una foto; como el backend no guarda fotos, se muestran las iniciales.
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { iniciales } from '../nav'

defineProps<{ etiqueta?: string }>()

const auth = useAuthStore()
const nombre = computed(() => auth.usuario?.nombre ?? '')
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-caption font-semibold text-primary"
      aria-hidden="true"
    >
      {{ iniciales(nombre) }}
    </span>
    <div class="hidden min-w-0 sm:block">
      <p class="truncate text-caption font-semibold text-on-surface">{{ nombre }}</p>
      <p v-if="etiqueta" class="text-label font-bold text-on-surface-variant">{{ etiqueta }}</p>
    </div>
  </div>
</template>
