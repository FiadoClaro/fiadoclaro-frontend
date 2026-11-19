<script setup lang="ts">
/**
 * Pantalla 8 — Registrar Compra a Crédito (Figma node 4-5425). Rol: ADMIN_TIENDA.
 *
 * 1) Se elige al vecino y se ve su línea de crédito (GET /customers/{id}/credito).
 * 2) Se agregan productos del catálogo con su cantidad (admite decimales: 1.5 kg).
 * 3) Se elige "Pago a fin de mes" o "En cuotas".
 * Cada cambio llama a POST /purchases/simular (con espera de 400 ms) y se pinta lo que devuelve:
 * corte, pago, días de gracia, interés, cuota, total, TCEA y crédito restante. NADA se calcula aquí.
 * "Registrar Compra" envía POST /purchases y lleva al cronograma.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import * as customers from '@/api/customers'
import * as products from '@/api/products'
import * as purchases from '@/api/purchases'
import { ApiError } from '@/api/http'
import FormField from '@/components/forms/FormField.vue'
import SearchSelect from '@/components/forms/SearchSelect.vue'
import DecimalInput from '@/components/forms/DecimalInput.vue'
import SegmentedToggle from '@/components/forms/SegmentedToggle.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import type { ResultadoBusqueda } from '@/components/forms/estilos'
import type { ClienteOut, CompraIn, ProductoOut, ResumenCredito } from '@/types/api'
import { useSimulacion } from '@/composables/useSimulacion'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { esDecimalPositivo } from '@/utils/decimalInput'
import { formatDate, formatDateTime, formatMoney, formatRate } from '@/utils/format'
import { iniciales } from '@/layouts/nav'
import BarraCredito from './customers/BarraCredito.vue'
import iconoTitulo from '@/assets/icons/compra-titulo.svg'
import iconoVerificado from '@/assets/icons/compra-verificado.svg'
import iconoTope from '@/assets/icons/compra-tope.svg'
import iconoDisponible from '@/assets/icons/compra-disponible.svg'
import iconoCorte from '@/assets/icons/compra-corte.svg'
import iconoPago from '@/assets/icons/compra-pago.svg'
import iconoAgregar from '@/assets/icons/compra-agregar.svg'
import iconoDetalle from '@/assets/icons/compra-detalle.svg'
import iconoQuitar from '@/assets/icons/compra-quitar.svg'
import iconoBoleta from '@/assets/icons/compra-boleta.svg'
import iconoValidacion from '@/assets/icons/compra-validacion.svg'
import iconoOk from '@/assets/icons/compra-ok.svg'
import iconoBloqueado from '@/assets/icons/modal-prohibido.svg'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

// ================= 1. Cliente =================
const cliente = ref<ClienteOut | null>(null)
const credito = ref<ResumenCredito | null>(null)
const errorCredito = ref<string | null>(null)
const nombreCliente = computed(() => (cliente.value ? `${cliente.value.nombres} ${cliente.value.apellidos}` : ''))

async function buscarClientes(q: string): Promise<ResultadoBusqueda<ClienteOut>[]> {
  const r = await customers.listar({ q, estado: 'ACTIVO', limit: 8 })
  return r.items.map((c) => ({
    valor: c,
    texto: `${c.nombres} ${c.apellidos}`,
    detalle: `DNI ${c.dni} · Disponible ${formatMoney(c.resumen.disponible, c.condicion.moneda)}${c.resumen.estado_pago === 'EN_MORA' ? ' · EN MORA' : ''}`,
  }))
}

async function elegirCliente(c: ClienteOut) {
  cliente.value = c
  credito.value = null
  errorCredito.value = null
  try {
    credito.value = await customers.credito(c.id)
  } catch (e) {
    errorCredito.value = e instanceof ApiError ? e.message : 'No se pudo cargar la línea de crédito.'
  }
}

// Si se llega desde el detalle del cliente (?cliente=ID), se selecciona solo.
onMounted(async () => {
  const id = Number(route.query.cliente)
  if (!id) return
  try {
    await elegirCliente(await customers.obtener(id))
  } catch {
    // Si no existe, simplemente no se preselecciona.
  }
})

// ================= 2. Productos =================
interface Item {
  uid: number
  producto: ProductoOut
  cantidad: string
}
const items = ref<Item[]>([])
const productoElegido = ref<ProductoOut | null>(null)
const cantidad = ref('1')
const errorItem = ref<string | null>(null)
let siguienteUid = 1

async function buscarProductos(q: string): Promise<ResultadoBusqueda<ProductoOut>[]> {
  const r = await products.listar({ q, estado: 'ACTIVO', limit: 8 })
  const moneda = cliente.value?.condicion.moneda
  return r.items.map((p) => ({
    valor: p,
    texto: p.nombre,
    detalle:
      `${formatMoney(p.precio_lista_credito, p.moneda)} a crédito · ${p.unidad_medida}` +
      (p.permite_cuotas ? ` · hasta ${p.max_meses} meses` : ' · solo fin de mes') +
      (moneda && p.moneda !== moneda ? ' · otra moneda' : ''),
    deshabilitado: !!moneda && p.moneda !== moneda, // el backend no permite mezclar monedas
  }))
}

function agregarItem() {
  errorItem.value = null
  if (!productoElegido.value) {
    errorItem.value = 'Elige un producto del catálogo.'
    return
  }
  if (!esDecimalPositivo(cantidad.value, 3)) {
    errorItem.value = 'La cantidad debe ser mayor que 0 (hasta 3 decimales, ej. 1.5).'
    return
  }
  items.value.push({ uid: siguienteUid++, producto: productoElegido.value, cantidad: cantidad.value })
  productoElegido.value = null
  cantidad.value = '1'
}
function quitarItem(uid: number) {
  items.value = items.value.filter((i) => i.uid !== uid)
}

// ================= 3. Modalidad =================
const modalidad = ref<'FIN_MES' | 'CUOTAS'>('FIN_MES')
const numCuotas = ref<number | null>(3)

// Qué modalidades permiten TODOS los productos del carrito.
const permiteFinMes = computed(() => items.value.every((i) => i.producto.permite_fin_mes !== false))
const permiteCuotas = computed(() => items.value.every((i) => i.producto.permite_cuotas))
/** Máximo de cuotas: el menor entre el del cliente y el de cada producto (regla del backend). */
const maxCuotas = computed(() => {
  const topes = [cliente.value?.condicion.max_meses ?? 36, ...items.value.map((i) => i.producto.max_meses ?? 36)]
  return Math.min(...topes)
})
const opcionesModalidad = computed(() => [
  { value: 'FIN_MES' as const, label: 'Pago a fin de mes', disabled: !permiteFinMes.value },
  { value: 'CUOTAS' as const, label: 'En cuotas', disabled: !permiteCuotas.value },
])
const opcionesCuotas = computed(() =>
  Array.from({ length: maxCuotas.value }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i === 0 ? 'mes' : 'meses'}` })),
)
// Si la modalidad elegida deja de estar permitida, se cambia a la otra; las cuotas no pasan del máximo.
watch([permiteFinMes, permiteCuotas], () => {
  if (modalidad.value === 'CUOTAS' && !permiteCuotas.value && permiteFinMes.value) modalidad.value = 'FIN_MES'
  if (modalidad.value === 'FIN_MES' && !permiteFinMes.value && permiteCuotas.value) modalidad.value = 'CUOTAS'
})
watch(maxCuotas, (max) => {
  if (numCuotas.value && numCuotas.value > max) numCuotas.value = max
})

// ================= Fecha opcional (compras anotadas antes en el cuaderno) =================
const usarOtraFecha = ref(false)
const fechaHora = ref('') // "YYYY-MM-DDTHH:mm" en hora de Lima

// ================= Simulación con el backend =================
const cuerpo = computed<CompraIn | null>(() => {
  if (!cliente.value || items.value.length === 0) return null
  return {
    cliente_id: cliente.value.id,
    items: items.value.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
    modalidad: modalidad.value,
    num_cuotas: modalidad.value === 'CUOTAS' ? (numCuotas.value ?? 1) : 1,
    // Perú está en UTC-5 todo el año (no hay horario de verano).
    fecha_hora: usarOtraFecha.value && fechaHora.value ? `${fechaHora.value}:00-05:00` : null,
  }
})
const { simulacion, error: errorSimulacion, calculando } = useSimulacion(cuerpo)

const moneda = computed(() => simulacion.value?.moneda ?? cliente.value?.condicion.moneda ?? 'PEN')
const m = (v: string | null | undefined) => formatMoney(v, moneda.value)
/** Subtotal de cada fila: lo devuelve el backend en `detalles`, en el mismo orden. */
const subtotal = (indice: number) => simulacion.value?.detalles[indice]?.subtotal ?? null

// ================= Registrar =================
const registrando = ref(false)
const errorRegistro = ref<string | null>(null)
const puedeRegistrar = computed(
  () => !!cuerpo.value && !!simulacion.value && !simulacion.value.excede_credito && !errorSimulacion.value && !calculando.value,
)

async function registrar() {
  if (!cuerpo.value || !puedeRegistrar.value) return
  registrando.value = true
  errorRegistro.value = null
  try {
    const compra = await purchases.registrar(cuerpo.value)
    toast.exito(`Compra registrada para ${nombreCliente.value}: ${formatMoney(compra.total_a_pagar, compra.moneda)}`)
    await router.push({ name: 'tienda-compra', params: { id: compra.id } })
  } catch (e) {
    errorRegistro.value = e instanceof ApiError ? e.message : 'No se pudo registrar la compra.'
  } finally {
    registrando.value = false
  }
}
</script>

<template>
  <section class="pb-8">
    <!-- Encabezado -->
    <div class="pb-6">
      <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
        <span class="text-on-surface-variant">Inicio</span>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <span class="font-semibold text-tertiary" aria-current="page">Registrar compra</span>
      </nav>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex size-10 items-center justify-center rounded-control bg-tertiary-fixed/60 shadow-xs"><img :src="iconoTitulo" alt="" width="18" height="18" /></span>
          <div>
            <h1 class="text-headline font-bold text-on-surface">Registrar Compra a Crédito (Fiado)</h1>
            <p class="text-body text-on-surface-variant">Anota los consumos del vecino en su cuaderno digital con validación de saldo instantánea.</p>
          </div>
        </div>
        <RouterLink :to="{ name: 'tienda-compras' }" class="rounded-control bg-surface-high px-4 py-2 text-body font-semibold text-primary hover:bg-surface-highest">Ver compras registradas</RouterLink>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-12">
      <!-- ============ 1. Cliente ============ -->
      <section class="rounded-card bg-white p-6 shadow-xs lg:col-span-5" aria-labelledby="titulo-cliente">
        <FormField v-slot="{ id, describedBy }" label="1. Selección de vecino / cliente" help="Busca al vecino por su DNI o su nombre. Solo aparecen clientes activos; si está en mora igual puede comprar mientras tenga crédito disponible.">
          <SearchSelect :id="id" :aria-describedby="describedBy" :buscar="buscarClientes"
            :texto-seleccion="cliente ? `${nombreCliente} (DNI: ${cliente.dni})` : ''" placeholder="DNI o nombre del vecino…" @elegir="(r) => elegirCliente(r.valor)" />
        </FormField>
        <h2 id="titulo-cliente" class="sr-only">Cliente</h2>
        <div v-if="cliente" class="mt-4 flex items-center gap-3 rounded-control bg-surface-low p-4">
          <span class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-body-lg font-semibold text-primary" aria-hidden="true">{{ iniciales(nombreCliente) }}</span>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-1 text-body-lg font-semibold">{{ nombreCliente }} <img :src="iconoVerificado" alt="" width="15" height="15" /></p>
            <p class="text-caption text-on-surface-variant">DNI: {{ cliente.dni }} · Tasa {{ formatRate(cliente.condicion.tasa.valor) }} {{ cliente.condicion.tasa.periodo_dias === 360 ? 'anual' : 'mensual' }}</p>
          </div>
          <StatusStamp :estado="cliente.resumen.estado_pago" />
        </div>
        <p v-else class="mt-4 rounded-control border border-dashed border-outline-variant p-4 text-caption text-on-surface-variant">Aún no eliges a un vecino.</p>
      </section>

      <!-- Línea de crédito -->
      <section class="relative overflow-hidden rounded-card bg-white p-6 shadow-xs lg:col-span-7" aria-labelledby="titulo-linea">
        <span class="pointer-events-none absolute inset-y-0 left-3 w-0.5 bg-error/25" aria-hidden="true" />
        <p class="pl-4 text-label font-bold uppercase text-on-surface-variant">Estado de cuenta FiadoClaro</p>
        <h2 id="titulo-linea" class="pl-4 text-title font-semibold text-on-surface">Línea de Crédito Otorgada</h2>
        <p v-if="!cliente" class="mt-4 pl-4 text-caption text-on-surface-variant">Elige un cliente para ver su límite, lo utilizado y lo disponible.</p>
        <p v-else-if="errorCredito" role="alert" class="mt-4 pl-4 text-caption text-error">{{ errorCredito }}</p>
        <p v-else-if="!credito" class="mt-4 pl-4 text-caption text-on-surface-variant">Cargando línea de crédito…</p>
        <div v-else class="mt-4 flex flex-col gap-3 pl-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-control bg-surface-low p-3">
              <p class="text-label font-bold uppercase text-on-surface-variant">Límite aprobado</p>
              <p class="text-headline font-bold">{{ formatMoney(credito.limite, cliente.condicion.moneda) }}</p>
              <p class="flex items-center gap-1 text-caption text-on-surface-variant"><img :src="iconoTope" alt="" width="12" height="12" /> Tope máximo</p>
            </div>
            <div class="rounded-control bg-surface-low p-3">
              <p class="mb-1 text-label font-bold uppercase text-on-surface-variant">Crédito utilizado</p>
              <BarraCredito :utilizado="credito.utilizado" :porcentaje="credito.porcentaje_utilizado" :moneda="cliente.condicion.moneda" />
            </div>
            <div class="rounded-control bg-tertiary-fixed/40 p-3">
              <p class="flex items-center justify-between text-label font-bold uppercase text-tertiary">Disponible real <img :src="iconoDisponible" alt="" width="15" height="15" /></p>
              <p class="text-headline font-bold text-tertiary">{{ formatMoney(credito.disponible, cliente.condicion.moneda) }}</p>
              <p class="text-caption text-tertiary">Margen de fiado actual</p>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex items-center gap-2 rounded-control bg-surface-low p-3">
              <img :src="iconoCorte" alt="" width="15" height="15" />
              <div>
                <p class="text-label font-bold uppercase text-on-surface-variant">Fecha de corte comercial</p>
                <p class="text-body font-semibold">{{ cliente.condicion.dia_corte }} de cada mes · próximo {{ formatDate(credito.proximo_corte) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 rounded-control bg-surface-low p-3">
              <img :src="iconoPago" alt="" width="15" height="15" />
              <div>
                <p class="text-label font-bold uppercase text-on-surface-variant">Fecha límite de pago</p>
                <p class="text-body font-semibold">{{ cliente.condicion.dia_pago }} de cada mes · próximo {{ formatDate(credito.proximo_pago) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ 2. Productos ============ -->
      <div class="flex flex-col gap-6 lg:col-span-8">
        <section class="rounded-card bg-white p-6 shadow-xs" aria-labelledby="titulo-productos">
          <h2 id="titulo-productos" class="mb-3 text-label font-bold uppercase text-primary">2. Agregar productos al cuaderno</h2>
          <div class="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <FormField v-slot="{ id, describedBy }" label="Buscar producto del catálogo" :error="errorItem"
              help="Escribe el nombre, la marca o el proveedor. Solo aparecen productos activos; los de otra moneda que la del cliente no se pueden elegir.">
              <SearchSelect :id="id" :aria-describedby="describedBy" :buscar="buscarProductos" :disabled="!cliente"
                :texto-seleccion="productoElegido?.nombre ?? ''" :placeholder="cliente ? 'Leche, arroz, gaseosa…' : 'Primero elige al cliente'"
                @elegir="(r) => (productoElegido = r.valor)" />
            </FormField>
            <FormField v-slot="{ id, describedBy }" label="Cantidad" help="Cuántas unidades lleva. Admite decimales para productos por peso, ej. 1.5 kg (hasta 3 decimales).">
              <DecimalInput :id="id" v-model="cantidad" :decimales="3" variante="relleno" :aria-describedby="describedBy" :disabled="!cliente" @keydown.enter.prevent="agregarItem" />
            </FormField>
            <button type="button" :disabled="!cliente"
              class="flex h-[42px] items-center justify-center gap-1 rounded-control bg-primary px-4 text-body font-semibold text-white shadow-xs hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
              @click="agregarItem">
              <img :src="iconoAgregar" alt="" width="15" height="15" /> + Agregar ítem
            </button>
          </div>
        </section>

        <section class="relative overflow-hidden rounded-card bg-white shadow-xs" aria-labelledby="titulo-detalle">
          <span class="pointer-events-none absolute inset-y-0 left-4 w-0.5 bg-error/25" aria-hidden="true" />
          <h2 id="titulo-detalle" class="flex items-center gap-2 px-8 pb-2 pt-6 text-title font-semibold">
            <img :src="iconoDetalle" alt="" width="16" height="16" /> Detalle de Productos en este Fiado
          </h2>
          <div class="overflow-x-auto px-6">
            <table class="w-full min-w-[560px] text-body">
              <caption class="sr-only">Productos de la compra</caption>
              <thead class="text-label font-semibold uppercase text-on-surface-variant">
                <tr class="border-b border-surface-container">
                  <th scope="col" class="px-2 py-3 text-left">#</th>
                  <th scope="col" class="px-2 py-3 text-left">Producto</th>
                  <th scope="col" class="px-2 py-3 text-right">Cant.</th>
                  <th scope="col" class="px-2 py-3 text-right">P. lista</th>
                  <th scope="col" class="px-2 py-3 text-right">Subtotal</th>
                  <th scope="col" class="px-2 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="items.length === 0">
                  <td colspan="6" class="px-2 py-8 text-center text-caption text-on-surface-variant">Agrega productos para armar el fiado.</td>
                </tr>
                <tr v-for="(it, i) in items" :key="it.uid" class="border-b border-surface-container">
                  <td class="px-2 py-3 text-on-surface-variant">{{ i + 1 }}</td>
                  <td class="px-2 py-3 font-semibold">{{ it.producto.nombre }}</td>
                  <td class="px-2 py-3 text-right tabular-nums">{{ it.cantidad }}</td>
                  <td class="px-2 py-3 text-right tabular-nums text-on-surface-variant">{{ formatMoney(it.producto.precio_lista_credito, it.producto.moneda) }}</td>
                  <td :class="calculando ? 'opacity-50' : ''" class="px-2 py-3 text-right font-bold tabular-nums">{{ subtotal(i) ? m(subtotal(i)) : '—' }}</td>
                  <td class="px-2 py-3 text-center">
                    <button type="button" class="rounded-control p-1.5 hover:bg-error-container/60" :aria-label="`Quitar ${it.producto.nombre}`" @click="quitarItem(it.uid)">
                      <img :src="iconoQuitar" alt="" width="12" height="13.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Modalidad -->
          <div class="m-6 mt-4 flex flex-col gap-4 rounded-control bg-surface-low p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="flex items-center gap-1 text-label font-bold uppercase text-on-surface-variant">
                Modalidad de fiado seleccionada
                <HelpTip campo="Modalidad de fiado" texto="Fin de mes: se paga todo en la fecha de pago del ciclo, con interés por los días transcurridos. En cuotas: método francés; los días hasta la fecha de pago se capitalizan y la primera cuota vence un mes después." />
              </p>
              <p v-if="cliente" class="text-caption text-on-surface-variant">
                Tasa pactada del cliente: <strong class="text-primary">{{ formatRate(cliente.condicion.tasa.valor) }} {{ cliente.condicion.tasa.periodo_dias === 360 ? 'anual' : 'mensual' }}</strong>
              </p>
              <p v-if="items.length && !permiteCuotas" class="text-caption text-on-surface-variant">Algún producto no permite cuotas.</p>
            </div>
            <div class="flex w-full flex-col gap-2 sm:w-72">
              <SegmentedToggle v-model="modalidad" :options="opcionesModalidad" :disabled="!cliente" aria-label="Modalidad de fiado" />
              <div v-if="modalidad === 'CUOTAS'" class="flex items-center justify-end gap-2">
                <label for="num-cuotas" class="text-caption font-semibold">Plazo</label>
                <HelpTip campo="Plazo" :texto="`Número de cuotas mensuales. Máximo permitido para esta compra: ${maxCuotas} (el menor entre el del cliente y el de cada producto).`" />
                <SelectInput id="num-cuotas" v-model="numCuotas" :options="opcionesCuotas" variante="blanco" class="w-36 [&_select]:h-9" />
              </div>
              <p v-if="modalidad === 'CUOTAS'" class="text-right text-caption text-on-surface-variant">Máximo permitido: {{ maxCuotas }} {{ maxCuotas === 1 ? 'mes' : 'meses' }}</p>
            </div>
          </div>

          <!-- Fecha opcional -->
          <div class="mx-6 mb-6 rounded-control border border-dashed border-outline-variant p-3">
            <label class="flex items-center gap-2 text-caption font-semibold">
              <input v-model="usarOtraFecha" type="checkbox" class="accent-primary" />
              Anotar con otra fecha y hora (compra que ya estaba en el cuaderno)
              <HelpTip campo="Otra fecha" texto="Por defecto la compra se registra con la fecha y hora actuales. Usa esto solo para pasar al sistema compras anteriores; no puede ser una fecha futura. El ciclo (corte) se decide con esta fecha." />
            </label>
            <FormField v-if="usarOtraFecha" v-slot="{ id, describedBy }" label="Fecha y hora de la compra" help="Fecha y hora en que el vecino se llevó los productos (hora de Lima)." class="mt-2 sm:max-w-xs">
              <input :id="id" v-model="fechaHora" type="datetime-local" :aria-describedby="describedBy"
                class="h-[42px] w-full rounded-control bg-surface-low px-3 text-body shadow-inset focus:outline-none focus:ring-2 focus:ring-primary-container/25" />
            </FormField>
          </div>
        </section>
      </div>

      <!-- ============ Boleta (resumen) ============ -->
      <aside class="lg:col-span-4" aria-labelledby="titulo-boleta">
        <div class="relative rounded-t-card bg-white p-6 pb-8 shadow-float lg:sticky lg:top-20">
          <p class="flex items-center justify-center gap-1 text-label font-bold uppercase text-primary"><img :src="iconoBoleta" alt="" width="14" height="16" /> Resumen de la compra</p>
          <h2 id="titulo-boleta" class="mt-1 text-center text-title font-bold uppercase">{{ auth.tienda?.nombre_comercial }}</h2>
          <p class="text-center text-caption text-on-surface-variant">RUC: {{ auth.tienda?.ruc }}</p>

          <dl class="mt-4 space-y-1 border-y border-dashed border-outline-variant py-3 text-caption">
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">Fecha y hora:</dt><dd class="font-semibold">{{ simulacion ? formatDateTime(simulacion.fecha_hora) : '—' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">Cliente / Titular:</dt><dd class="text-right font-semibold">{{ nombreCliente || '—' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">DNI:</dt><dd class="font-semibold">{{ cliente?.dni ?? '—' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">Atendido por:</dt><dd class="text-right font-semibold">{{ auth.usuario?.nombre }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">Modalidad:</dt>
              <dd class="rounded-stamp bg-tertiary-fixed/60 px-1.5 font-bold uppercase text-tertiary">{{ modalidad === 'CUOTAS' ? `En ${numCuotas} cuotas` : 'Crédito a fin de mes' }}</dd></div>
            <div v-if="simulacion" class="flex justify-between gap-2"><dt class="text-on-surface-variant">Corte / pago:</dt><dd class="font-semibold">{{ formatDate(simulacion.fecha_corte) }} · {{ formatDate(simulacion.fecha_pago) }}</dd></div>
          </dl>

          <div class="py-3 text-caption" :class="calculando ? 'opacity-60' : ''">
            <div class="flex justify-between font-bold uppercase text-on-surface-variant"><span>Cant. / descripción</span><span>Importe</span></div>
            <p v-if="!simulacion" class="py-2 text-on-surface-variant">{{ calculando ? 'Calculando…' : 'Sin productos calculados.' }}</p>
            <div v-for="(d, i) in simulacion?.detalles ?? []" :key="i" class="flex justify-between gap-2 py-0.5">
              <span>{{ d.cantidad }}x {{ d.descripcion }}</span><span class="font-semibold tabular-nums">{{ m(d.subtotal) }}</span>
            </div>
          </div>

          <dl v-if="simulacion" class="space-y-1 border-t border-dashed border-outline-variant pt-3 text-caption" :class="calculando ? 'opacity-60' : ''">
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">Subtotal consumo:</dt><dd class="font-semibold tabular-nums">{{ m(simulacion.monto_total) }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">Interés ({{ simulacion.dias_gracia }} días hasta la fecha de pago{{ simulacion.modalidad === 'CUOTAS' ? ' + cuotas' : '' }}):</dt><dd class="font-semibold tabular-nums text-tertiary">{{ m(simulacion.interes_total) }}</dd></div>
            <div v-if="simulacion.modalidad === 'CUOTAS'" class="flex justify-between gap-2"><dt class="text-on-surface-variant">Cuota ({{ simulacion.num_cuotas }} meses):</dt><dd class="font-bold tabular-nums text-tertiary">{{ m(simulacion.valor_cuota) }} / mes</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-on-surface-variant">TCEA:</dt><dd class="font-semibold">{{ simulacion.tcea_pct ? formatRate(simulacion.tcea_pct, 2) : '—' }}</dd></div>
          </dl>

          <div class="mt-4 flex items-center justify-between rounded-control bg-surface-container p-4">
            <span class="text-label font-bold uppercase text-on-surface-variant">Total a pagar:</span>
            <span class="text-display font-bold text-primary" aria-live="polite">{{ simulacion ? m(simulacion.total_a_pagar) : '—' }}</span>
          </div>
          <span class="pointer-events-none absolute inset-x-0 -bottom-2 h-4" style="background: radial-gradient(circle at 8px 16px, transparent 7px, white 7.5px) repeat-x; background-size: 16px 16px" aria-hidden="true" />
        </div>
      </aside>

      <!-- ============ 3. Validación de saldo ============ -->
      <section class="lg:col-span-12" aria-labelledby="titulo-validacion">
        <h2 id="titulo-validacion" class="flex items-center gap-2 text-headline font-bold text-on-surface">
          <img :src="iconoValidacion" alt="" width="18" height="16" /> Validación de Saldo y Capacidad de Crédito
        </h2>
        <p class="text-body text-on-surface-variant">Control contable antes de confirmar el fiado en el cuaderno.</p>

        <div aria-live="polite" class="mt-4">
          <!-- Sin datos aún -->
          <div v-if="!cuerpo" class="rounded-card bg-white p-6 text-body text-on-surface-variant shadow-xs">Elige un cliente y agrega al menos un producto para validar la compra.</div>

          <!-- Error de negocio (plazo, producto que no permite la modalidad, moneda...) -->
          <div v-else-if="errorSimulacion" role="alert" class="flex flex-col gap-4 rounded-card border border-error/30 bg-error-container/40 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span class="inline-flex items-center gap-1 rounded-full bg-error px-2 py-0.5 text-label font-bold text-white"><img :src="iconoBloqueado" alt="" width="12" height="12" class="brightness-0 invert" /> Compra no permitida</span>
              <p class="mt-2 text-body-lg font-bold text-error">{{ errorSimulacion.message }}</p>
              <p v-if="errorSimulacion.code === 'excede_plazo'" class="text-caption text-error">Reduce el número de cuotas.</p>
            </div>
            <button type="button" disabled class="flex shrink-0 items-center gap-2 rounded-control bg-outline-variant px-8 py-3 text-body font-semibold text-white">Registrar Compra</button>
          </div>

          <!-- Excede el crédito: bloqueado -->
          <div v-else-if="simulacion?.excede_credito" role="alert" class="flex flex-col gap-4 rounded-card border border-error/30 bg-error-container/40 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span class="inline-flex items-center gap-1 rounded-full bg-error px-2 py-0.5 text-label font-bold text-white">Exceso de crédito bloqueado</span>
              <p class="mt-2 text-body-lg font-bold text-error">{{ simulacion.mensaje }}</p>
              <p class="mt-1 flex flex-wrap gap-2 text-caption">
                <span class="rounded-stamp bg-white px-2 py-0.5">Disponible: <strong class="text-tertiary">{{ m(simulacion.credito_disponible_antes) }}</strong></span>
                <span class="rounded-stamp bg-white px-2 py-0.5">Solicitado: <strong class="text-error">{{ m(simulacion.monto_total) }}</strong></span>
                <span class="rounded-stamp bg-white px-2 py-0.5">Déficit: <strong class="text-error">{{ m(simulacion.deficit) }}</strong></span>
              </p>
              <p class="mt-1 text-caption text-error">Este cliente ya llegó a su límite. Sube su límite o espera a que pague.</p>
            </div>
            <button type="button" disabled class="flex shrink-0 items-center gap-2 rounded-control bg-outline-variant px-8 py-3 text-body font-semibold text-white">
              <img :src="iconoBloqueado" alt="" width="15" height="15" class="brightness-0 invert" /> Registrar Compra
            </button>
          </div>

          <!-- Dentro del límite -->
          <div v-else class="flex flex-col gap-4 rounded-card bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div :class="calculando || !simulacion ? 'opacity-60' : ''">
              <span class="inline-flex items-center gap-1 rounded-full bg-success-container px-2 py-0.5 text-label font-bold text-success"><img :src="iconoOk" alt="" width="12" height="12" /> {{ calculando || !simulacion ? 'Calculando…' : 'Compra dentro del límite' }}</span>
              <p class="mt-2 flex flex-wrap items-baseline gap-x-3 text-body">
                Monto solicitado: <strong class="text-title text-primary">{{ m(simulacion?.monto_total) }}</strong>
                <span class="text-outline-variant">|</span>
                Disponible del cliente: <strong class="text-tertiary">{{ m(simulacion?.credito_disponible_antes) }}</strong>
              </p>
              <p class="text-body">Remanente tras compra: <strong class="text-success">{{ m(simulacion?.credito_disponible_despues) }}</strong></p>
              <p v-if="errorRegistro" role="alert" class="mt-2 text-body font-semibold text-error">{{ errorRegistro }}</p>
            </div>
            <button type="button" :disabled="!puedeRegistrar || registrando"
              class="flex shrink-0 items-center justify-center gap-2 rounded-control bg-primary-container px-8 py-3 text-body font-semibold text-white shadow-btn hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              @click="registrar">
              <span v-if="registrando" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              {{ registrando ? 'Registrando…' : 'Registrar Compra' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
