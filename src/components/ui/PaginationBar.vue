<script setup lang="ts">
/**
 * Paginación del pie de las tablas (Figma 2b): |< < [página] > >|
 * Trabaja con `limit` y `offset`, igual que las listas del backend.
 */
import { computed } from 'vue'
import primera from '@/assets/icons/pag-primera.svg'
import anterior from '@/assets/icons/pag-anterior.svg'
import siguiente from '@/assets/icons/pag-siguiente.svg'
import ultima from '@/assets/icons/pag-ultima.svg'

const props = defineProps<{ total: number; limit: number }>()
const offset = defineModel<number>('offset', { default: 0 })

const paginas = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
const actual = computed(() => Math.floor(offset.value / props.limit) + 1)

function ir(pagina: number) {
  const p = Math.min(Math.max(pagina, 1), paginas.value)
  offset.value = (p - 1) * props.limit
}

const botones = computed(() => [
  { icono: primera, ancho: 9.3, etiqueta: 'Primera página', pagina: 1, deshabilitado: actual.value === 1 },
  { icono: anterior, ancho: 5.55, etiqueta: 'Página anterior', pagina: actual.value - 1, deshabilitado: actual.value === 1 },
  { icono: siguiente, ancho: 5.55, etiqueta: 'Página siguiente', pagina: actual.value + 1, deshabilitado: actual.value === paginas.value },
  { icono: ultima, ancho: 9.3, etiqueta: 'Última página', pagina: paginas.value, deshabilitado: actual.value === paginas.value },
])
</script>

<template>
  <nav class="flex items-center gap-1" aria-label="Paginación">
    <template v-for="(b, i) in botones" :key="b.etiqueta">
      <span
        v-if="i === 2"
        class="rounded-stamp bg-white px-3 py-1 text-caption font-bold text-primary shadow-xs"
        aria-current="page"
        :title="`Página ${actual} de ${paginas}`"
      >
        {{ actual }}<span class="sr-only"> de {{ paginas }}</span>
      </span>
      <button
        type="button"
        :aria-label="b.etiqueta"
        :disabled="b.deshabilitado"
        class="flex size-6 items-center justify-center rounded-stamp transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        @click="ir(b.pagina)"
      >
        <img :src="b.icono" alt="" :width="b.ancho" height="9" />
      </button>
    </template>
  </nav>
</template>
