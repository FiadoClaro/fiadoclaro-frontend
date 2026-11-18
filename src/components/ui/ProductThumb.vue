<script setup lang="ts">
/**
 * Miniatura del producto (Figma 6b y 7). Usa la imagen que registró la tienda (imagen_url);
 * si no hay o no carga, muestra las iniciales del producto.
 */
import { ref, watch } from 'vue'
import { iniciales } from '@/layouts/nav'

const props = withDefaults(defineProps<{ src?: string | null; nombre: string; tamano?: number; apagado?: boolean }>(), {
  src: null,
  tamano: 44,
  apagado: false,
})

const fallo = ref(false)
watch(() => props.src, () => (fallo.value = false))
</script>

<template>
  <span
    :style="{ width: `${tamano}px`, height: `${tamano}px` }"
    :class="apagado ? 'opacity-60 grayscale' : ''"
    class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-high shadow-inset"
  >
    <img v-if="src && !fallo" :src="src" :alt="`Foto de ${nombre}`" class="size-full object-cover" loading="lazy" @error="fallo = true" />
    <span v-else class="text-caption font-bold text-on-surface-variant" aria-hidden="true">{{ iniciales(nombre) }}</span>
  </span>
</template>
