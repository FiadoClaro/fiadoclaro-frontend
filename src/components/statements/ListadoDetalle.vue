<script setup lang="ts">
/**
 * Pantalla 11 — Listado de Pago del Periodo (Figma node 4-7338), como componente reutilizable:
 * lo usan la tienda (con el botón de pago) y el portal del vecino (fase 9, solo lectura).
 *
 * Compras ordenadas por fecha (fin de mes con sus días de interés; cuotas como "1/3") y la mora
 * como ítem separado "Intereses por mora". Todos los montos vienen del backend (EstadoCuentaOut),
 * con la mora calculada a la fecha de consulta.
 */
import { computed } from 'vue'
import type { EstadoCuentaOut } from '@/types/api'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import { formatDate, formatMoney } from '@/utils/format'
import iconoBoleta from '@/assets/icons/resumen-apertura.svg'
import iconoDetalle from '@/assets/icons/reglas-libro.svg'
import iconoCorte from '@/assets/icons/compra-corte.svg'
import iconoPago from '@/assets/icons/compra-pago.svg'
import iconoAlerta from '@/assets/icons/regla-alerta.svg'

const props = defineProps<{ listado: EstadoCuentaOut; tiendaNombre?: string; tiendaRuc?: string }>()

const m = (v: string | null | undefined) => formatMoney(v, props.listado.moneda)
const compras = computed(() => props.listado.items.filter((i) => i.tipo === 'COMPRA_FIN_MES' || i.tipo === 'CUOTA'))
const itemsMora = computed(() => props.listado.items.filter((i) => i.tipo === 'INTERES_MORA' || i.tipo === 'INTERES_COMP_MORA'))
const pendiente = computed(() => props.listado.estado === 'PENDIENTE')
const enMora = computed(() => pendiente.value && props.listado.dias_mora > 0)
const estadoSello = computed(() => (props.listado.estado === 'PAGADO' ? 'PAGADO' : props.listado.vencido ? 'VENCIDO' : 'PENDIENTE'))
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-12">
    <div class="flex flex-col gap-6 lg:col-span-8">
      <!-- Cabecera del listado -->
      <section class="relative overflow-hidden rounded-card bg-white shadow-xs" aria-label="Datos del listado">
        <span class="pointer-events-none absolute inset-y-0 left-4 w-0.5 bg-error/25" aria-hidden="true" />
        <div class="flex flex-wrap items-start justify-between gap-3 px-10 pt-6">
          <div>
            <h2 class="text-headline font-bold text-on-surface">{{ listado.cliente }}</h2>
            <p class="text-caption text-on-surface-variant">DNI: <strong class="text-on-surface">{{ listado.dni }}</strong> · Capital: <strong class="text-on-surface">{{ m(listado.total_capital) }}</strong></p>
          </div>
          <div class="text-right">
            <StatusStamp :estado="enMora ? 'EN_MORA' : estadoSello" />
            <p v-if="enMora" class="mt-1 text-micro font-bold uppercase text-error">Pago posterior al {{ formatDate(listado.fecha_pago) }}</p>
          </div>
        </div>
        <div class="mt-4 grid gap-4 bg-surface-low px-10 py-4 sm:grid-cols-2">
          <div>
            <p class="text-label font-bold uppercase text-on-surface-variant">Fecha de corte</p>
            <p class="flex items-center gap-1 text-title font-bold"><img :src="iconoCorte" alt="" width="15" height="15" /> {{ formatDate(listado.fecha_corte) }}</p>
            <p class="text-caption text-on-surface-variant">Emisión regular de liquidación</p>
          </div>
          <div class="rounded-control bg-white p-3">
            <p class="flex items-center gap-1 text-label font-bold uppercase text-on-surface-variant"><img :src="iconoPago" alt="" width="13" height="13" /> Fecha de vencimiento</p>
            <p class="text-title font-bold">{{ formatDate(listado.fecha_pago) }}</p>
            <p class="text-caption text-on-surface-variant">{{ enMora ? `${listado.dias_mora} días de atraso al ${formatDate(listado.fecha_consulta)}` : 'Sin mora en fecha regular de corte' }}</p>
          </div>
        </div>
      </section>

      <!-- Compras del ciclo -->
      <section class="overflow-hidden rounded-card bg-surface-container shadow-xs" aria-labelledby="titulo-compras-listado">
        <div class="flex items-center justify-between gap-2 px-6 py-4">
          <div class="flex items-center gap-2">
            <span class="flex size-8 items-center justify-center rounded-control bg-primary/10"><img :src="iconoDetalle" alt="" width="18" height="13" /></span>
            <div>
              <h2 id="titulo-compras-listado" class="text-body-lg font-semibold text-on-surface">Detalle de Compras y Consumos del Mes</h2>
              <p class="text-caption text-on-surface-variant">Ordenadas cronológicamente con devengamiento diario</p>
            </div>
          </div>
          <span class="rounded-full bg-surface-high px-2 py-0.5 text-label font-bold text-on-surface-variant">{{ compras.length }} registros</span>
        </div>
        <div class="relative overflow-x-auto bg-white">
          <span class="pointer-events-none absolute inset-y-0 left-4 w-0.5 bg-error/25" aria-hidden="true" />
          <table class="w-full min-w-[620px] text-body">
            <caption class="sr-only">Compras del listado</caption>
            <thead class="bg-surface-container text-label font-semibold uppercase text-on-surface-variant">
              <tr>
                <th scope="col" class="py-3 pl-8 pr-3 text-left">Fecha</th>
                <th scope="col" class="px-3 py-3 text-left">Descripción / comprobante</th>
                <th scope="col" class="px-3 py-3 text-right">Monto compra</th>
                <th scope="col" class="px-3 py-3 text-center">Días a liquidar</th>
                <th scope="col" class="px-3 py-3 text-right">Int. acumulado</th>
                <th scope="col" class="px-3 py-3 pr-6 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, i) in compras" :key="i" class="border-t border-surface-container">
                <td class="py-3 pl-8 pr-3 tabular-nums">{{ it.fecha_compra ? formatDate(it.fecha_compra) : '—' }}</td>
                <td class="px-3 py-3">
                  <p class="font-semibold">Compra #{{ it.compra_id }}<template v-if="it.cuota"> · cuota {{ it.cuota }}</template></p>
                  <p class="text-caption text-on-surface-variant">{{ it.descripcion }}</p>
                </td>
                <td class="px-3 py-3 text-right font-semibold tabular-nums">{{ m(it.capital) }}</td>
                <td class="px-3 py-3 text-center">
                  <span v-if="it.dias_interes !== null && it.dias_interes !== undefined" class="rounded-full bg-surface-high px-2 py-0.5 text-caption">{{ it.dias_interes }} días</span>
                  <span v-else class="text-caption text-on-surface-variant">vence {{ formatDate(it.fecha_vencimiento) }}</span>
                </td>
                <td class="px-3 py-3 text-right tabular-nums text-primary">{{ m(it.interes) }}</td>
                <td class="px-3 py-3 pr-6 text-right font-bold tabular-nums">{{ m(it.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <dl class="flex flex-col gap-1 px-6 py-4">
          <div class="flex gap-2"><dt class="text-body text-on-surface-variant">Base de compras:</dt><dd class="text-body-lg font-bold">{{ m(listado.total_capital) }}</dd></div>
          <div class="flex gap-2"><dt class="text-body font-semibold text-primary">Intereses compensatorios:</dt><dd class="text-body-lg font-bold text-primary">{{ m(listado.total_interes) }}</dd></div>
        </dl>
      </section>

      <!-- Intereses por mora (ítem aparte) -->
      <section v-if="itemsMora.length || enMora" class="rounded-card bg-error-container/50 p-6 shadow-xs" aria-labelledby="titulo-mora">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-control bg-error"><img :src="iconoAlerta" alt="" width="14" height="12" class="brightness-0 invert" /></span>
            <div>
              <span class="rounded-stamp bg-error px-2 py-0.5 text-label font-bold uppercase text-white">Intereses por mora</span>
              <h2 id="titulo-mora" class="mt-1 text-body-lg font-bold text-error">
                Recálculo al {{ formatDate(listado.fecha_consulta) }} por pago tardío: mora {{ m(listado.interes_moratorio) }} + compensatorio {{ m(listado.interes_compensatorio_mora) }}
              </h2>
            </div>
          </div>
          <div class="rounded-control bg-white px-4 py-2 text-right">
            <p class="text-label font-bold uppercase text-on-surface-variant">Total exigible hoy</p>
            <p class="text-title font-bold text-error">{{ m(listado.total_exigible) }}</p>
          </div>
        </div>
        <dl class="mt-4 grid gap-3 rounded-control bg-white p-4 sm:grid-cols-3">
          <div><dt class="text-label font-bold uppercase text-on-surface-variant">Días de atraso</dt><dd class="text-title font-bold text-error">{{ listado.dias_mora }} días</dd></div>
          <div><dt class="text-label font-bold uppercase text-on-surface-variant">Interés moratorio</dt><dd class="text-title font-bold text-error">{{ m(listado.interes_moratorio) }}</dd></div>
          <div><dt class="text-label font-bold uppercase text-on-surface-variant">Compensatorio por atraso</dt><dd class="text-title font-bold text-error">{{ m(listado.interes_compensatorio_mora) }}</dd></div>
        </dl>
        <ul v-if="itemsMora.length" class="mt-3 space-y-1 text-caption text-error">
          <li v-for="(it, i) in itemsMora" :key="i" class="flex justify-between gap-2">
            <span>{{ it.descripcion }}<template v-if="it.dias_interes"> ({{ it.dias_interes }} días)</template></span>
            <span class="font-semibold tabular-nums">{{ m(it.total) }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Boleta resumen -->
    <aside class="flex flex-col gap-4 lg:col-span-4">
      <section class="relative rounded-t-card bg-white p-6 pb-8 shadow-xs" aria-labelledby="titulo-boleta-listado">
        <span class="mx-auto flex size-10 items-center justify-center rounded-full bg-primary-fixed/60"><img :src="iconoBoleta" alt="" width="15" height="16.67" /></span>
        <h2 id="titulo-boleta-listado" class="mt-2 text-center text-body-lg font-bold uppercase">{{ tiendaNombre ?? 'Listado de pago' }}</h2>
        <p v-if="tiendaRuc" class="text-center text-caption text-on-surface-variant">RUC: {{ tiendaRuc }}</p>
        <dl class="mt-4 space-y-1 rounded-control bg-surface-low p-3 text-caption">
          <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">Cliente:</dt><dd class="text-right font-semibold">{{ listado.cliente }}</dd></div>
          <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">DNI:</dt><dd class="font-semibold">{{ listado.dni }}</dd></div>
          <div class="flex justify-between gap-2 rounded-stamp bg-tertiary-fixed/60 px-1 font-bold text-tertiary"><dt>Fecha límite:</dt><dd>{{ formatDate(listado.fecha_pago) }}</dd></div>
        </dl>
        <dl class="mt-4 space-y-1 text-body">
          <div class="flex justify-between gap-2"><dt>Consumo en compras ({{ compras.length }}):</dt><dd class="font-semibold tabular-nums">{{ m(listado.total_capital) }}</dd></div>
          <div class="flex justify-between gap-2"><dt>Int. compensatorio:</dt><dd class="font-semibold tabular-nums">{{ m(listado.total_interes) }}</dd></div>
          <template v-if="enMora">
            <div class="flex justify-between gap-2 font-semibold text-error"><dt>Interés moratorio ({{ listado.dias_mora }} días):</dt><dd class="tabular-nums">{{ m(listado.interes_moratorio) }}</dd></div>
            <div class="flex justify-between gap-2"><dt>Int. comp. por atraso ({{ listado.dias_mora }} días):</dt><dd class="font-semibold tabular-nums">{{ m(listado.interes_compensatorio_mora) }}</dd></div>
          </template>
        </dl>
        <div class="mt-4 border-t-4 border-double border-surface-highest pt-4 text-center">
          <p class="text-label font-bold uppercase text-on-surface-variant">{{ pendiente ? 'Total a cancelar' : 'Total del listado (pagado)' }}</p>
          <p class="text-display font-bold text-primary underline decoration-2 underline-offset-8">{{ m(pendiente ? listado.total_exigible : listado.total_a_pagar) }}</p>
        </div>
        <span class="pointer-events-none absolute inset-x-0 -bottom-2 h-4" style="background: radial-gradient(circle at 8px 16px, transparent 7px, white 7.5px) repeat-x; background-size: 16px 16px" aria-hidden="true" />
      </section>
      <slot name="acciones" />
    </aside>
  </div>
</template>
