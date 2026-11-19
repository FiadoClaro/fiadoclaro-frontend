<script setup lang="ts">
/**
 * Compras registradas (/tienda/compras). Rol: ADMIN_TIENDA.
 * No hay pantalla en el Figma; usa la misma tabla de las listas.
 * Filtros (los aplica el backend): cliente, estado y rango de fechas.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import * as purchases from '@/api/purchases'
import * as customers from '@/api/customers'
import { ApiError } from '@/api/http'
import DataTable from '@/components/ui/DataTable.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import SearchSelect from '@/components/forms/SearchSelect.vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import type { ResultadoBusqueda } from '@/components/forms/estilos'
import type { Columna } from '@/components/ui/tabla'
import type { ClienteOut, CompraResumenOut } from '@/types/api'
import { formatDate, formatDateTime } from '@/utils/format'
import iconoVer from '@/assets/icons/accion-ver.svg'

const LIMITE = 10
const estado = ref('')
const offset = ref(0)
const cliente = ref<ClienteOut | null>(null)
const desde = ref('')
const hasta = ref('')

const compras = ref<CompraResumenOut[]>([])
const total = ref(0)
const conteos = ref<Record<string, number>>({})
const cargando = ref(false)
const error = ref<string | null>(null)

/** Nombres de los clientes (el listado de compras solo trae cliente_id). */
const nombres = ref<Record<number, string>>({})
async function cargarNombres() {
  try {
    const r = await customers.listar({ limit: 200 })
    nombres.value = Object.fromEntries(r.items.map((c) => [c.id, `${c.nombres} ${c.apellidos}`]))
  } catch {
    // Si falla, se muestra el número de cliente.
  }
}

let consultaActual = 0
async function cargar() {
  const consulta = ++consultaActual
  cargando.value = true
  error.value = null
  try {
    const p = await purchases.listar({
      cliente_id: cliente.value?.id,
      estado: (estado.value || undefined) as purchases.FiltrosCompras['estado'],
      desde: desde.value || undefined,
      hasta: hasta.value || undefined,
      limit: LIMITE,
      offset: offset.value,
    })
    if (consulta !== consultaActual) return
    compras.value = p.items
    total.value = p.total
    conteos.value = p.conteos?.estado ?? {}
  } catch (e) {
    if (consulta === consultaActual) error.value = e instanceof ApiError ? e.message : 'No se pudieron cargar las compras.'
  } finally {
    if (consulta === consultaActual) cargando.value = false
  }
}
onMounted(() => {
  cargarNombres()
  cargar()
})
watch([estado, offset, cliente, desde, hasta], cargar)
watch([cliente, desde, hasta], () => (offset.value = 0))

const chips = computed(() => {
  const todas = Object.values(conteos.value).reduce((a, b) => a + b, 0)
  return [
    { value: '', label: 'Todas', count: todas },
    { value: 'VIGENTE', label: 'Vigentes', count: conteos.value.VIGENTE ?? 0 },
    { value: 'CANCELADA', label: 'Pagadas', count: conteos.value.CANCELADA ?? 0 },
    { value: 'ANULADA', label: 'Anuladas', count: conteos.value.ANULADA ?? 0 },
  ]
})

async function buscarClientes(q: string): Promise<ResultadoBusqueda<ClienteOut>[]> {
  const r = await customers.listar({ q, limit: 8 })
  return r.items.map((c) => ({ valor: c, texto: `${c.nombres} ${c.apellidos}`, detalle: `DNI ${c.dni}` }))
}

const columnas: Columna[] = [
  { key: 'fecha_hora', label: 'Fecha y hora' },
  { key: 'cliente', label: 'Cliente', class: 'min-w-[180px]' },
  { key: 'modalidad', label: 'Modalidad' },
  { key: 'monto_total', label: 'Monto', align: 'right' },
  { key: 'interes_total', label: 'Interés', align: 'right' },
  { key: 'ciclo', label: 'Corte / pago' },
  { key: 'estado', label: 'Estado', align: 'center' },
  { key: 'acciones', label: 'Ver', align: 'right' },
]
</script>

