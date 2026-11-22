<script setup lang="ts">
/**
 * Listados de pago (/tienda/listados). Rol: ADMIN_TIENDA.
 * - "Generar listados del corte": POST /statements/generar con una fecha de corte; muestra los
 *   generados y los omitidos con su motivo. (El backend también los genera solo al pasar el corte.)
 * - Tabla de listados con cliente, corte, fecha de pago, total, estado y sello VENCIDO.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import * as statements from '@/api/statements'
import * as customers from '@/api/customers'
import { ApiError } from '@/api/http'
import DataTable from '@/components/ui/DataTable.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import FormField from '@/components/forms/FormField.vue'
import SearchSelect from '@/components/forms/SearchSelect.vue'
import type { ResultadoBusqueda } from '@/components/forms/estilos'
import type { Columna } from '@/components/ui/tabla'
import type { ClienteOut, EstadoCuentaResumen, GeneracionOut } from '@/types/api'
import { useToastStore } from '@/stores/toast'
import { formatDate, hoyLima } from '@/utils/format'
import iconoVer from '@/assets/icons/accion-ver.svg'
import iconoPago from '@/assets/icons/nav-pago.svg'

const toast = useToastStore()
const LIMITE = 10

// ---------------- Generar ----------------
const fechaCorte = ref(hoyLima())
const generando = ref(false)
const resultado = ref<GeneracionOut | null>(null)
const errorGenerar = ref<string | null>(null)
const nombres = ref<Record<number, string>>({})

async function generar() {
  generando.value = true
  errorGenerar.value = null
  resultado.value = null
  try {
    resultado.value = await statements.generar(fechaCorte.value)
    toast.exito(`${resultado.value.generados.length} listado(s) generado(s) para el corte del ${formatDate(fechaCorte.value)}`)
    await cargar()
  } catch (e) {
    errorGenerar.value = e instanceof ApiError ? e.message : 'No se pudieron generar los listados.'
  } finally {
    generando.value = false
  }
}

// ---------------- Lista ----------------
const estado = ref('')
const offset = ref(0)
const cliente = ref<ClienteOut | null>(null)
const filtroCorte = ref('')
const listados = ref<EstadoCuentaResumen[]>([])
const total = ref(0)
const conteos = ref<Record<string, number>>({})
const cargando = ref(false)
const error = ref<string | null>(null)

let consultaActual = 0
async function cargar() {
  const consulta = ++consultaActual
  cargando.value = true
  error.value = null
  try {
    const p = await statements.listar({
      cliente_id: cliente.value?.id,
      estado: (estado.value || undefined) as statements.FiltrosListados['estado'],
      fecha_corte: filtroCorte.value || undefined,
      limit: LIMITE,
      offset: offset.value,
    })
    if (consulta !== consultaActual) return
    listados.value = p.items
    total.value = p.total
    conteos.value = p.conteos?.estado ?? {}
  } catch (e) {
    if (consulta === consultaActual) error.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los listados.'
  } finally {
    if (consulta === consultaActual) cargando.value = false
  }
}
onMounted(async () => {
  cargar()
  try {
    const r = await customers.listar({ limit: 200 })
    nombres.value = Object.fromEntries(r.items.map((c) => [c.id, `${c.nombres} ${c.apellidos}`]))
  } catch {
    // Los omitidos se muestran con el número de cliente.
  }
})
watch([estado, offset, cliente, filtroCorte], cargar)
watch([cliente, filtroCorte], () => (offset.value = 0))

const chips = computed(() => {
  const todos = Object.values(conteos.value).reduce((a, b) => a + b, 0)
  return [
    { value: '', label: 'Todos', count: todos },
    { value: 'PENDIENTE', label: 'Pendientes', count: conteos.value.PENDIENTE ?? 0 },
    { value: 'PAGADO', label: 'Pagados', count: conteos.value.PAGADO ?? 0 },
  ]
})
async function buscarClientes(q: string): Promise<ResultadoBusqueda<ClienteOut>[]> {
  const r = await customers.listar({ q, limit: 8 })
  return r.items.map((c) => ({ valor: c, texto: `${c.nombres} ${c.apellidos}`, detalle: `DNI ${c.dni}` }))
}

const columnas: Columna[] = [
  { key: 'cliente', label: 'Cliente', class: 'min-w-[180px]' },
  { key: 'fecha_corte', label: 'Corte' },
  { key: 'fecha_pago', label: 'Fecha de pago' },
  { key: 'total_a_pagar', label: 'Total', align: 'right' },
  { key: 'estado', label: 'Estado', align: 'center' },
  { key: 'acciones', label: 'Acciones', align: 'right' },
]
</script>

<template>
  <section class="pb-4">
    <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
      <span class="text-on-surface-variant">Inicio</span>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <span class="font-semibold text-primary" aria-current="page">Listado de pago</span>
    </nav>
    <h1 class="text-headline font-bold text-on-surface">Listados de Pago</h1>
    <p class="text-body text-on-surface-variant">Liquidación oficial de consumos de cada vecino a su fecha de corte.</p>

    <!-- Generar -->
    <section class="mt-6 rounded-card bg-white p-6 shadow-xs" aria-labelledby="titulo-generar">
      <h2 id="titulo-generar" class="text-title font-semibold">Generar listados del corte</h2>
      <p class="text-caption text-on-surface-variant">El sistema genera solo los listados de los cortes que ya pasaron; usa esto para forzar un corte específico.</p>
      <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField v-slot="{ id, describedBy }" label="Fecha de corte" class="sm:w-64"
          help="Fecha del ciclo que se cierra. Se genera el listado de cada cliente cuyo día de corte coincide con esta fecha, con las compras y cuotas que vencen en su fecha de pago.">
          <input :id="id" v-model="fechaCorte" type="date" :max="hoyLima()" :aria-describedby="describedBy"
            class="h-[42px] w-full rounded-control bg-surface-low px-3 text-body shadow-inset focus:outline-none focus:ring-2 focus:ring-primary-container/25" />
        </FormField>
        <button type="button" :disabled="generando || !fechaCorte"
          class="flex h-[42px] items-center justify-center gap-2 rounded-control bg-primary-container px-6 text-body font-semibold text-white shadow-btn hover:bg-primary disabled:cursor-wait disabled:opacity-60"
          @click="generar">
          <span v-if="generando" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
          {{ generando ? 'Generando…' : 'Generar listados del corte' }}
        </button>
      </div>
      <p v-if="errorGenerar" role="alert" class="mt-3 rounded-control bg-error-container px-3 py-2 text-caption font-semibold text-error">{{ errorGenerar }}</p>
      <div v-if="resultado" class="mt-4 grid gap-4 md:grid-cols-2" aria-live="polite">
        <div class="rounded-control bg-success-container/60 p-3">
          <p class="text-caption font-bold text-success">Generados ({{ resultado.generados.length }})</p>
          <ul class="mt-1 space-y-0.5 text-caption">
            <li v-for="g in resultado.generados" :key="g.id">
              <RouterLink :to="{ name: 'tienda-listado', params: { id: g.id } }" class="font-semibold hover:underline">{{ g.cliente }}</RouterLink>
              · pago {{ formatDate(g.fecha_pago) }} · <MoneyText :valor="g.total_a_pagar" :moneda="g.moneda" />
            </li>
            <li v-if="!resultado.generados.length" class="text-on-surface-variant">Ninguno.</li>
          </ul>
        </div>
        <div class="rounded-control bg-surface-low p-3">
          <p class="text-caption font-bold text-on-surface-variant">Omitidos ({{ resultado.omitidos.length }})</p>
          <ul class="mt-1 space-y-0.5 text-caption">
            <li v-for="o in resultado.omitidos" :key="o.cliente_id">
              <strong>{{ nombres[o.cliente_id] ?? `Cliente #${o.cliente_id}` }}</strong>: {{ o.motivo }}
            </li>
            <li v-if="!resultado.omitidos.length" class="text-on-surface-variant">Ninguno.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Tabla -->
    <div class="mt-8">
      <DataTable
        v-model:filtro="estado"
        v-model:offset="offset"
        :columns="columnas"
        :rows="listados"
        row-key="id"
        :total="total"
        :limit="LIMITE"
        :loading="cargando"
        :error="error"
        :chips="chips"
        nombre-registros="listados"
        caption="Listados de pago"
        empty-text="No hay listados con esos filtros."
        :row-class="(l) => (l.estado === 'PENDIENTE' && l.vencido ? 'bg-error-container/20' : '')"
      >
        <template #toolbar>
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <div class="flex items-center gap-1 sm:w-72">
              <SearchSelect :buscar="buscarClientes" :texto-seleccion="cliente ? `${cliente.nombres} ${cliente.apellidos}` : ''"
                placeholder="Filtrar por cliente…" aria-label="Filtrar por cliente" @elegir="(r) => (cliente = r.valor)" />
              <button v-if="cliente" type="button" class="rounded-control px-2 py-1 text-caption font-semibold text-primary hover:bg-surface-high" @click="cliente = null">Quitar</button>
            </div>
            <label class="flex items-center gap-1 text-caption font-semibold text-on-surface-variant">
              Corte <input v-model="filtroCorte" type="date" class="h-9 rounded-control bg-surface-low px-2 text-body shadow-inset" />
            </label>
          </div>
        </template>

        <template #cell-cliente="{ row }">
          <p class="font-semibold">{{ row.cliente }}</p>
          <p class="text-caption text-on-surface-variant">DNI {{ row.dni }}</p>
        </template>
        <template #cell-fecha_corte="{ row }"><span class="tabular-nums">{{ formatDate(row.fecha_corte) }}</span></template>
        <template #cell-fecha_pago="{ row }"><span :class="row.vencido && row.estado === 'PENDIENTE' ? 'font-semibold text-error' : ''" class="tabular-nums">{{ formatDate(row.fecha_pago) }}</span></template>
        <template #cell-total_a_pagar="{ row }"><MoneyText :valor="row.total_a_pagar" :moneda="row.moneda" class="font-semibold" /></template>
        <template #cell-estado="{ row }">
          <div class="flex flex-col items-center gap-1">
            <StatusStamp :estado="row.estado" />
            <StatusStamp v-if="row.estado === 'PENDIENTE' && row.vencido" estado="VENCIDO" />
          </div>
        </template>
        <template #cell-acciones="{ row }">
          <div class="flex items-center justify-end gap-1">
            <RouterLink :to="{ name: 'tienda-listado', params: { id: row.id } }" class="rounded-control p-1.5 hover:bg-surface-high" :aria-label="`Ver listado de ${row.cliente}`" title="Ver detalle">
              <img :src="iconoVer" alt="" width="13.5" height="13.5" />
            </RouterLink>
            <RouterLink v-if="row.estado === 'PENDIENTE'" :to="{ name: 'tienda-pago-nuevo', query: { listado: row.id } }"
              class="rounded-control p-1.5 hover:bg-primary-fixed/60" :aria-label="`Registrar pago de ${row.cliente}`" title="Registrar pago">
              <img :src="iconoPago" alt="" width="18.33" height="13.33" class="brightness-0" />
            </RouterLink>
          </div>
        </template>
      </DataTable>
    </div>
  </section>
</template>
