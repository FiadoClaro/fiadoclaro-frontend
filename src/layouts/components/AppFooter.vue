<script setup lang="ts">
/** Pie de página de las pantallas internas (Figma 4b): créditos a la izquierda y un slot a la derecha. */
const anio = new Date().getFullYear()
</script>

<template>
  <footer class="flex flex-col gap-2 bg-white/60 px-4 py-4 shadow-footer sm:flex-row sm:items-center sm:justify-between sm:px-8">
    <p class="text-caption text-on-surface-variant/80">FiadoClaro © {{ anio }} · Cuaderno Digital de Bodega</p>
    <slot />
  </footer>
</template>
