<script setup lang="ts">
/**
 * Pantalla 6 — Catálogo de Productos y Servicios (Figma 6b node 27-2; modal de baja node 4-6932).
 * Rol: ADMIN_TIENDA. Búsqueda, filtros (estado y modalidad) y paginación los resuelve el backend.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import * as products from '@/api/products'
import { ApiError } from '@/api/http'
import DataTable from '@/components/ui/DataTable.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ProductThumb from '@/components/ui/ProductThumb.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import type { Columna } from '@/components/ui/tabla'
import type { ProductoOut } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import iconoNuevo from '@/assets/icons/nuevo-producto.svg'
import iconoFinMes from '@/assets/icons/modalidad-fin-mes.svg'
import iconoCuotas from '@/assets/icons/modalidad-cuotas.svg'
import iconoEditar from '@/assets/icons/accion-editar.svg'
import iconoArchivar from '@/assets/icons/accion-archivar.svg'
import iconoReactivar from '@/assets/icons/accion-reactivar.svg'
import iconoAyuda from '@/assets/icons/ayuda-circulo.svg'

const auth = useAuthStore()
const toast = useToastStore()
const LIMITE = 10

// ---------------- Filtros y datos ----------------
const busqueda = ref('')
const estado = ref('') // '' | 'ACTIVO' | 'BAJA'
const modalidad = ref<'' | 'FIN_MES' | 'CUOTAS'>('')
const offset = ref(0)

const productos = ref<ProductoOut[]>([])
const total = ref(0)
const conteoEstado = ref<Record<string, number>>({})
const cargando = ref(false)
const error = ref<string | null>(null)

let consultaActual = 0
async function cargar() {
  const consulta = ++consultaActual
  cargando.value = true
  error.value = null
  try {
    const pagina = await products.listar({
      q: busqueda.value,
      estado: (estado.value || undefined) as products.FiltrosProductos['estado'],
      modalidad: modalidad.value || undefined,
      limit: LIMITE,
      offset: offset.value,
    })
    if (consulta !== consultaActual) return
    productos.value = pagina.items
    total.value = pagina.total
    conteoEstado.value = pagina.conteos?.estado ?? {}
  } catch (e) {
    if (consulta === consultaActual) error.value = e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.'
  } finally {
    if (consulta === consultaActual) cargando.value = false
  }
}
onMounted(cargar)
watch([busqueda, estado, modalidad, offset], cargar)
watch(modalidad, () => (offset.value = 0))

const chips = computed(() => [
  { value: '', label: 'Todos', count: conteoEstado.value.TODOS ?? 0 },
  { value: 'ACTIVO', label: 'Activos', count: conteoEstado.value.ACTIVO ?? 0 },
  { value: 'BAJA', label: 'De baja', count: conteoEstado.value.BAJA ?? 0 },
])
const opcionesModalidad = [
  { value: '' as const, label: 'Todas las modalidades' },
  { value: 'FIN_MES' as const, label: 'Pago a fin de mes' },
  { value: 'CUOTAS' as const, label: 'Pago en meses' },
]
const modalidadSeleccionada = computed({
  get: () => modalidad.value,
  set: (v: '' | 'FIN_MES' | 'CUOTAS' | null) => (modalidad.value = v ?? ''),
})

// ---------------- Tabla ----------------
const columnas: Columna[] = [
  { key: 'nombre', label: 'Artículo / Descripción', class: 'min-w-[260px]' },
  { key: 'unidad_medida', label: 'U. medida' },
  { key: 'precio_contado', label: 'Precio contado', align: 'right' },
  { key: 'precio_lista_credito', label: 'Precio fiado (lista)', align: 'right' },
  { key: 'modalidad', label: 'Modalidad crédito', class: 'min-w-[150px]' },
  { key: 'estado', label: 'Estado libro', align: 'center' },
  { key: 'acciones', label: 'Acciones', align: 'right' },
]

// ---------------- Baja y reactivación ----------------
const seleccionado = ref<ProductoOut | null>(null)
const accion = ref<'baja' | 'alta'>('baja')
const dialogoAbierto = ref(false)
const procesando = ref(false)
const errorDialogo = ref<string | null>(null)

function pedirConfirmacion(p: ProductoOut, tipo: 'baja' | 'alta') {
  seleccionado.value = p
  accion.value = tipo
  errorDialogo.value = null
  dialogoAbierto.value = true
}

async function confirmar() {
  if (!seleccionado.value) return
  procesando.value = true
  errorDialogo.value = null
  try {
    const p = accion.value === 'baja' ? await products.darDeBaja(seleccionado.value.id) : await products.reactivar(seleccionado.value.id)
    dialogoAbierto.value = false
    toast.exito(accion.value === 'baja' ? `${p.nombre} fue dado de baja` : `${p.nombre} volvió al catálogo`)
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
    <div class="pb-8">
      <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
        <span class="text-on-surface-variant">Inicio</span>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <span class="font-semibold text-primary" aria-current="page">Productos y servicios</span>
      </nav>
      <div class="mt-1 flex flex-wrap items-center gap-3">
        <h1 class="text-display font-bold text-on-surface">Catálogo de Productos y Servicios</h1>
        <span class="flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-0.5 text-label font-bold text-primary">
          <span class="size-1.5 rounded-full bg-primary-container" aria-hidden="true" />
          {{ auth.tienda?.nombre_comercial }} · {{ conteoEstado.TODOS ?? 0 }} ítems en libro
        </span>
      </div>
      <p class="mt-1 text-body text-on-surface-variant">Lista de artículos con precios de lista para venta al contado y fiado</p>
    </div>

    <DataTable
      v-model:busqueda="busqueda"
      v-model:filtro="estado"
      v-model:offset="offset"
      :columns="columnas"
      :rows="productos"
      row-key="id"
      :total="total"
      :limit="LIMITE"
      :loading="cargando"
      :error="error"
      :chips="chips"
      search-placeholder="Buscar por nombre, marca o proveedor..."
      nombre-registros="productos y servicios registrados"
      caption="Catálogo de productos y servicios"
      empty-text="No hay productos que coincidan. Registra el primero con “Nuevo Producto”."
      :row-class="(p) => (p.estado === 'BAJA' ? 'bg-surface-low/50 text-outline' : '')"
    >
      <template #toolbar>
        <div class="w-full sm:w-56">
          <SelectInput v-model="modalidadSeleccionada" :options="opcionesModalidad" variante="relleno" aria-label="Filtrar por modalidad de crédito" />
        </div>
        <RouterLink
          :to="{ name: 'tienda-producto-nuevo' }"
          class="flex items-center gap-1 rounded-control bg-primary-container px-6 py-2.5 text-body font-semibold tracking-[0.14px] text-white shadow-xs transition-colors hover:bg-primary"
        >
          <img :src="iconoNuevo" alt="" width="16.67" height="16.67" />
          Nuevo Producto
        </RouterLink>
      </template>

      <template #cell-nombre="{ row }">
        <div class="flex items-center gap-4">
          <ProductThumb :src="row.imagen_url" :nombre="row.nombre" :apagado="row.estado === 'BAJA'" />
          <div class="min-w-0">
            <p :class="row.estado === 'BAJA' ? 'line-through' : 'text-on-surface'" class="text-body-lg font-semibold">{{ row.nombre }}</p>
            <p v-if="row.marca || row.descripcion" class="truncate text-caption text-on-surface-variant">
              {{ [row.marca, row.descripcion].filter(Boolean).join(' · ') }}
            </p>
          </div>
        </div>
      </template>
      <template #cell-unidad_medida="{ row }">
        <span class="inline-block rounded-stamp bg-surface-container px-2 py-0.5 text-caption font-semibold text-on-surface-variant">{{ row.unidad_medida }}</span>
      </template>
      <template #cell-precio_contado="{ row }">
        <MoneyText :valor="row.precio_contado" :moneda="row.moneda" class="font-bold" />
      </template>
      <template #cell-precio_lista_credito="{ row }">
        <MoneyText :valor="row.precio_lista_credito" :moneda="row.moneda" :class="row.estado === 'BAJA' ? '' : 'text-primary'" class="font-bold" />
      </template>
      <template #cell-modalidad="{ row }">
        <div class="flex flex-col items-start gap-1">
          <span v-if="row.permite_fin_mes" class="flex items-center gap-1 text-caption text-on-surface-variant">
            <img :src="iconoFinMes" alt="" width="12" height="13.33" /> Pago único a fin de mes
          </span>
          <span v-if="row.permite_cuotas" class="flex items-center gap-1 rounded-stamp bg-tertiary-fixed/40 px-2 py-0.5 text-caption font-semibold text-tertiary">
            <img :src="iconoCuotas" alt="" width="13.33" height="13.33" /> Pago en meses (hasta {{ row.max_meses }})
          </span>
        </div>
      </template>
      <template #cell-estado="{ row }">
        <StatusStamp :estado="row.estado" />
      </template>
      <template #cell-acciones="{ row }">
        <div class="flex items-center justify-end gap-1">
          <RouterLink
            :to="{ name: 'tienda-producto-editar', params: { id: row.id } }"
            class="rounded-control p-1.5 transition-colors hover:bg-surface-high"
            :aria-label="`Editar ${row.nombre}`"
            :title="`Editar ${row.nombre}`"
          >
            <img :src="iconoEditar" alt="" width="13.5" height="13.5" />
          </RouterLink>
          <button
            v-if="row.estado !== 'BAJA'"
            type="button"
            class="rounded-control p-1.5 transition-colors hover:bg-error-container/60"
            :aria-label="`Dar de baja ${row.nombre}`"
            :title="`Dar de baja ${row.nombre}`"
            @click="pedirConfirmacion(row, 'baja')"
          >
            <img :src="iconoArchivar" alt="" width="13.5" height="13.5" />
          </button>
          <button
            v-else
            type="button"
            class="rounded-control p-1.5 transition-colors hover:bg-primary-fixed/60"
            :aria-label="`Reactivar ${row.nombre}`"
            :title="`Reactivar ${row.nombre}`"
            @click="pedirConfirmacion(row, 'alta')"
          >
            <img :src="iconoReactivar" alt="" width="13.5" height="13.5" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- Tarjeta de ayuda inferior (Figma 6b) -->
    <aside class="mt-6 flex gap-4 rounded-card bg-surface-low p-4">
      <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <img :src="iconoAyuda" alt="" width="16.67" height="16.67" />
      </span>
      <div>
        <h2 class="text-body-lg font-semibold text-on-surface">¿Cómo funciona la asignación de precios al contado vs. fiado?</h2>
        <p class="mt-0.5 max-w-2xl text-caption leading-[19.5px] text-on-surface-variant">
          El catálogo permite registrar los precios de venta al contado y los precios de lista al fiado según la modalidad de pago acordada con
          cada cliente para el ciclo comercial de la bodega. Cambiar un precio no altera las compras ya registradas: cada compra guarda su precio.
        </p>
      </div>
    </aside>

    <!-- Confirmación de baja / reactivación (Figma 4-6932) -->
    <ConfirmDialog
      v-model:open="dialogoAbierto"
      eyebrow="Catálogo de negocio"
      :titulo="accion === 'baja' ? '¿Dar de baja este producto?' : '¿Reactivar este producto?'"
      :confirm-text="accion === 'baja' ? 'Confirmar baja' : 'Reactivar producto'"
      :tono="accion === 'baja' ? 'peligro' : 'positivo'"
      :loading="procesando"
      :error="errorDialogo"
      @confirm="confirmar"
    >
      <template #detalles>
        <div v-if="seleccionado" class="flex items-center gap-2">
          <ProductThumb :src="seleccionado.imagen_url" :nombre="seleccionado.nombre" :tamano="40" />
          <p class="text-body font-bold tracking-[0.14px]">{{ seleccionado.nombre }}</p>
        </div>
      </template>
      <template v-if="accion === 'baja'">
        ¿Estás seguro de dar de baja al producto: <strong>{{ seleccionado?.nombre }}</strong>? Ya no aparecerá en el registro de nuevas compras a
        crédito. Las compras pasadas con este ítem se preservan en los estados de cuenta.
      </template>
      <template v-else>
        <strong>{{ seleccionado?.nombre }}</strong> volverá a aparecer en el registro de compras a crédito con los precios que tiene guardados.
      </template>
    </ConfirmDialog>
  </section>
</template>
