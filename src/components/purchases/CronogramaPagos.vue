<script setup lang="ts">
/**
 * Pantalla 9 — Cronograma de Pagos del Fiado (Figma node 4-7750), como componente reutilizable:
 * lo usan el detalle de compra de la tienda (fase 7) y el portal del vecino (fase 9).
 *
 * Todos los números vienen del backend (CompraOut / SimulacionOut): tasa pactada (copia guardada
 * en la compra), TEM, TEA, TCEA, días de gracia, monto capitalizado y cada fila del cronograma.
 */
import { computed } from 'vue'
import type { SimulacionOut } from '@/types/api'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import { formatDate, formatMoney, formatRate } from '@/utils/format'
import iconoPersona from '@/assets/icons/campo-persona.svg'
import iconoCuota from '@/assets/icons/regla-calendario.svg'
import iconoInteres from '@/assets/icons/capitalizacion.svg'
import iconoTotal from '@/assets/icons/compra-disponible.svg'
import iconoTabla from '@/assets/icons/compra-detalle.svg'
import iconoFecha from '@/assets/icons/campo-dia.svg'

const props = defineProps<{
  compra: SimulacionOut
  clienteNombre: string
  clienteDni?: string
  /** AL_DIA / EN_MORA (sello junto al nombre) */
  estadoPago?: string
}>()

