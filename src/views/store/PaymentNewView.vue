<script setup lang="ts">
/**
 * Pantalla 10 — Registrar Pago de Fiado (/tienda/pagos/nuevo?listado=ID, Figma node 4-8448).
 *
 * - Al cambiar la fecha de pago se llama GET /payments/cotizar/{id}?fecha_pago=... y se actualiza
 *   la deuda (capital, compensatorio, mora) y la "Imputación Legal y Contable del Abono"
 *   (1 mora, 2 compensatorio por atraso, 3 compensatorio, 4 capital). Todo lo calcula el backend.
 * - El monto total exigible está BLOQUEADO: no hay pagos parciales.
 * - Registrar envía POST /payments con el monto exacto de la cotización y muestra el comprobante.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import * as statements from '@/api/statements'
import * as payments from '@/api/payments'
import { ApiError } from '@/api/http'
import FormField from '@/components/forms/FormField.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import { CONCEPTOS, nombreConcepto } from '@/components/statements/conceptos'
import type { CotizacionOut, EstadoCuentaOut, EstadoCuentaResumen, PagoOut } from '@/types/api'
import { useToastStore } from '@/stores/toast'
import { formatDate, formatMoney, hoyLima } from '@/utils/format'
import iconoPersona from '@/assets/icons/campo-persona.svg'
import iconoBanco from '@/assets/icons/reglas-libro.svg'
import iconoAlerta from '@/assets/icons/regla-alerta.svg'
import iconoLiquidacion from '@/assets/icons/nav-pago.svg'
import iconoLista from '@/assets/icons/compra-detalle.svg'
import iconoFormulario from '@/assets/icons/resumen-apertura.svg'
import iconoCalendario from '@/assets/icons/campo-dia.svg'
import iconoCandado from '@/assets/icons/campo-candado.svg'
import iconoOk from '@/assets/icons/modal-confirmar.svg'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const idListado = computed(() => (route.query.listado ? Number(route.query.listado) : null))

// ---------------- Sin listado elegido: escoger uno pendiente ----------------
const pendientes = ref<EstadoCuentaResumen[]>([])
async function cargarPendientes() {
  try {
    pendientes.value = (await statements.listar({ estado: 'PENDIENTE', limit: 200 })).items
  } catch {
    pendientes.value = []
  }
}
const opcionesPendientes = computed(() =>
  pendientes.value.map((l) => ({ value: l.id, label: `${l.cliente} · corte ${formatDate(l.fecha_corte)} · ${formatMoney(l.total_a_pagar, l.moneda)}${l.vencido ? ' · VENCIDO' : ''}` })),
)
function elegirListado(id: number | null) {
  if (id) router.replace({ query: { listado: id } })
}

// ---------------- Listado y cotización ----------------
const listado = ref<EstadoCuentaOut | null>(null)
const fechaPago = ref(hoyLima())
const cotizacion = ref<CotizacionOut | null>(null)
const cotizando = ref(false)
const error = ref<string | null>(null)
const comprobante = ref<PagoOut | null>(null)

async function cargarListado() {
  listado.value = null
  cotizacion.value = null
  comprobante.value = null
  error.value = null
  if (!idListado.value) {
    await cargarPendientes()
    return
  }
  try {
    listado.value = await statements.obtener(idListado.value)
    if (listado.value.estado !== 'PENDIENTE') {
      error.value = 'Este listado ya fue pagado.'
      return
    }
    fechaPago.value = hoyLima()
    await cotizar()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo cargar el listado.'
  }
}
watch(idListado, cargarListado, { immediate: true })

let consulta = 0
async function cotizar() {
  if (!idListado.value || !fechaPago.value) return
  const actual = ++consulta
  cotizando.value = true
  try {
    const c = await payments.cotizar(idListado.value, fechaPago.value)
    if (actual !== consulta) return
    cotizacion.value = c
    error.value = null
  } catch (e) {
    if (actual !== consulta) return
    cotizacion.value = null
    error.value = e instanceof ApiError ? e.message : 'No se pudo calcular el total exigible.'
  } finally {
    if (actual === consulta) cotizando.value = false
  }
}
// Al cambiar la fecha, se vuelve a cotizar (con una pequeña espera).
let espera: ReturnType<typeof setTimeout> | undefined
watch(fechaPago, () => {
  clearTimeout(espera)
  espera = setTimeout(cotizar, 300)
})
onBeforeUnmount(() => clearTimeout(espera))

const moneda = computed(() => listado.value?.moneda ?? 'PEN')
const m = (v: string | null | undefined) => formatMoney(v, moneda.value)
const esHoy = computed(() => fechaPago.value === hoyLima())
const todoImputado = computed(() => (cotizacion.value?.prelacion ?? []).every((p) => /^0+(\.0+)?$/.test(p.saldo)))

// ---------------- Registrar ----------------
const registrando = ref(false)
async function registrar() {
  if (!cotizacion.value || !idListado.value) return
  registrando.value = true
  error.value = null
  try {
    comprobante.value = await payments.registrar({
      estado_cuenta_id: idListado.value,
      fecha_pago: cotizacion.value.fecha_pago,
      monto: cotizacion.value.total_exigible, // el monto exacto de la cotización
    })
    toast.exito(`Pago registrado: ${m(comprobante.value.monto_total)}`)
  } catch (e) {
    if (e instanceof ApiError && e.code === 'monto_distinto_al_exigible') {
      // La deuda cambió (p. ej. pasó la medianoche): se vuelve a cotizar y se avisa.
      await cotizar()
      toast.error('El total exigible cambió. Revisa el nuevo monto y vuelve a registrar.')
      error.value = e.message
    } else {
      error.value = e instanceof ApiError ? e.message : 'No se pudo registrar el pago.'
    }
  } finally {
    registrando.value = false
  }
}
</script>

<template>
  <section class="pb-8">
    <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
      <span class="text-on-surface-variant">Inicio</span>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <span class="font-semibold text-primary" aria-current="page">Registrar pago</span>
    </nav>
    <h1 class="text-headline font-bold text-on-surface">Registrar Pago de Fiado</h1>
    <p class="text-body text-on-surface-variant">Amortización total de deuda según orden de prelación contable y liquidación obligatoria de cartera.</p>

    <!-- Elegir listado -->
    <section v-if="!idListado" class="mt-6 rounded-card bg-white p-6 shadow-xs sm:max-w-2xl">
      <FormField v-slot="{ id, describedBy }" label="Listado de pago pendiente"
        help="Elige el listado que el vecino viene a pagar. Solo aparecen listados pendientes; el pago siempre es por el total.">
        <SelectInput :id="id" :model-value="null" :options="opcionesPendientes" placeholder="Elige un listado…" :aria-describedby="describedBy" @update:model-value="elegirListado" />
      </FormField>
      <p v-if="!pendientes.length" class="mt-2 text-caption text-on-surface-variant">No hay listados pendientes.</p>
    </section>

    <p v-else-if="error && !listado" role="alert" class="mt-6 rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ error }}</p>
    <p v-else-if="!listado" class="mt-6 rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando listado…</p>

    <!-- Comprobante -->
    <section v-else-if="comprobante" class="mt-6 rounded-card bg-white p-6 shadow-float sm:max-w-2xl" aria-labelledby="titulo-comprobante">
      <p class="flex items-center gap-2 text-label font-bold uppercase text-success"><img :src="iconoOk" alt="" width="15" height="15" class="brightness-0" /> Pago registrado</p>
      <h2 id="titulo-comprobante" class="mt-1 text-title font-bold">Comprobante de pago #{{ comprobante.id }}</h2>
      <p class="text-caption text-on-surface-variant">{{ listado.cliente }} · DNI {{ listado.dni }} · pagado el {{ formatDate(comprobante.fecha_pago) }}<template v-if="comprobante.dias_mora"> · {{ comprobante.dias_mora }} días de atraso</template></p>
      <table class="mt-4 w-full text-body">
        <caption class="sr-only">Imputación del pago</caption>
        <thead class="text-label uppercase text-on-surface-variant"><tr><th scope="col" class="py-2 text-left">Orden</th><th scope="col" class="py-2 text-left">Concepto</th><th scope="col" class="py-2 text-right">Imputado</th></tr></thead>
        <tbody>
          <tr v-for="i in comprobante.imputacion" :key="i.orden" class="border-t border-surface-container">
            <td class="py-2">{{ i.orden }}</td><td class="py-2">{{ nombreConcepto(i.concepto) }}</td><td class="py-2 text-right font-semibold tabular-nums">{{ m(i.imputado) }}</td>
          </tr>
        </tbody>
        <tfoot><tr class="border-t-2 border-surface-highest"><td colspan="2" class="py-2 font-bold">Total pagado</td><td class="py-2 text-right text-title font-bold text-primary">{{ m(comprobante.monto_total) }}</td></tr></tfoot>
      </table>
      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink :to="{ name: 'tienda-listado', params: { id: listado.id } }" class="rounded-control bg-primary-container px-5 py-2.5 text-body font-semibold text-white shadow-btn hover:bg-primary">Ver listado</RouterLink>
        <RouterLink :to="{ name: 'tienda-listados' }" class="rounded-control bg-surface-high px-5 py-2.5 text-body font-semibold text-primary hover:bg-surface-highest">Volver a listados</RouterLink>
      </div>
    </section>

    <!-- Formulario de pago -->
    <div v-else class="mt-6 grid gap-6 lg:grid-cols-12">
      <div class="flex flex-col gap-6 lg:col-span-7">
        <!-- Titular -->
        <section class="flex items-center gap-3 rounded-card border-l-4 border-primary bg-white p-4 shadow-xs" aria-label="Titular del fiado">
          <span class="flex size-10 items-center justify-center rounded-full bg-surface-container"><img :src="iconoPersona" alt="" width="15" height="15" /></span>
          <div>
            <p class="flex items-center gap-2 text-label font-bold uppercase text-on-surface-variant">
              Titular del fiado
              <span v-if="cotizacion?.dias_mora" class="rounded-stamp bg-tertiary-fixed px-1.5 text-tertiary">{{ cotizacion.dias_mora }} días retraso</span>
            </p>
            <p class="text-title font-bold">{{ listado.cliente }}</p>
            <p class="text-caption text-on-surface-variant">DNI {{ listado.dni }} · corte {{ formatDate(listado.fecha_corte) }} · pago pactado {{ formatDate(listado.fecha_pago) }}</p>
          </div>
        </section>

        <!-- Resumen de deuda -->
        <section class="rounded-card bg-white p-6 shadow-xs" aria-labelledby="titulo-deuda" :class="cotizando ? 'opacity-70' : ''">
          <div class="flex items-center justify-between gap-2">
            <h2 id="titulo-deuda" class="flex items-center gap-2 text-body-lg font-semibold"><img :src="iconoBanco" alt="" width="18" height="13" /> Resumen de Deuda Exigible</h2>
            <span v-if="cotizacion" class="rounded-full bg-surface-container px-2 py-0.5 text-caption font-semibold">Corte al: {{ formatDate(cotizacion.fecha_pago) }}</span>
          </div>
          <div v-if="cotizacion" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-control bg-surface-low p-3"><p class="text-label font-bold uppercase text-on-surface-variant">1. Capital</p><p class="text-title font-bold">{{ m(cotizacion.capital) }}</p></div>
            <div class="rounded-control bg-surface-low p-3"><p class="text-label font-bold uppercase text-on-surface-variant">2. Interés pactado</p><p class="text-title font-bold text-primary">{{ m(cotizacion.interes_compensatorio) }}</p></div>
            <div class="rounded-control bg-surface-low p-3"><p class="text-label font-bold uppercase text-on-surface-variant">3. Interés por atraso</p><p class="text-title font-bold text-primary">{{ m(cotizacion.interes_compensatorio_mora) }}</p></div>
            <div :class="cotizacion.dias_mora ? 'bg-error-container' : 'bg-surface-low'" class="rounded-control p-3">
              <p class="flex items-center justify-between text-label font-bold uppercase text-error">4. Mora ({{ cotizacion.dias_mora }} días) <img v-if="cotizacion.dias_mora" :src="iconoAlerta" alt="" width="12" height="10" /></p>
              <p class="text-title font-bold text-error">{{ m(cotizacion.interes_moratorio) }}</p>
            </div>
          </div>
          <div v-if="cotizacion" class="mt-4 flex items-center justify-between gap-3 rounded-control bg-surface-container p-4">
            <div class="flex items-center gap-2">
              <span class="flex size-9 items-center justify-center rounded-control bg-primary-container"><img :src="iconoLiquidacion" alt="" width="18" height="13" class="brightness-0 invert" /></span>
              <div>
                <p class="text-label font-bold uppercase text-on-surface-variant">Liquidación total exigible</p>
                <p class="text-caption text-on-surface-variant">Suma de capital, compensatorios y moratorio</p>
              </div>
            </div>
            <p class="text-display font-bold text-primary underline decoration-double underline-offset-8">{{ m(cotizacion.total_exigible) }}</p>
          </div>
        </section>

        <!-- Imputación -->
        <section v-if="cotizacion" class="relative overflow-hidden rounded-card bg-white p-6 shadow-xs" aria-labelledby="titulo-imputacion" :class="cotizando ? 'opacity-70' : ''">
          <span class="pointer-events-none absolute inset-y-0 left-4 w-0.5 bg-error/25" aria-hidden="true" />
          <h2 id="titulo-imputacion" class="flex items-center gap-2 pl-4 text-body-lg font-semibold">
            <img :src="iconoLista" alt="" width="16" height="16" /> Imputación Legal y Contable del Abono
            <HelpTip campo="Imputación" texto="Orden en que se aplica el pago (prelación): primero la mora, luego el interés compensatorio por atraso, después el interés compensatorio pactado y al final el capital." />
          </h2>
          <div class="mt-4 overflow-x-auto pl-4">
            <table class="w-full min-w-[520px] text-body">
              <caption class="sr-only">Imputación del pago por prelación</caption>
              <thead class="bg-surface-container text-label font-semibold uppercase text-on-surface-variant">
                <tr>
                  <th scope="col" class="px-3 py-3 text-left">Orden</th>
                  <th scope="col" class="px-3 py-3 text-left">Concepto prelativo</th>
                  <th scope="col" class="px-3 py-3 text-right">Exigible</th>
                  <th scope="col" class="px-3 py-3 text-right text-primary">Imputado</th>
                  <th scope="col" class="px-3 py-3 text-right">Saldo restante</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in cotizacion.prelacion" :key="p.orden" class="border-t border-surface-container">
                  <td class="px-3 py-3"><span :class="p.orden === 1 ? 'bg-error-container text-error' : 'bg-surface-high'" class="flex size-6 items-center justify-center rounded-full text-caption font-bold">{{ p.orden }}</span></td>
                  <td class="px-3 py-3">
                    <p class="font-semibold">{{ nombreConcepto(p.concepto) }}</p>
                    <p :class="p.orden === 1 ? 'text-error' : 'text-on-surface-variant'" class="text-caption">{{ CONCEPTOS[p.concepto]?.detalle }}</p>
                  </td>
                  <td :class="p.orden === 1 ? 'text-error' : ''" class="px-3 py-3 text-right font-bold tabular-nums">{{ m(p.exigible) }}</td>
                  <td class="px-3 py-3 text-right font-bold tabular-nums text-primary">{{ m(p.imputado) }}</td>
                  <td class="px-3 py-3 text-right tabular-nums text-on-surface-variant">{{ m(p.saldo) }}</td>
                </tr>
              </tbody>
              <tfoot class="bg-surface-container">
                <tr>
                  <td colspan="2" class="px-3 py-3 text-label font-bold uppercase">Total imputado a la cuenta</td>
                  <td class="px-3 py-3 text-right font-bold tabular-nums">{{ m(cotizacion.total_exigible) }}</td>
                  <td class="px-3 py-3 text-right font-bold tabular-nums text-primary">{{ m(cotizacion.total_exigible) }}</td>
                  <td class="px-3 py-3 text-right font-bold text-primary">{{ todoImputado ? 'Sin saldo' : '—' }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      <!-- Formulario -->
      <aside class="lg:col-span-5">
        <section class="rounded-card bg-white p-6 shadow-xs lg:sticky lg:top-20" aria-labelledby="titulo-form-pago">
          <h2 id="titulo-form-pago" class="flex items-center gap-2 text-body-lg font-semibold"><img :src="iconoFormulario" alt="" width="15" height="16.67" /> Formulario de Registro</h2>
          <div class="mt-4 flex flex-col gap-4">
            <FormField v-slot="{ id, describedBy, invalid }" label="Fecha de pago" :error="error && cotizacion === null ? error : null"
              help="Día en que el vecino paga. No puede ser futura ni anterior al corte. Si es posterior a la fecha de pago pactada, se suma la mora por los días de atraso.">
              <div class="relative">
                <img :src="iconoCalendario" alt="" width="12" height="13.33" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                <input :id="id" v-model="fechaPago" type="date" :min="listado.fecha_corte" :max="hoyLima()" :aria-describedby="describedBy" :aria-invalid="invalid || undefined"
                  class="h-[42px] w-full rounded-control bg-tertiary-fixed/40 pl-9 pr-16 text-body-lg font-bold shadow-inset focus:outline-none focus:ring-2 focus:ring-primary-container/25" />
                <span v-if="esHoy" class="absolute right-3 top-1/2 -translate-y-1/2 rounded-stamp bg-tertiary-fixed px-1.5 text-label font-bold text-tertiary">HOY</span>
              </div>
            </FormField>
            <FormField v-slot="{ id, describedBy }" label="Monto total exigible"
              help="Lo calcula el sistema a la fecha de pago y no se puede editar: no se aceptan pagos parciales, se cancela el listado completo.">
              <div class="relative">
                <input :id="id" :value="cotizacion ? m(cotizacion.total_exigible) : '—'" readonly :aria-describedby="describedBy" aria-readonly="true"
                  class="h-12 w-full cursor-not-allowed rounded-control bg-surface-high px-4 text-title font-bold text-on-surface-variant" />
                <img :src="iconoCandado" alt="" width="12" height="15.75" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
              <p class="flex items-center gap-1 text-caption text-on-surface-variant"><img :src="iconoCandado" alt="" width="9" height="12" /> Bloqueado por sistema</p>
            </FormField>
            <p v-if="error && cotizacion" role="alert" class="rounded-control bg-error-container px-3 py-2 text-caption font-semibold text-error">{{ error }}</p>
            <button type="button" :disabled="!cotizacion || cotizando || registrando"
              class="flex items-center justify-center gap-2 rounded-control bg-primary-container px-4 py-3 text-body-lg font-semibold text-white shadow-btn hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              @click="registrar">
              <span v-if="registrando" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              <img v-else :src="iconoOk" alt="" width="15" height="15" />
              {{ registrando ? 'Registrando…' : cotizacion ? `Registrar Pago (${m(cotizacion.total_exigible)})` : 'Registrar Pago' }}
            </button>
          </div>
        </section>
      </aside>
    </div>
  </section>
</template>
