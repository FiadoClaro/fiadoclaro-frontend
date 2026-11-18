<script setup lang="ts">
/**
 * Marcador temporal para las páginas que se construyen en fases siguientes del plan.
 * Muestra el título de la ruta y en qué fase se implementa.
 */
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section class="pt-1">
    <h1 class="text-headline font-bold text-on-surface">{{ route.meta.titulo }}</h1>
    <div class="mt-6 rounded-card border border-dashed border-outline-variant bg-surface-lowest p-8 text-center shadow-xs">
      <p class="text-body font-semibold text-on-surface">Página en construcción</p>
      <p v-if="route.meta.fase" class="mt-1 text-caption text-on-surface-variant">
        Se implementa en la fase {{ route.meta.fase }} del plan.
      </p>
    </div>
  </section>
</template>