<template>
  <section class="pb-4">
    <div class="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
          <span class="text-on-surface-variant">Inicio</span>
          <span class="text-outline-variant" aria-hidden="true">/</span>
          <span class="font-semibold text-primary" aria-current="page">Compras</span>
        </nav>
        <h1 class="text-headline font-bold text-on-surface">Compras fiadas registradas</h1>
        <p class="text-body text-on-surface-variant">Cada compra guarda la tasa pactada al momento de registrarla.</p>
      </div>
      <RouterLink :to="{ name: 'tienda-compra-nueva' }" class="self-start rounded-control bg-primary-container px-4 py-2.5 text-body font-semibold text-white shadow-btn hover:bg-primary sm:self-auto">
        + Registrar compra
      </RouterLink>
    </div>

    <DataTable
      v-model:filtro="estado"
      v-model:offset="offset"
      :columns="columnas"
      :rows="compras"
      row-key="id"
      :total="total"
      :limit="LIMITE"
      :loading="cargando"
      :error="error"
      :chips="chips"
      nombre-registros="compras"
      caption="Compras registradas"
      empty-text="No hay compras con esos filtros."
    >
      <template #toolbar>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <div class="flex items-center gap-1 sm:w-72">
            <SearchSelect :buscar="buscarClientes" :texto-seleccion="cliente ? `${cliente.nombres} ${cliente.apellidos}` : ''"
              placeholder="Filtrar por cliente…" aria-label="Filtrar por cliente" @elegir="(r) => (cliente = r.valor)" />
            <button v-if="cliente" type="button" class="rounded-control px-2 py-1 text-caption font-semibold text-primary hover:bg-surface-high" @click="cliente = null">Quitar</button>
          </div>
          <label class="flex items-center gap-1 text-caption font-semibold text-on-surface-variant">
            Desde <input v-model="desde" type="date" class="h-9 rounded-control bg-surface-low px-2 text-body shadow-inset" />
          </label>
          <label class="flex items-center gap-1 text-caption font-semibold text-on-surface-variant">
            Hasta <input v-model="hasta" type="date" class="h-9 rounded-control bg-surface-low px-2 text-body shadow-inset" />
          </label>
          <HelpTip campo="Filtros de compras" texto="Filtra por vecino y por el rango de fechas en que se hizo la compra (ambas fechas incluidas). Los chips filtran por estado." />
        </div>
      </template>

      <template #cell-fecha_hora="{ row }"><span class="tabular-nums">{{ formatDateTime(row.fecha_hora) }}</span></template>
      <template #cell-cliente="{ row }">
        <RouterLink :to="{ name: 'tienda-cliente', params: { id: row.cliente_id } }" class="font-semibold hover:underline">
          {{ nombres[row.cliente_id] ?? `Cliente #${row.cliente_id}` }}
        </RouterLink>
      </template>
      <template #cell-modalidad="{ row }">
        {{ row.modalidad === 'CUOTAS' ? `${row.num_cuotas} cuotas` : 'Fin de mes' }}
      </template>
      <template #cell-monto_total="{ row }"><MoneyText :valor="row.monto_total" :moneda="row.moneda" class="font-semibold" /></template>
      <template #cell-interes_total="{ row }"><MoneyText :valor="row.interes_total" :moneda="row.moneda" class="text-tertiary" /></template>
      <template #cell-ciclo="{ row }"><span class="text-caption">{{ formatDate(row.fecha_corte) }} · {{ formatDate(row.fecha_pago) }}</span></template>
      <template #cell-estado="{ row }"><StatusStamp :estado="row.estado" /></template>
      <template #cell-acciones="{ row }">
        <RouterLink :to="{ name: 'tienda-compra', params: { id: row.id } }" class="inline-flex rounded-control p-1.5 hover:bg-surface-high" :aria-label="`Ver cronograma de la compra ${row.id}`">
          <img :src="iconoVer" alt="" width="13.5" height="13.5" />
        </RouterLink>
      </template>
    </DataTable>
  </section>
</template>