const m = (v: string | null | undefined) => formatMoney(v, props.compra.moneda)
const enCuotas = computed(() => props.compra.modalidad === 'CUOTAS')
const periodo = computed(() => (props.compra.tasa.periodo_dias === 360 ? 'anual' : 'mensual'))
const tituloCuota = computed(() => (enCuotas.value ? 'Cuota mensual fija' : 'Pago único a fin de mes'))
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Cabecera: cliente y condiciones + métricas -->
    <div class="grid gap-6 lg:grid-cols-12">
      <section class="relative overflow-hidden rounded-card bg-white p-6 shadow-xs lg:col-span-5" aria-label="Datos de la compra">
        <span class="pointer-events-none absolute inset-y-0 left-5 w-0.5 bg-error/25" aria-hidden="true" />
        <div class="pl-6">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3">
              <span class="flex size-9 items-center justify-center rounded-full bg-primary-fixed"><img :src="iconoPersona" alt="" width="15" height="15" /></span>
              <div>
                <p class="text-label font-bold uppercase text-on-surface-variant">Vecino de confianza</p>
                <p class="text-body-lg font-bold text-on-surface">{{ clienteNombre }}</p>
                <p v-if="clienteDni" class="text-caption text-on-surface-variant">DNI: {{ clienteDni }}</p>
              </div>
            </div>
            <StatusStamp v-if="estadoPago" :estado="estadoPago" />
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-control bg-surface-low p-3">
            <div>
              <dt class="text-caption font-semibold text-on-surface-variant">Monto de la compra (capital inicial)</dt>
              <dd class="text-body-lg font-bold">{{ m(compra.monto_total) }}</dd>
            </div>
            <div>
              <dt class="text-caption font-semibold text-on-surface-variant">Tasa pactada del cliente</dt>
              <dd class="text-body-lg font-bold text-primary">
                {{ formatRate(compra.tasa.valor) }}
                <span class="text-caption font-normal text-on-surface-variant">{{ compra.tasa.tipo === 'NOMINAL' ? 'nominal' : 'efectiva' }} {{ periodo }}</span>
              </dd>
              <dd class="text-caption font-semibold text-primary">TEM {{ formatRate(compra.tasa.tem_pct, 4) }} · TEA {{ formatRate(compra.tasa.tea_pct, 4) }}</dd>
            </div>
            <div>
              <dt class="text-caption font-semibold text-on-surface-variant">Plazo acordado</dt>
              <dd class="text-body font-bold">{{ enCuotas ? `${compra.num_cuotas} ${compra.num_cuotas === 1 ? 'cuota' : 'cuotas'}` : 'Pago a fin de mes' }}</dd>
              <dd class="text-caption text-on-surface-variant">Corte {{ formatDate(compra.fecha_corte) }} · Pago {{ formatDate(compra.fecha_pago) }}</dd>
            </div>
            <div>
              <dt class="text-caption font-semibold text-on-surface-variant">Cómputo período de gracia</dt>
              <dd class="text-body font-bold text-primary">Días de gracia: {{ compra.dias_gracia }}</dd>
              <dd class="text-caption text-on-surface-variant">Compra {{ formatDate(compra.fecha_hora) }} a la fecha de pago {{ formatDate(compra.fecha_pago) }}</dd>
            </div>
            <div v-if="enCuotas" class="col-span-2 flex items-center justify-between gap-2 rounded-stamp border border-surface-highest bg-white px-3 py-2">
              <div>
                <p class="text-caption font-semibold text-on-surface">Capital luego de capitalizar (saldo base)</p>
                <p class="text-caption text-on-surface-variant">Capital inicial {{ m(compra.monto_total) }} + interés compensatorio de los días de gracia</p>
              </div>
              <p class="text-body-lg font-bold text-primary">{{ m(compra.monto_capitalizado) }}</p>
            </div>
          </dl>
        </div>
      </section>

      <div class="grid gap-4 sm:grid-cols-3 lg:col-span-7">
        <div class="rounded-card bg-white p-4 shadow-xs">
          <span class="flex size-8 items-center justify-center rounded-control bg-surface-container"><img :src="iconoCuota" alt="" width="11.25" height="12.5" /></span>
          <p class="mt-3 text-label font-bold uppercase text-on-surface-variant">{{ tituloCuota }}</p>
          <p class="text-display font-bold text-primary">{{ m(compra.valor_cuota) }}</p>
          <p class="text-caption text-on-surface-variant">{{ enCuotas ? 'Puntual cada mes' : `Vence el ${formatDate(compra.fecha_pago)}` }}</p>
        </div>
        <div class="rounded-card bg-white p-4 shadow-xs">
          <span class="flex size-8 items-center justify-center rounded-control bg-surface-container"><img :src="iconoInteres" alt="" width="12" height="16.5" /></span>
          <p class="mt-3 text-label font-bold uppercase text-on-surface-variant">Total intereses</p>
          <p class="text-display font-bold text-primary">{{ m(compra.interes_total) }}</p>
          <p class="text-caption text-on-surface-variant">TEM {{ formatRate(compra.tasa.tem_pct) }}</p>
        </div>
        <div class="rounded-card bg-white p-4 shadow-xs">
          <span class="flex size-8 items-center justify-center rounded-control bg-surface-container"><img :src="iconoTotal" alt="" width="15" height="15" /></span>
          <p class="mt-3 text-label font-bold uppercase text-on-surface-variant">Total a pagar</p>
          <p class="text-display font-bold text-on-surface">{{ m(compra.total_a_pagar) }}</p>
          <p class="text-caption text-on-surface-variant">Capital + interés</p>
        </div>
        <div class="flex items-center justify-between gap-2 rounded-card bg-primary p-4 text-white shadow-xs sm:col-span-3">
          <div>
            <p class="text-label font-bold uppercase text-primary-fixed-dim">TCEA · Tasa de costo efectivo anual</p>
            <p class="text-caption text-primary-fixed">Costo total del fiado en un año comercial de 360 días</p>
          </div>
          <p class="text-headline font-bold">{{ compra.tcea_pct ? formatRate(compra.tcea_pct, 4) : '—' }}</p>
        </div>
      </div>
    </div>

    <!-- Tabla contable de amortización -->
    <section class="relative overflow-hidden rounded-card bg-surface-container shadow-xs" aria-labelledby="titulo-amortizacion">
      <h2 id="titulo-amortizacion" class="flex items-center gap-2 px-6 py-4 text-body-lg font-semibold text-on-surface">
        <img :src="iconoTabla" alt="" width="16" height="16" /> Tabla Contable de Amortización
      </h2>
      <div class="overflow-x-auto bg-white">
        <table class="w-full min-w-[760px] border-collapse text-body">
          <caption class="sr-only">Cronograma de pagos</caption>
          <thead class="bg-surface-container text-label font-semibold uppercase text-on-surface-variant">
            <tr>
              <th scope="col" class="py-4 pl-10 pr-4 text-center">N.º cuota</th>
              <th scope="col" class="px-4 py-4 text-left">Fecha de pago</th>
              <th scope="col" class="px-4 py-4 text-right">Saldo inicial</th>
              <th scope="col" class="px-4 py-4 text-right">Interés comp.</th>
              <th scope="col" class="px-4 py-4 text-right">Amortización</th>
              <th scope="col" class="bg-primary-fixed/40 px-4 py-4 text-right text-primary">{{ enCuotas ? 'Cuota fija' : 'Pago total' }}</th>
              <th scope="col" class="px-4 py-4 text-right">Saldo final</th>
              <th scope="col" class="px-4 py-4 pr-6 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in compra.cronograma" :key="c.numero" class="border-t border-surface-container">
              <td class="py-3 pl-10 pr-4 text-center">
                <span class="inline-flex size-7 items-center justify-center rounded-full bg-surface-container text-caption font-bold text-primary">{{ String(c.numero).padStart(2, '0') }}</span>
              </td>
              <td class="px-4 py-3"><span class="inline-flex items-center gap-1"><img :src="iconoFecha" alt="" width="12" height="13.33" /> {{ formatDate(c.fecha_vencimiento) }}</span></td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ m(c.saldo_inicial) }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums text-primary">{{ m(c.interes) }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ m(c.amortizacion) }}</td>
              <td class="bg-primary-fixed/30 px-4 py-3 text-right font-bold tabular-nums text-primary">{{ m(c.cuota) }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ m(c.saldo_final) }}</td>
              <td class="px-4 py-3 pr-6 text-center"><StatusStamp :estado="c.estado ?? 'PENDIENTE'" /></td>
            </tr>
          </tbody>
          <tfoot class="border-t-2 border-surface-highest bg-surface-low">
            <tr>
              <td class="py-4 pl-10 pr-4 text-center text-label font-bold uppercase text-on-surface-variant">Balance</td>
              <td class="px-4 py-4 text-body-lg font-bold">TOTALES</td>
              <td class="px-4 py-4 text-right text-on-surface-variant">—</td>
              <td class="px-4 py-4 text-right font-bold tabular-nums text-primary">{{ m(compra.interes_total) }}</td>
              <td class="px-4 py-4 text-right font-bold tabular-nums">{{ m(compra.monto_capitalizado) }}</td>
              <td class="bg-primary-fixed/40 px-4 py-4 text-right font-bold tabular-nums text-primary underline">{{ m(compra.total_a_pagar) }}</td>
              <td class="px-4 py-4 text-right font-bold tabular-nums text-primary underline">{{ m(compra.cronograma.at(-1)?.saldo_final) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p v-if="enCuotas" class="bg-white px-10 pb-4 pt-1 text-caption text-on-surface-variant">
        Método francés vencido ordinario. El total de intereses incluye el de los {{ compra.dias_gracia }} días de gracia, que se capitaliza en el saldo inicial
        de la primera cuota; la última cuota ajusta el redondeo.
      </p>
    </section>
  </div>
</template>
