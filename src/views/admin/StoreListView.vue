<script setup lang="ts">
/**
 * Pantalla 2 — Lista de Tiendas (Figma 2b node 24-2; modal de baja node 4-8056).
 * Rol: ADMIN_SISTEMA.
 *
 * Búsqueda (q), filtro por giro y estado, y paginación los resuelve el backend (GET /stores).
 * Los números de los filtros vienen de `conteos` de la respuesta.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import * as stores from '@/api/stores'
import { ApiError } from '@/api/http'
import DataTable from '@/components/ui/DataTable.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import type { Columna } from '@/components/ui/tabla'
import type { TiendaOut } from '@/types/api'
import { useToastStore } from '@/stores/toast'
import { formatDate } from '@/utils/format'
import { iniciales } from '@/layouts/nav'
import iconoMiga from '@/assets/icons/miga-flecha.svg'
import iconoFiltros from '@/assets/icons/filtros.svg'
import iconoRegistrar from '@/assets/icons/registrar-tienda.svg'
import iconoEditar from '@/assets/icons/accion-editar.svg'
import iconoBaja from '@/assets/icons/accion-baja.svg'
import iconoReactivar from '@/assets/icons/accion-reactivar.svg'

const toast = useToastStore()
const LIMITE = 10

// ---------------- Filtros y datos ----------------
const busqueda = ref('')
const estado = ref<'' | 'ACTIVA' | 'BAJA'>('')
const giro = ref<string | null>(null)
const offset = ref(0)

const tiendas = ref<TiendaOut[]>([])
const total = ref(0)
const conteos = ref<Record<string, Record<string, number>>>({})
const cargando = ref(false)
const error = ref<string | null>(null)

let consultaActual = 0 // para ignorar respuestas viejas si el usuario cambia rápido los filtros
async function cargar() {
  const consulta = ++consultaActual
  cargando.value = true
  error.value = null
  try {
    const pagina = await stores.listar({
      q: busqueda.value,
      estado: estado.value || undefined,
      giro: giro.value ?? undefined,
      limit: LIMITE,
      offset: offset.value,
    })
    if (consulta !== consultaActual) return
    tiendas.value = pagina.items
    total.value = pagina.total
    conteos.value = pagina.conteos ?? {}
  } catch (e) {
    if (consulta === consultaActual) error.value = e instanceof ApiError ? e.message : 'No se pudo cargar la lista.'
  } finally {
    if (consulta === consultaActual) cargando.value = false
  }
}
onMounted(cargar)
watch([busqueda, estado, giro, offset], cargar)
// Al cambiar un filtro, volver a la primera página.
watch([estado, giro], () => (offset.value = 0))

// ---------------- Textos de conteo ----------------
const porEstado = computed(() => conteos.value.estado ?? {})
const activas = computed(() => porEstado.value.ACTIVA ?? 0)
const deBaja = computed(() => porEstado.value.BAJA ?? 0)
const resumen = computed(() => `(${activas.value} ${activas.value === 1 ? 'activa' : 'activas'}, ${deBaja.value} de baja)`)

const opcionesGiro = computed(() => {
  const porGiro = conteos.value.giro ?? {}
  const todas = Object.values(porGiro).reduce((a, b) => a + b, 0)
  return [
    { value: '', label: `Todos los giros (${todas})` },
    ...Object.entries(porGiro)
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([g, n]) => ({ value: g, label: `${g} (${n})` })),
  ]
})
const giroSeleccionado = computed({
  get: () => giro.value ?? '',
  set: (v: string | null) => (giro.value = v || null),
})

// ---------------- Menú "Filtros" (estado) ----------------
const menuFiltros = ref(false)
const raizFiltros = ref<HTMLElement | null>(null)
const opcionesEstado = computed(() => [
  { value: '' as const, label: 'Todas', count: activas.value + deBaja.value },
  { value: 'ACTIVA' as const, label: 'Activas', count: activas.value },
  { value: 'BAJA' as const, label: 'De baja', count: deBaja.value },
])
function elegirEstado(v: '' | 'ACTIVA' | 'BAJA') {
  estado.value = v
  menuFiltros.value = false
}
function cerrarMenuSiFuera(e: PointerEvent) {
  if (menuFiltros.value && raizFiltros.value && !raizFiltros.value.contains(e.target as Node)) menuFiltros.value = false
}
onMounted(() => document.addEventListener('pointerdown', cerrarMenuSiFuera))
onBeforeUnmount(() => document.removeEventListener('pointerdown', cerrarMenuSiFuera))

// ---------------- Tabla ----------------
const columnas: Columna[] = [
  { key: 'nombre_comercial', label: 'Nombre comercial', class: 'min-w-[220px]' },
  { key: 'ruc', label: 'RUC' },
  { key: 'administrador', label: 'Administrador', class: 'min-w-[180px]' },
  { key: 'created_at', label: 'Fecha de alta' },
  { key: 'estado', label: 'Estado', align: 'center' },
  { key: 'acciones', label: 'Acciones', align: 'right' },
]

// Colores de los avatares de tienda (Figma 2b): se eligen por id para que cada tienda tenga siempre el mismo.
const COLORES_AVATAR = [
  'bg-primary-container text-white',
  'bg-primary-fixed text-primary-on-fixed-variant',
  'bg-primary-container/20 text-primary',
  'bg-tertiary-fixed text-[#2a1700]',
  'bg-primary-container/30 text-primary',
]
function colorAvatar(t: TiendaOut) {
  return t.estado === 'BAJA' ? 'bg-surface-highest text-on-surface-variant' : COLORES_AVATAR[t.id % COLORES_AVATAR.length]
}

// ---------------- Baja y reactivación ----------------
const seleccionada = ref<TiendaOut | null>(null)
const accion = ref<'baja' | 'alta'>('baja')
const dialogoAbierto = ref(false)
const procesando = ref(false)
const errorDialogo = ref<string | null>(null)

function pedirConfirmacion(t: TiendaOut, tipo: 'baja' | 'alta') {
  seleccionada.value = t
  accion.value = tipo
  errorDialogo.value = null
  dialogoAbierto.value = true
}

async function confirmar() {
  if (!seleccionada.value) return
  procesando.value = true
  errorDialogo.value = null
  try {
    const t = accion.value === 'baja' ? await stores.darDeBaja(seleccionada.value.id) : await stores.reactivar(seleccionada.value.id)
    dialogoAbierto.value = false
    toast.exito(accion.value === 'baja' ? `${t.nombre_comercial} fue dada de baja` : `${t.nombre_comercial} fue reactivada`)
    await cargar()
  } catch (e) {
    // Se muestra el mensaje del backend dentro del diálogo.
    errorDialogo.value = e instanceof ApiError ? e.message : 'No se pudo completar la operación.'
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <section class="pb-4">
    <!-- Encabezado -->
    <div class="pb-8">
      <nav aria-label="Migas de pan" class="flex items-center gap-1 text-label font-bold uppercase">
        <span class="text-on-surface-variant">Inicio</span>
        <img :src="iconoMiga" alt="" width="4.32" height="7" />
        <span class="text-tertiary" aria-current="page">Tiendas</span>
      </nav>
      <div class="mt-1 flex flex-wrap items-center gap-3">
        <h1 class="text-display font-bold text-on-surface">Tiendas Afiliadas</h1>
        <span class="rounded-full bg-surface-high px-2.5 py-0.5 text-caption font-bold text-primary">{{ resumen }}</span>
      </div>
      <p class="mt-1 text-body text-on-surface-variant">
        Gestión central de comercios en la plataforma y supervisión de cuadernos contables.
      </p>
    </div>

    <DataTable
      v-model:busqueda="busqueda"
      v-model:offset="offset"
      :columns="columnas"
      :rows="tiendas"
      row-key="id"
      :total="total"
      :limit="LIMITE"
      :loading="cargando"
      :error="error"
      search-placeholder="Buscar por nombre comercial o RUC..."
      folio="Folio digital #001"
      nombre-registros="comercios registrados"
      caption="Tiendas afiliadas"
      empty-text="No hay tiendas que coincidan con la búsqueda."
      :row-class="(t) => (t.estado === 'BAJA' ? 'bg-surface-low/40 opacity-85' : '')"
    >
      <!-- Filtros extra y botón principal -->
      <template #toolbar>
        <div class="w-full sm:w-52">
          <SelectInput v-model="giroSeleccionado" :options="opcionesGiro" variante="relleno" aria-label="Filtrar por giro" />
        </div>

        <div ref="raizFiltros" class="relative" @keydown.esc="menuFiltros = false">
          <button
            type="button"
            :aria-expanded="menuFiltros"
            aria-haspopup="true"
            aria-controls="menu-filtro-estado"
            class="flex items-center gap-1.5 rounded-control bg-surface-high px-4 py-2.5 text-body font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-highest"
            @click="menuFiltros = !menuFiltros"
          >
            <img :src="iconoFiltros" alt="" width="13.5" height="13.5" />
            Filtros
            <span v-if="estado" class="size-2 rounded-full bg-primary-container" aria-label="(filtro activo)" />
          </button>
          <div
            v-show="menuFiltros"
            id="menu-filtro-estado"
            role="radiogroup"
            aria-label="Estado de la tienda"
            class="absolute right-0 z-20 mt-2 w-52 rounded-control bg-white p-2 shadow-float"
          >
            <p class="px-2 pb-1 text-label font-bold uppercase text-on-surface-variant">Estado</p>
            <button
              v-for="o in opcionesEstado"
              :key="o.value"
              type="button"
              role="radio"
              :aria-checked="estado === o.value"
              :class="estado === o.value ? 'bg-primary text-white' : 'hover:bg-surface-low'"
              class="flex w-full items-center justify-between rounded-stamp px-2 py-1.5 text-body"
              @click="elegirEstado(o.value)"
            >
              {{ o.label }}
              <span class="text-caption">{{ o.count }}</span>
            </button>
          </div>
        </div>

        <RouterLink
          :to="{ name: 'admin-tienda-nueva' }"
          class="flex items-center gap-2 rounded-control bg-primary-container px-6 py-2.5 text-body-lg font-semibold text-white shadow-btn transition-colors hover:bg-primary"
        >
          <img :src="iconoRegistrar" alt="" width="18.33" height="15.83" />
          + Registrar tienda
        </RouterLink>
      </template>

      <!-- Celdas -->
      <template #cell-nombre_comercial="{ row }">
        <div class="flex items-center gap-2">
          <span :class="colorAvatar(row)" class="flex size-8 shrink-0 items-center justify-center rounded-stamp text-caption font-bold shadow-xs" aria-hidden="true">
            {{ iniciales(row.nombre_comercial) }}
          </span>
          <div class="min-w-0">
            <p :class="row.estado === 'BAJA' ? 'text-on-surface-variant line-through' : 'text-on-surface'" class="text-body-lg font-semibold leading-5">
              {{ row.nombre_comercial }}
            </p>
            <p class="text-caption text-on-surface-variant">{{ row.giro }}</p>
          </div>
        </div>
      </template>
      <template #cell-ruc="{ row }">
        <span :class="row.estado === 'BAJA' ? 'text-outline' : 'text-on-surface-variant'" class="font-bold tabular-nums">{{ row.ruc }}</span>
      </template>
      <template #cell-administrador="{ row }">
        <div v-if="row.administrador" class="flex items-center gap-2">
          <span
            :class="row.estado === 'BAJA' ? 'bg-surface-highest text-outline' : 'bg-surface-high text-on-surface'"
            class="flex size-6 shrink-0 items-center justify-center rounded-full text-micro font-bold"
            aria-hidden="true"
          >
            {{ iniciales(row.administrador.nombre) }}
          </span>
          <div class="min-w-0">
            <p class="font-medium">{{ row.administrador.nombre }}</p>
            <p class="text-caption text-on-surface-variant">{{ row.administrador.username }}</p>
          </div>
        </div>
        <span v-else class="text-outline">—</span>
      </template>
      <template #cell-created_at="{ row }">
        <span class="tabular-nums text-on-surface-variant">{{ formatDate(row.created_at) }}</span>
      </template>
      <template #cell-estado="{ row }">
        <StatusStamp :estado="row.estado" />
      </template>
      <template #cell-acciones="{ row }">
        <div class="flex items-center justify-end gap-1">
          <RouterLink
            :to="{ name: 'admin-tienda-editar', params: { id: row.id } }"
            class="rounded-control p-1.5 transition-colors hover:bg-surface-high"
            :aria-label="`Editar ${row.nombre_comercial}`"
            :title="`Editar ${row.nombre_comercial}`"
          >
            <img :src="iconoEditar" alt="" width="13.5" height="13.5" />
          </RouterLink>
          <button
            v-if="row.estado !== 'BAJA'"
            type="button"
            class="rounded-control p-1.5 transition-colors hover:bg-error-container/60"
            :aria-label="`Dar de baja ${row.nombre_comercial}`"
            :title="`Dar de baja ${row.nombre_comercial}`"
            @click="pedirConfirmacion(row, 'baja')"
          >
            <img :src="iconoBaja" alt="" width="14.87" height="14.87" />
          </button>
          <button
            v-else
            type="button"
            class="rounded-control p-1.5 transition-colors hover:bg-primary-fixed/60"
            :aria-label="`Reactivar ${row.nombre_comercial}`"
            :title="`Reactivar ${row.nombre_comercial}`"
            @click="pedirConfirmacion(row, 'alta')"
          >
            <img :src="iconoReactivar" alt="" width="13.5" height="13.5" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- Confirmación de baja / reactivación (Figma 4-8056) -->
    <ConfirmDialog
      v-model:open="dialogoAbierto"
      :eyebrow="accion === 'baja' ? 'Acción crítica del sistema' : 'Reactivar comercio'"
      :titulo="accion === 'baja' ? '¿Dar de baja esta tienda?' : '¿Reactivar esta tienda?'"
      :confirm-text="accion === 'baja' ? 'Confirmar baja' : 'Reactivar tienda'"
      :tono="accion === 'baja' ? 'peligro' : 'positivo'"
      :loading="procesando"
      :error="errorDialogo"
      @confirm="confirmar"
    >
      <template #detalles>
        <div class="flex items-center justify-between gap-2">
          <span class="text-caption font-semibold text-on-surface-variant">Comercio a afectar:</span>
          <span class="text-right text-body-lg font-bold">{{ seleccionada?.nombre_comercial }}</span>
        </div>
        <div class="mt-1.5 flex items-center justify-between gap-2">
          <span class="text-label font-bold text-on-surface-variant">RUC Registrado:</span>
          <span class="text-body tabular-nums">{{ seleccionada?.ruc }}</span>
        </div>
      </template>
      <template v-if="accion === 'baja'">
        Estás a punto de dar de baja a la tienda:
        <strong>{{ seleccionada?.nombre_comercial }} (RUC: {{ seleccionada?.ruc }})</strong>. La tienda ya no podrá emitir nuevos fiados
        ni registrar compras, y su administrador y sus vecinos no podrán iniciar sesión.
      </template>
      <template v-else>
        La tienda <strong>{{ seleccionada?.nombre_comercial }}</strong> volverá a estar activa: su administrador y sus vecinos podrán
        iniciar sesión y registrar fiados nuevamente.
      </template>
    </ConfirmDialog>
  </section>
</template>
