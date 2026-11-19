<script setup lang="ts">
/**
 * Barra de crédito utilizado (Figma 4b): verde si va bien, ámbar si pasa la mitad, rojo si está casi lleno.
 * El porcentaje viene calculado del backend (resumen.porcentaje_utilizado); aquí solo se dibuja.
 */
import { computed } from 'vue'
import { compararDecimales } from '@/utils/decimalInput'
import { formatMoney } from '@/utils/format'

const props = defineProps<{ utilizado: string; porcentaje: string; moneda: string; apagado?: boolean }>()

const tono = computed(() => {
  if (props.apagado) return { texto: 'text-outline', barra: 'bg-outline' }
  if (compararDecimales(props.porcentaje, '90') >= 0) return { texto: 'text-error', barra: 'bg-error' }
  if (compararDecimales(props.porcentaje, '50') >= 0) return { texto: 'text-tertiary', barra: 'bg-tertiary-container' }
  return { texto: 'text-primary', barra: 'bg-primary-container' }
})
</script>

<template>
  <div class="flex min-w-[180px] flex-col gap-1">
    <div :class="tono.texto" class="flex items-baseline justify-between gap-2">
      <span class="text-body font-semibold tracking-[0.55px]">{{ formatMoney(utilizado, moneda) }}</span>
      <span class="text-label font-bold">{{ porcentaje }}%</span>
    </div>
    <div
      class="h-2 overflow-hidden rounded-full bg-surface-highest"
      role="progressbar"
      :aria-valuenow="Number(porcentaje)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Crédito utilizado: ${porcentaje}%`"
    >
      <div :class="tono.barra" class="h-full max-w-full rounded-full" :style="{ width: `${porcentaje}%` }" />
    </div>
  </div>
</template>
