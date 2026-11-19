<script setup lang="ts">
/** Muestra una tasa pactada con su tipo, periodo, capitalización y sus equivalencias (TEM, TEA) del backend. */
import type { TasaOut } from '@/types/api'
import { formatRate } from '@/utils/format'

defineProps<{ titulo: string; tasa: TasaOut }>()

const periodo = (d: number) => (d === 360 ? 'anual' : d === 30 ? 'mensual' : `cada ${d} días`)
const capitalizacion = (d: number | null) => (d === 1 ? 'diaria' : d === 15 ? 'quincenal' : d === 30 ? 'mensual' : `cada ${d} días`)
</script>

<template>
  <div class="rounded-control bg-surface-low p-3">
    <p class="text-label font-bold uppercase text-on-surface-variant">{{ titulo }}</p>
    <p class="text-title font-bold text-on-surface">
      {{ formatRate(tasa.valor, 4) }}
      <span class="text-caption font-normal text-on-surface-variant">
        {{ tasa.tipo === 'NOMINAL' ? 'nominal' : 'efectiva' }} {{ periodo(tasa.periodo_dias) }}
        <template v-if="tasa.tipo === 'NOMINAL'"> · capitalización {{ capitalizacion(tasa.capitalizacion_dias) }}</template>
      </span>
    </p>
    <p class="mt-0.5 flex flex-wrap gap-x-3 text-caption font-semibold text-primary">
      <span>TEM {{ formatRate(tasa.equivalencias.tem_pct, 4) }}</span>
      <span>TEA {{ formatRate(tasa.equivalencias.tea_pct, 4) }}</span>
      <span class="font-normal text-on-surface-variant">TED {{ formatRate(tasa.equivalencias.ted_pct, 6) }}</span>
    </p>
  </div>
</template>
