<script setup lang="ts">
/**
 * Pantalla 4 — Cartera de Clientes Frecuentes (Figma 4b node 32-2; modal de baja node 4-5385).
 * Rol: ADMIN_TIENDA. Filtros: Todos, Al día, En mora, De baja (estado = AL_DIA | EN_MORA | BAJA).
 * El estado de pago y el crédito utilizado los calcula el backend.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import * as customers from '@/api/customers'
import { ApiError } from '@/api/http'
import DataTable from '@/components/ui/DataTable.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { Columna } from '@/components/ui/tabla'
import type { ClienteOut } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatRate, formatTime } from '@/utils/format'
import { iniciales } from '@/layouts/nav'
import BarraCredito from './customers/BarraCredito.vue'
import iconoNuevo from '@/assets/icons/nuevo-cliente.svg'
import iconoEditar from '@/assets/icons/accion-editar.svg'
import iconoVer from '@/assets/icons/accion-ver.svg'
import iconoBaja from '@/assets/icons/accion-baja-cliente.svg'
import iconoReactivar from '@/assets/icons/accion-reactivar.svg'
import iconoModalBaja from '@/assets/icons/modal-cliente-baja.svg'

const auth = useAuthStore()
const toast = useToastStore()
const LIMITE = 10

const busqueda = ref('')
const estado = ref('') // '' | AL_DIA | EN_MORA | BAJA
const offset = ref(0)

const clientes = ref<ClienteOut[]>([])
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
    const pagina = await customers.listar({
      q: busqueda.value,
      estado: (estado.value || undefined) as customers.EstadoCliente | undefined,
      limit: LIMITE,
      offset: offset.value,
    })
    if (consulta !== consultaActual) return
    clientes.value = pagina.items
    total.value = pagina.total
    conteos.value = pagina.conteos?.estado ?? {}
  } catch (e) {
    if (consulta === consultaActual) error.value = e instanceof ApiError ? e.message : 'No se pudo cargar la cartera.'
  } finally {
    if (consulta === consultaActual) cargando.value = false
  }
}
onMounted(cargar)
watch([busqueda, estado, offset], cargar)

const chips = computed(() => [
  { value: '', label: 'Todos', count: conteos.value.TODOS ?? 0 },
  { value: 'AL_DIA', label: 'Al día', count: conteos.value.AL_DIA ?? 0 },
  { value: 'EN_MORA', label: 'En mora', count: conteos.value.EN_MORA ?? 0 },
  { value: 'BAJA', label: 'De baja', count: conteos.value.BAJA ?? 0 },
])

const columnas: Columna[] = [
  { key: 'cliente', label: 'Cliente', class: 'min-w-[200px]' },
  { key: 'dni', label: 'DNI' },
  { key: 'tasa', label: 'Tasa / moratoria', class: 'min-w-[130px]' },
  { key: 'limite', label: 'Límite', align: 'right' },
  { key: 'utilizado', label: 'Crédito utilizado', class: 'min-w-[210px]' },
  { key: 'ciclo', label: 'Corte / pago' },
  { key: 'estado', label: 'Estado', align: 'center' },
  { key: 'acciones', label: 'Acciones', align: 'right' },
]

/** Estado que se muestra en el sello: de baja, o el estado de pago (al día / en mora). */
const estadoSello = (c: ClienteOut) => (c.estado === 'BAJA' ? 'BAJA' : c.resumen.estado_pago)
const colorAvatar = (c: ClienteOut) =>
  c.estado === 'BAJA'
    ? 'bg-surface-highest text-on-surface-variant'
    : c.resumen.estado_pago === 'EN_MORA'
      ? 'bg-error-container text-error'
      : 'bg-primary-fixed text-primary'
const periodo = (d: number) => (d === 360 ? 'anual' : 'mensual')

// ---------------- Baja / reactivación ----------------
const seleccionado = ref<ClienteOut | null>(null)
const dialogo = ref(false)
const procesando = ref(false)
const errorDialogo = ref<string | null>(null)
const reactivando = computed(() => seleccionado.value?.estado === 'BAJA')

