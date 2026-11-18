<script setup lang="ts">
/**
 * Muestra una tasa que llega del backend como texto: <RateText valor="3.5000000" periodo="mensual" />
 * → "3.50 % mensual". Con `decimales` se puede ver la tasa exacta (hasta 7).
 */
import { computed } from 'vue'
import { formatRate } from '@/utils/format'

const props = withDefaults(defineProps<{ valor: string | null | undefined; decimales?: number; periodo?: string }>(), {
  decimales: 2,
  periodo: undefined,
})

const texto = computed(() => formatRate(props.valor, props.decimales))
</script>

<template>
  <span class="whitespace-nowrap tabular-nums">
    {{ texto }}<span v-if="periodo" class="font-normal text-on-surface-variant"> {{ periodo }}</span>
  </span>
</template>
