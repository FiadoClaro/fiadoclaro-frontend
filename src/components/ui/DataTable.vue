<script setup lang="ts" generic="T extends object">
/**
 * Tabla de las listas (Figma 2b tiendas, 4b clientes, 6b productos):
 *  - Barra superior: buscador y chips de filtro con su cantidad ("Al día (2)").
 *  - Tabla tipo libro contable con la línea roja de margen del cuaderno.
 *  - Pie con folio, "Mostrando X de Y" y paginación.
 *
 * La búsqueda, el filtro y la página se manejan con v-model, y la vista que la usa pide
 * los datos al backend (q, estado, limit, offset). La tabla no filtra nada por su cuenta.
 *
 * Slots: cell-<key> (celda personalizada, recibe { row }), toolbar (filtros extra), empty.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import iconoBuscar from '@/assets/icons/buscar.svg'
import PaginationBar from './PaginationBar.vue'
import type { Chip, Columna } from './tabla'

withDefaults(
  defineProps<{
    columns: Columna[]
    rows: T[]
    /** Campo que identifica cada fila (normalmente "id") */
    rowKey: keyof T
    total?: number
    limit?: number
    loading?: boolean
    /** Mensaje de error del backend al cargar */
    error?: string | null
    emptyText?: string
    /** Placeholder del buscador; si no se da, no hay buscador */
    searchPlaceholder?: string
    chips?: Chip[]
    chipsLabel?: string
    /** Texto del pie: "Cuaderno Principal Bodega", "Folio digital #001" */
    folio?: string
    /** Nombre de los registros para el pie: "comercios registrados" */
    nombreRegistros?: string
    /** Clase extra por fila (p. ej. atenuar las de baja) */
    rowClass?: (row: T) => string
    /** Nombre de la tabla para lectores de pantalla */
    caption?: string
  }>(),
  {
    total: 0,
    limit: 10,
    loading: false,
    error: null,
    emptyText: 'No hay registros para mostrar.',
    searchPlaceholder: undefined,
    chips: () => [],
    chipsLabel: 'Estado:',
    folio: undefined,
    nombreRegistros: 'registros',
    rowClass: undefined,
    caption: undefined,
  },
)

const busqueda = defineModel<string>('busqueda', { default: '' })
const filtro = defineModel<string>('filtro', { default: '' })
const offset = defineModel<number>('offset', { default: 0 })

// El buscador espera 300 ms sin teclear antes de avisar (para no llamar al backend en cada letra).
const textoBusqueda = ref(busqueda.value)
let espera: ReturnType<typeof setTimeout> | undefined
watch(textoBusqueda, (v) => {
  clearTimeout(espera)
  espera = setTimeout(() => {
    busqueda.value = v.trim()
    offset.value = 0
  }, 300)
})
watch(busqueda, (v) => {
  if (v !== textoBusqueda.value.trim()) textoBusqueda.value = v
})
onBeforeUnmount(() => clearTimeout(espera))

function elegirChip(valor: string) {
  filtro.value = valor
  offset.value = 0
}

const alineacion = { left: 'text-left', right: 'text-right', center: 'text-center' } as const
function valorCelda(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Barra de búsqueda y filtros -->
    <div
      v-if="searchPlaceholder || chips.length || $slots.toolbar"
      class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between"
    >
      <div v-if="searchPlaceholder" class="relative w-full md:w-80">
        <img :src="iconoBuscar" alt="" width="15" height="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="textoBusqueda"
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          class="h-11 w-full rounded-control bg-surface-low pl-10 pr-4 text-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container/25"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2 md:justify-end">
        <slot name="toolbar" />
        <div v-if="chips.length" class="flex flex-wrap items-center gap-1" role="group" :aria-label="chipsLabel">
          <span class="pr-2 text-label font-bold uppercase text-on-surface-variant">{{ chipsLabel }}</span>
          <button
            v-for="c in chips"
            :key="c.value"
            type="button"
            :aria-pressed="filtro === c.value"
            :class="filtro === c.value ? 'bg-primary text-white shadow-xs' : 'bg-surface-high text-on-surface hover:bg-surface-highest'"
            class="rounded-full px-4 py-1.5 text-caption font-semibold transition-colors"
            @click="elegirChip(c.value)"
          >
            {{ c.label }}<template v-if="c.count !== undefined"> ({{ c.count }})</template>
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla con margen de cuaderno -->
    <div class="relative overflow-hidden rounded-card bg-white shadow-btn">
      <span class="pointer-events-none absolute inset-y-0 left-6 z-10 w-px bg-error/30" aria-hidden="true" />
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse" :aria-busy="loading">
          <caption v-if="caption" class="sr-only">{{ caption }}</caption>
          <thead class="bg-surface-container">
            <tr>
              <th
                v-for="(col, i) in columns"
                :key="col.key"
                scope="col"
                :class="[alineacion[col.align ?? 'left'], i === 0 ? 'pl-10' : '', i === columns.length - 1 ? 'pr-6' : '', col.class]"
                class="px-4 py-[19px] text-label font-semibold uppercase text-on-surface-variant"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Cargando -->
            <tr v-if="loading">
              <td :colspan="columns.length" class="py-12 pl-10 text-center text-body text-on-surface-variant">
                <span class="inline-flex items-center gap-2">
                  <span class="size-4 animate-spin rounded-full border-2 border-primary-container border-t-transparent" aria-hidden="true" />
                  Cargando…
                </span>
              </td>
            </tr>
            <!-- Error -->
            <tr v-else-if="error">
              <td :colspan="columns.length" class="py-12 pl-10 text-center text-body font-semibold text-error" role="alert">{{ error }}</td>
            </tr>
            <!-- Vacío -->
            <tr v-else-if="rows.length === 0">
              <td :colspan="columns.length" class="py-12 pl-10 text-center text-body text-on-surface-variant">
                <slot name="empty">{{ emptyText }}</slot>
              </td>
            </tr>
            <!-- Filas -->
            <template v-else>
              <tr
                v-for="row in rows"
                :key="String(row[rowKey])"
                :class="rowClass?.(row)"
                class="border-t border-surface-container transition-colors first:border-t-0 hover:bg-surface-low/60"
              >
                <td
                  v-for="(col, i) in columns"
                  :key="col.key"
                  :class="[alineacion[col.align ?? 'left'], i === 0 ? 'pl-10' : '', i === columns.length - 1 ? 'pr-6' : '', col.class]"
                  class="px-4 py-4 align-middle text-body text-on-surface"
                >
                  <slot :name="`cell-${col.key}`" :row="row">{{ valorCelda(row, col.key) ?? '—' }}</slot>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pie del cuaderno -->
      <div class="flex flex-col gap-2 bg-surface-low px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="flex flex-wrap items-center gap-2 pl-8 text-caption text-on-surface-variant">
          <span v-if="folio" class="text-label font-bold uppercase text-primary">{{ folio }}</span>
          <span v-if="folio" aria-hidden="true">·</span>
          <span>Mostrando {{ rows.length }} de {{ total }} {{ nombreRegistros }}</span>
        </p>
        <PaginationBar v-if="total > limit" v-model:offset="offset" :total="total" :limit="limit" class="self-end sm:self-auto" />
      </div>
    </div>
  </div>
</template>
