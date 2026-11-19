<script setup lang="ts">
/**
 * Panel "Resumen de Apertura" (Figma 5, columna derecha): tarjeta tipo boleta con los datos que
 * se van llenando. La TEM y TEA vienen del backend (POST /finance/equivalencias).
 */
import { computed } from 'vue'
import type { EquivalenciasOut } from '@/types/api'
import { formatMoney, formatRate } from '@/utils/format'
import { iniciales } from '@/layouts/nav'
import iconoResumen from '@/assets/icons/resumen-apertura.svg'

const props = withDefaults(
  defineProps<{
    etiqueta?: string
    nombre: string
    dni: string
    moneda: string
    limite: string
    tasa: string
    periodoDias: number
    tipoTasa: string
    equivalencias: EquivalenciasOut | null
    calculando?: boolean
    diaCorte: number | null
    horaCorte: string
    diaPago: number | null
    /** Texto del recuadro de capacidad ("100% disponible al alta") */
    capacidad?: string
  }>(),
  { etiqueta: 'Nuevo vecino', calculando: false, capacidad: '100% disponible al alta' },
)

const periodo = computed(() => (props.periodoDias === 360 ? 'anual' : 'mensual'))
const tasaTexto = computed(() => (/^\d+(\.\d+)?$/.test(props.tasa) ? formatRate(props.tasa) : '—'))
const dia = (d: number | null) => (d ? String(d).padStart(2, '0') : '—')
</script>

<template>
  <section class="relative rounded-t-card bg-white px-6 pb-8 pt-6 shadow-xs" aria-labelledby="titulo-resumen" aria-live="polite">
    <div class="flex items-center justify-between gap-2 border-b border-surface-highest pb-2">
      <h2 id="titulo-resumen" class="flex items-center gap-1 text-body-lg font-semibold text-on-surface">
        <img :src="iconoResumen" alt="" width="15" height="16.67" /> Resumen de Apertura
      </h2>
      <span class="rounded-stamp bg-primary-container/15 px-2 py-0.5 text-label font-bold uppercase text-primary">{{ etiqueta }}</span>
    </div>

    <div class="mt-4 flex items-center gap-4">
      <span class="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-title font-semibold text-primary shadow-inset" aria-hidden="true">
        {{ iniciales(nombre || '?') }}
      </span>
      <div class="min-w-0">
        <p class="truncate text-body-lg font-semibold text-on-surface">{{ nombre || 'Nombre del vecino' }}</p>
        <p class="text-caption text-on-surface-variant">DNI: {{ dni || '—' }}</p>
      </div>
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-2 rounded-control bg-surface-low p-2">
      <div>
        <dt class="text-label font-bold uppercase text-on-surface-variant">Tope permitido</dt>
        <dd class="text-title font-bold tracking-[-0.56px] text-primary">{{ formatMoney(limite || null, moneda) }}</dd>
      </div>
      <div>
        <dt class="text-label font-bold uppercase text-on-surface-variant">Tasa compens.</dt>
        <dd class="text-title font-bold tracking-[-0.56px] text-on-surface">{{ tasaTexto }}</dd>
        <dd class="text-caption text-on-surface-variant">{{ tipoTasa === 'NOMINAL' ? 'Nominal' : 'Efectiva' }} {{ periodo }}</dd>
      </div>
      <div class="col-span-2 rounded-stamp bg-white/70 px-2 py-1.5">
        <dt class="text-label font-bold uppercase text-on-surface-variant">Equivalencias (backend)</dt>
        <dd v-if="calculando" class="text-caption text-on-surface-variant">Calculando…</dd>
        <dd v-else-if="equivalencias" class="flex flex-wrap gap-x-4 text-body font-semibold text-primary">
          <span>TEM {{ formatRate(equivalencias.tem_pct, 4) }}</span>
          <span>TEA {{ formatRate(equivalencias.tea_pct, 4) }}</span>
        </dd>
        <dd v-else class="text-caption text-on-surface-variant">Escribe la tasa para verlas.</dd>
      </div>
      <div>
        <dt class="text-label font-bold uppercase text-on-surface-variant">Corte del fiado</dt>
        <dd class="text-body font-semibold tracking-[0.14px]">{{ dia(diaCorte) }} de c/mes · {{ horaCorte || '—' }}</dd>
      </div>
      <div>
        <dt class="text-label font-bold uppercase text-on-surface-variant">Fecha pago</dt>
        <dd class="text-body font-bold tracking-[0.14px] text-primary">{{ dia(diaPago) }} de c/mes</dd>
      </div>
    </dl>

    <div class="mt-4 flex items-center justify-between rounded-control bg-surface-container p-2">
      <div>
        <p class="text-caption font-semibold text-on-surface">Capacidad de crédito</p>
        <p class="text-caption text-on-surface-variant">{{ capacidad }}</p>
      </div>
    </div>

    <!-- Borde inferior dentado (boleta) -->
    <span
      class="pointer-events-none absolute inset-x-0 -bottom-2 h-4"
      style="background: radial-gradient(circle at 8px 16px, transparent 7px, white 7.5px) repeat-x; background-size: 16px 16px"
      aria-hidden="true"
    />
  </section>
</template>