function pedirConfirmacion(c: ClienteOut) {
  seleccionado.value = c
  errorDialogo.value = null
  dialogo.value = true
}
async function confirmar() {
  if (!seleccionado.value) return
  procesando.value = true
  errorDialogo.value = null
  const alta = reactivando.value
  try {
    const c = alta ? await customers.reactivar(seleccionado.value.id) : await customers.darDeBaja(seleccionado.value.id)
    dialogo.value = false
    toast.exito(alta ? `${c.nombres} ${c.apellidos} fue reactivado` : `${c.nombres} ${c.apellidos} fue dado de baja`)
    await cargar()
  } catch (e) {
    errorDialogo.value = e instanceof ApiError ? e.message : 'No se pudo completar la operación.'
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <section class="pb-4">
    <!-- Encabezado -->
    <div class="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav aria-label="Migas de pan" class="flex items-center gap-1 pb-1 text-caption font-semibold">
          <span class="text-on-surface-variant">Inicio</span>
          <span class="text-outline-variant" aria-hidden="true">/</span>
          <span class="font-bold text-primary" aria-current="page">Clientes</span>
        </nav>
        <h1 class="text-headline font-bold text-on-surface">Cartera de Clientes Frecuentes</h1>
        <p class="pt-0.5 text-body text-on-surface-variant">
          Control del cuaderno digital y límites de crédito asignados para {{ auth.tienda?.nombre_comercial ?? 'tu tienda' }}.
        </p>
      </div>
      <RouterLink
        :to="{ name: 'tienda-cliente-nuevo' }"
        class="flex shrink-0 items-center gap-1 self-start rounded-control bg-primary-container px-4 py-2.5 text-body font-semibold tracking-[0.14px] text-white shadow-btn transition-colors hover:bg-primary sm:self-auto"
      >
        <img :src="iconoNuevo" alt="" width="18.33" height="13.33" />
        + Nuevo Cliente
      </RouterLink>
    </div>

    <DataTable
      v-model:busqueda="busqueda"
      v-model:filtro="estado"
      v-model:offset="offset"
      :columns="columnas"
      :rows="clientes"
      row-key="id"
      :total="total"
      :limit="LIMITE"
      :loading="cargando"
      :error="error"
      :chips="chips"
      search-placeholder="Buscar por DNI o nombre..."
      folio="Cuaderno principal"
      nombre-registros="registros visualizados"
      caption="Cartera de clientes"
      empty-text="No hay clientes que coincidan. Registra el primero con “+ Nuevo Cliente”."
      :row-class="(c) => (c.estado === 'BAJA' ? 'bg-surface-high/40 text-outline' : '')"
    >
      <template #cell-cliente="{ row }">
        <RouterLink :to="{ name: 'tienda-cliente', params: { id: row.id } }" class="group flex items-center gap-2">
          <span :class="colorAvatar(row)" class="flex size-9 shrink-0 items-center justify-center rounded-full text-body font-semibold" aria-hidden="true">
            {{ iniciales(`${row.nombres} ${row.apellidos}`) }}
          </span>
          <span class="text-body-lg font-semibold text-on-surface group-hover:underline">{{ row.nombres }} {{ row.apellidos }}</span>
        </RouterLink>
      </template>
      <template #cell-dni="{ row }">
        <span class="tabular-nums text-on-surface-variant">{{ row.dni }}</span>
      </template>
      <template #cell-tasa="{ row }">
        <p class="font-semibold">{{ formatRate(row.condicion.tasa.valor) }}</p>
        <p class="text-caption text-on-surface-variant">{{ row.condicion.tasa.tipo === 'NOMINAL' ? 'nominal' : 'efectiva' }} {{ periodo(row.condicion.tasa.periodo_dias) }}</p>
        <p class="text-caption text-error">Mora: {{ formatRate(row.condicion.tasa_mora.valor) }} {{ periodo(row.condicion.tasa_mora.periodo_dias) === 'mensual' ? 'men.' : 'anual' }}</p>
      </template>
      <template #cell-limite="{ row }">
        <MoneyText :valor="row.resumen.limite" :moneda="row.condicion.moneda" class="font-semibold" />
      </template>
      <template #cell-utilizado="{ row }">
        <BarraCredito :utilizado="row.resumen.utilizado" :porcentaje="row.resumen.porcentaje_utilizado" :moneda="row.condicion.moneda" :apagado="row.estado === 'BAJA'" />
      </template>
      <template #cell-ciclo="{ row }">
        <p class="text-caption"><span class="text-on-surface-variant">Corte:</span> día {{ row.condicion.dia_corte }} · {{ formatTime(row.condicion.hora_corte) }}</p>
        <p class="text-caption"><span class="text-on-surface-variant">Pago:</span> día {{ row.condicion.dia_pago }}</p>
      </template>
      <template #cell-estado="{ row }">
        <StatusStamp :estado="estadoSello(row)" />
      </template>
      <template #cell-acciones="{ row }">
        <div class="flex items-center justify-end gap-1">
          <RouterLink :to="{ name: 'tienda-cliente-editar', params: { id: row.id } }" class="rounded-control p-1.5 hover:bg-surface-high"
            :aria-label="`Editar datos de ${row.nombres} ${row.apellidos}`" :title="`Editar datos de ${row.nombres} ${row.apellidos}`">
            <img :src="iconoEditar" alt="" width="13.5" height="13.5" />
          </RouterLink>
          <RouterLink :to="{ name: 'tienda-cliente', params: { id: row.id } }" class="rounded-control p-1.5 hover:bg-surface-high"
            :aria-label="`Ver detalle de ${row.nombres} ${row.apellidos}`" :title="`Ver detalle y condiciones`">
            <img :src="iconoVer" alt="" width="13.5" height="13.5" />
          </RouterLink>
          <button type="button" class="rounded-control p-1.5" :class="row.estado === 'BAJA' ? 'hover:bg-primary-fixed/60' : 'hover:bg-error-container/60'"
            :aria-label="`${row.estado === 'BAJA' ? 'Reactivar' : 'Dar de baja'} a ${row.nombres} ${row.apellidos}`"
            :title="row.estado === 'BAJA' ? 'Reactivar' : 'Dar de baja'" @click="pedirConfirmacion(row)">
            <img :src="row.estado === 'BAJA' ? iconoReactivar : iconoBaja" alt="" width="14.87" height="14.87" />
          </button>
        </div>
      </template>
    </DataTable>

    <ConfirmDialog
      v-model:open="dialogo"
      variante="centrado"
      :icono="iconoModalBaja"
      :titulo="reactivando ? '¿Reactivar a este cliente?' : '¿Dar de baja a este cliente?'"
      :confirm-text="reactivando ? 'Reactivar cliente' : 'Confirmar baja'"
      :tono="reactivando ? 'positivo' : 'peligro'"
      :loading="procesando"
      :error="errorDialogo"
      @confirm="confirmar"
    >
      <template #detalles>
        <div class="flex items-center justify-between border-b border-surface-highest/60 pb-2">
          <span class="text-label font-bold uppercase text-on-surface-variant">{{ reactivando ? 'Cliente a reactivar:' : 'Cliente a suspender:' }}</span>
          <span class="rounded-stamp bg-primary-fixed px-2 py-0.5 text-label font-bold text-primary">Estado: {{ seleccionado?.estado }}</span>
        </div>
        <p class="pt-2 text-body-lg font-semibold">{{ seleccionado?.nombres }} {{ seleccionado?.apellidos }}</p>
        <p class="text-caption text-on-surface-variant">DNI: <strong class="text-on-surface">{{ seleccionado?.dni }}</strong></p>
      </template>
      <template v-if="!reactivando">
        ¿Estás seguro de dar de baja a <strong class="font-semibold text-on-surface">{{ seleccionado?.nombres }} {{ seleccionado?.apellidos }} (DNI {{ seleccionado?.dni }})</strong>?
        Pasará al estado de baja y ya no podrá solicitar fiados ni compras a crédito. El historial de cuenta y saldos se mantienen registrados.
      </template>
      <template v-else>
        <strong class="font-semibold text-on-surface">{{ seleccionado?.nombres }} {{ seleccionado?.apellidos }}</strong> volverá a estar activo y podrá ingresar al portal.
      </template>
    </ConfirmDialog>
  </section>
</template>
