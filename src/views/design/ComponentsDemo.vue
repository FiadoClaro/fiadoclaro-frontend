<script setup lang="ts">
/**
 * Catálogo de componentes base (fase 3) para revisarlos en /design.
 * Los datos son de ejemplo (los del Figma); en las pantallas reales vienen del backend.
 */
import { computed, ref } from 'vue'
import FormField from '@/components/forms/FormField.vue'
import TextInput from '@/components/forms/TextInput.vue'
import MoneyInput from '@/components/forms/MoneyInput.vue'
import RateInput from '@/components/forms/RateInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import SegmentedToggle from '@/components/forms/SegmentedToggle.vue'
import DayInput from '@/components/forms/DayInput.vue'
import TimeInput from '@/components/forms/TimeInput.vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import RateText from '@/components/ui/RateText.vue'
import DataTable from '@/components/ui/DataTable.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { Columna } from '@/components/ui/tabla'
import { useToastStore } from '@/stores/toast'
import iconoUsuario from '@/assets/icons/login-usuario.svg'
import iconoDiaPago from '@/assets/icons/campo-dia-pago.svg'
import iconoPlazo from '@/assets/icons/campo-plazo.svg'
import iconoClienteBaja from '@/assets/icons/modal-cliente-baja.svg'

const toast = useToastStore()

// ---------- Formulario de ejemplo ----------
const ruc = ref('20554892101')
const nombre = ref('')
const moneda = ref<'PEN' | 'USD'>('PEN')
const limite = ref('800.00')
const tasa = ref('3.5')
const tipoTasa = ref<'NOMINAL' | 'EFECTIVA'>('NOMINAL')
const periodo = ref<30 | 360>(30)
const capitalizacion = ref<number | null>(1)
const plazo = ref<number | null>(3)
const diaCorte = ref<number | null>(25)
const horaCorte = ref('18:00')
const diaPago = ref<number | null>(5)
const giro = ref<string | null>('Bodega')

const errorNombre = computed(() => (nombre.value.trim() === '' ? 'El nombre comercial es obligatorio' : null))

// ---------- Tabla de ejemplo (Figma 4b) ----------
interface ClienteDemo {
  id: number
  nombre: string
  dni: string
  tasa: string
  limite: string
  usado: string
  estado: string
}
const clientes: ClienteDemo[] = [
  { id: 1, nombre: 'Rosa Flores Benites', dni: '08765432', tasa: '3.5000000', limite: '800.00', usado: '650.00', estado: 'EN_MORA' },
  { id: 2, nombre: 'Carlos Mendoza Soto', dni: '10234567', tasa: '3.0000000', limite: '500.00', usado: '480.00', estado: 'EN_MORA' },
  { id: 3, nombre: 'Elena Paucar Gómez', dni: '45892134', tasa: '3.5000000', limite: '1200.00', usado: '320.00', estado: 'AL_DIA' },
  { id: 4, nombre: 'Juan de Dios Castillo', dni: '07891234', tasa: '4.0000000', limite: '600.00', usado: '0.00', estado: 'BAJA' },
]
const columnas: Columna[] = [
  { key: 'nombre', label: 'Cliente' },
  { key: 'dni', label: 'DNI' },
  { key: 'tasa', label: 'Tasa', align: 'right' },
  { key: 'limite', label: 'Límite', align: 'right' },
  { key: 'usado', label: 'Crédito utilizado', align: 'right' },
  { key: 'estado', label: 'Estado', align: 'center' },
  { key: 'acciones', label: 'Acciones', align: 'right' },
]
const busqueda = ref('')
const filtro = ref('')
const offset = ref(0)
const limit = 3
// Solo en esta demo se filtra en el navegador; en las vistas reales filtra el backend.
const filtrados = computed(() =>
  clientes.filter(
    (c) =>
      (!filtro.value || c.estado === filtro.value) &&
      (!busqueda.value || c.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) || c.dni.includes(busqueda.value)),
  ),
)
const pagina = computed(() => filtrados.value.slice(offset.value, offset.value + limit))
const chips = computed(() => [
  { value: '', label: 'Todos', count: clientes.length },
  { value: 'AL_DIA', label: 'Al día', count: clientes.filter((c) => c.estado === 'AL_DIA').length },
  { value: 'EN_MORA', label: 'En mora', count: clientes.filter((c) => c.estado === 'EN_MORA').length },
  { value: 'BAJA', label: 'De baja', count: clientes.filter((c) => c.estado === 'BAJA').length },
])

// ---------- Diálogos ----------
const dialogoTienda = ref(false)
const dialogoCliente = ref(false)
const procesando = ref(false)
const errorDialogo = ref<string | null>(null)
function confirmarTienda() {
  procesando.value = true
  setTimeout(() => {
    procesando.value = false
    dialogoTienda.value = false
    toast.exito('Bodega Don Lucho fue dada de baja (demo)')
  }, 900)
}
function confirmarCliente() {
  // Simula la respuesta del backend cuando el cliente tiene deuda.
  errorDialogo.value = 'No se puede dar de baja: el cliente tiene deuda pendiente (S/ 314.60).'
}

const estados = ['ACTIVA', 'ACTIVO', 'AL_DIA', 'EN_MORA', 'BAJA', 'PENDIENTE', 'PAGADO', 'VENCIDA']
</script>

<template>
  <section class="space-y-10">
    <div>
      <h2 class="text-headline font-bold">Componentes base</h2>
      <p class="mt-1 text-body text-on-surface-variant">
        Fase 3. Todos los campos usan <code class="rounded-stamp bg-surface-high px-1">FormField</code> con su ayuda “?”:
        prueba con el mouse, con Tab (y Escape para cerrar) y con un toque.
      </p>
    </div>

    <!-- ===== Formularios ===== -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Variante blanca (Figma 3) -->
      <div class="space-y-4 rounded-card bg-white p-6 shadow-xs">
        <h3 class="text-title font-semibold">Campos · variante blanca (Figma 3)</h3>
        <FormField
          v-slot="{ id, describedBy, invalid }"
          label="Nombre comercial"
          help="Nombre con el que los vecinos conocen el negocio, p. ej. Bodega Don Lucho."
          required
          :error="errorNombre"
        >
          <TextInput :id="id" v-model="nombre" :aria-describedby="describedBy" :invalid="invalid" placeholder="Bodega Don Lucho" />
        </FormField>
        <FormField
          v-slot="{ id, describedBy, invalid }"
          label="RUC (11 dígitos)"
          help-title="Número de RUC"
          help="Registro Único de Contribuyentes activo y habido en SUNAT. Ejemplo: 20554892101."
          required
        >
          <TextInput :id="id" v-model="ruc" :aria-describedby="describedBy" :invalid="invalid" :digitos="11" :icono="iconoUsuario" :icono-ancho="16.67" :icono-alto="16.67" />
        </FormField>
        <FormField v-slot="{ id, describedBy, invalid }" label="Giro comercial" help="Tipo de negocio: bodega, frutería, peluquería…" required>
          <SelectInput
            :id="id"
            v-model="giro"
            :aria-describedby="describedBy"
            :invalid="invalid"
            placeholder="Selecciona un giro"
            :options="[
              { value: 'Bodega', label: 'Bodega' },
              { value: 'Frutería', label: 'Frutería' },
              { value: 'Peluquería', label: 'Peluquería' },
            ]"
          />
        </FormField>
        <FormField
          v-slot="{ id, describedBy, invalid }"
          label="Precio al contado"
          help="Precio de venta en efectivo en el mostrador. Máximo 2 decimales."
          hint="Cobro en mostrador"
        >
          <MoneyInput :id="id" v-model="limite" :moneda="moneda" :aria-describedby="describedBy" :invalid="invalid" />
        </FormField>
        <p class="text-caption text-on-surface-variant">Valor guardado (texto): <code>"{{ limite }}"</code></p>
      </div>

      <!-- Variante rellena (Figma 5) -->
      <div class="space-y-4 rounded-card bg-white p-6 shadow-xs">
        <h3 class="text-title font-semibold">Campos · variante rellena (Figma 5)</h3>
        <div class="grid gap-4 rounded-control bg-surface-low/70 p-4 sm:grid-cols-2">
          <FormField v-slot="{ labelId, describedBy }" label="Moneda del crédito" help="Moneda en la que se otorga el crédito y se cobran las cuotas." required tono="claro">
            <SegmentedToggle
              v-model="moneda"
              :labelledby="labelId"
              :describedby="describedBy"
              :options="[
                { value: 'PEN', label: 'Soles (S/)' },
                { value: 'USD', label: 'Dólares ($)' },
              ]"
            />
          </FormField>
          <FormField v-slot="{ labelId, describedBy }" label="Periodo de la tasa" help="Si la tasa pactada es mensual (30 días) o anual (360 días)." required tono="claro">
            <SegmentedToggle
              v-model="periodo"
              :labelledby="labelId"
              :describedby="describedBy"
              :options="[
                { value: 30, label: 'Mensual' },
                { value: 360, label: 'Anual' },
              ]"
            />
          </FormField>
          <FormField
            v-slot="{ id, describedBy, invalid }"
            label="Tasa compensatoria pactada (%)"
            help-title="Ayuda tasa pactada"
            help="Es el interés compensatorio convenido con el cliente por el financiamiento en bodega. Se escribe el porcentaje: 3.5 = 3.5 %."
            required
            tono="claro"
          >
            <RateInput :id="id" v-model="tasa" variante="blanco" :aria-describedby="describedBy" :invalid="invalid" />
          </FormField>
          <FormField v-slot="{ labelId, describedBy }" label="Tipo de tasa" help="Nominal: se capitaliza según el periodo elegido. Efectiva: ya incluye la capitalización." tono="claro">
            <SegmentedToggle
              v-model="tipoTasa"
              :labelledby="labelId"
              :describedby="describedBy"
              :options="[
                { value: 'NOMINAL', label: 'Nominal' },
                { value: 'EFECTIVA', label: 'Efectiva' },
              ]"
            />
          </FormField>
          <FormField
            v-slot="{ id, describedBy }"
            label="Capitalización de la tasa nominal"
            help="Cada cuántos días se suman los intereses al capital. Por regla del curso, diaria."
            tono="claro"
            class="sm:col-span-2"
          >
            <SelectInput
              :id="id"
              v-model="capitalizacion"
              variante="blanco"
              :aria-describedby="describedBy"
              :disabled="tipoTasa === 'EFECTIVA'"
              :options="[
                { value: 1, label: 'Diaria' },
                { value: 15, label: 'Quincenal' },
                { value: 30, label: 'Mensual' },
              ]"
            />
          </FormField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-slot="{ id, describedBy, invalid }" label="Límite máximo de crédito" help="Monto máximo que el vecino puede deber a la vez." required tono="claro">
            <MoneyInput :id="id" v-model="limite" :moneda="moneda" variante="relleno" :aria-describedby="describedBy" :invalid="invalid" />
          </FormField>
          <FormField v-slot="{ id, describedBy }" label="Plazo máximo de financiamiento" help="Número máximo de cuotas mensuales (1 a 36)." required tono="claro">
            <SelectInput
              :id="id"
              v-model="plazo"
              variante="relleno"
              :icono="iconoPlazo"
              :icono-ancho="15.75"
              :icono-alto="16.5"
              :aria-describedby="describedBy"
              :options="[1, 2, 3, 6, 12].map((m) => ({ value: m, label: `${m} ${m === 1 ? 'mes' : 'meses'} (${m * 30} días)` }))"
            />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Día y hora de corte" help="Las compras hechas antes de esta fecha y hora entran al listado de este mes; las posteriores, al del mes siguiente. Día de 1 a 28." required tono="claro">
            <div class="flex gap-2">
              <DayInput :id="id" v-model="diaCorte" :aria-describedby="describedBy" :invalid="invalid" aria-label="Día de corte" />
              <TimeInput v-model="horaCorte" :aria-describedby="describedBy" aria-label="Hora de corte" />
            </div>
          </FormField>
          <FormField
            v-slot="{ id, describedBy, invalid }"
            label="Día de pago mensual"
            help="Día del mes en que vence el pago (1 a 28, distinto al día de corte)."
            required
            tono="claro"
            :error="diaPago !== null && (diaPago < 1 || diaPago > 28) ? 'El día debe estar entre 1 y 28' : null"
          >
            <DayInput :id="id" v-model="diaPago" sufijo="de cada mes" :icono="iconoDiaPago" :aria-describedby="describedBy" :invalid="invalid" />
          </FormField>
        </div>
        <p class="text-caption text-on-surface-variant">
          moneda={{ moneda }} · tasa="{{ tasa }}" {{ tipoTasa }} {{ periodo }} d · capitalización={{ capitalizacion }} · corte={{ diaCorte }} {{ horaCorte }} · pago={{ diaPago }}
        </p>
      </div>
    </div>

    <!-- ===== Sellos, montos y tasas ===== -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-3 rounded-card bg-white p-6 shadow-xs">
        <h3 class="text-title font-semibold">StatusStamp</h3>
        <div class="flex flex-wrap items-center gap-4">
          <div v-for="e in estados" :key="e" class="flex flex-col items-center gap-1">
            <StatusStamp :estado="e" />
            <code class="text-micro text-outline">{{ e }}</code>
          </div>
        </div>
      </div>
      <div class="space-y-3 rounded-card bg-white p-6 shadow-xs">
        <h3 class="text-title font-semibold">MoneyText · RateText · HelpTip suelto</h3>
        <ul class="space-y-1 text-body">
          <li><MoneyText valor="1234.5" class="font-semibold" /> · <MoneyText valor="99" moneda="USD" class="font-semibold" /></li>
          <li><RateText valor="3.5000000" periodo="mensual" class="font-semibold" /> · <RateText valor="51.1069" :decimales="4" periodo="TEA" class="font-semibold" /></li>
          <li class="flex items-center gap-2">
            Ayuda flotante (sin FormField)
            <HelpTip campo="Ejemplo" titulo="Cómputo comercial" texto="Año de 360 días y mes de 30 días, según el Anexo A del curso." />
          </li>
        </ul>
      </div>
    </div>

    <!-- ===== Tabla ===== -->
    <div class="space-y-3">
      <h3 class="text-title font-semibold">DataTable (Figma 4b)</h3>
      <DataTable
        v-model:busqueda="busqueda"
        v-model:filtro="filtro"
        v-model:offset="offset"
        :columns="columnas"
        :rows="pagina"
        row-key="id"
        :total="filtrados.length"
        :limit="limit"
        :chips="chips"
        search-placeholder="Buscar por DNI o nombre..."
        folio="Cuaderno Principal Bodega"
        nombre-registros="clientes"
        caption="Clientes de ejemplo"
        :row-class="(c) => (c.estado === 'BAJA' ? 'bg-surface-high/40 text-outline' : '')"
      >
        <template #cell-nombre="{ row }"><span class="font-semibold">{{ row.nombre }}</span></template>
        <template #cell-tasa="{ row }"><RateText :valor="row.tasa" class="font-semibold" /></template>
        <template #cell-limite="{ row }"><MoneyText :valor="row.limite" class="font-semibold" /></template>
        <template #cell-usado="{ row }"><MoneyText :valor="row.usado" /></template>
        <template #cell-estado="{ row }"><StatusStamp :estado="row.estado" /></template>
        <template #cell-acciones="{ row }">
          <button type="button" class="rounded-control px-2 py-1 text-caption font-semibold text-error hover:bg-error-container/50" @click="row.estado === 'BAJA' ? toast.info('Ya está de baja') : (dialogoCliente = true)">
            Dar de baja
          </button>
        </template>
      </DataTable>
      <div class="flex flex-wrap gap-3">
        <DataTable :columns="columnas.slice(0, 3)" :rows="[]" row-key="id" loading class="flex-1" />
        <DataTable :columns="columnas.slice(0, 3)" :rows="[]" row-key="id" error="No se pudo conectar con el servidor." class="flex-1" />
      </div>
    </div>

    <!-- ===== Diálogos y toasts ===== -->
    <div class="flex flex-wrap items-center gap-3 rounded-card bg-white p-6 shadow-xs">
      <h3 class="w-full text-title font-semibold">ConfirmDialog y Toast</h3>
      <button type="button" class="rounded-control bg-error px-4 py-2 text-body font-semibold text-white" @click="dialogoTienda = true">Baja de tienda (lateral)</button>
      <button type="button" class="rounded-control bg-error px-4 py-2 text-body font-semibold text-white" @click="(errorDialogo = null), (dialogoCliente = true)">Baja de cliente (centrado)</button>
      <button type="button" class="rounded-control bg-primary-container px-4 py-2 text-body font-semibold text-white" @click="toast.exito('Cliente registrado correctamente')">Toast de éxito</button>
      <button type="button" class="rounded-control bg-surface-high px-4 py-2 text-body font-semibold text-error" @click="toast.error('La tasa supera el tope BCRP vigente (114.68 % TEA)')">Toast de error</button>
    </div>

    <ConfirmDialog
      v-model:open="dialogoTienda"
      eyebrow="Acción crítica del sistema"
      titulo="¿Dar de baja esta tienda?"
      :loading="procesando"
      @confirm="confirmarTienda"
    >
      <template #detalles>
        <div class="flex items-center justify-between gap-2">
          <span class="text-caption font-semibold text-on-surface-variant">Comercio a afectar:</span>
          <span class="text-body-lg font-bold">Bodega Don Lucho</span>
        </div>
        <div class="mt-1.5 flex items-center justify-between gap-2">
          <span class="text-label font-bold text-on-surface-variant">RUC Registrado:</span>
          <span class="text-body">20554892101</span>
        </div>
      </template>
      Estás a punto de dar de baja a la tienda: <strong>Bodega Don Lucho (RUC: 20554892101)</strong>. La tienda ya no podrá
      emitir nuevos fiados ni registrar compras.
    </ConfirmDialog>

    <ConfirmDialog
      v-model:open="dialogoCliente"
      variante="centrado"
      titulo="¿Dar de baja a este cliente?"
      :icono="iconoClienteBaja"
      :error="errorDialogo"
      @confirm="confirmarCliente"
    >
      <template #detalles>
        <div class="flex items-center justify-between border-b border-surface-highest/60 pb-2">
          <span class="text-label font-bold uppercase text-on-surface-variant">Cliente a suspender:</span>
          <span class="rounded-stamp bg-primary-fixed px-2 py-0.5 text-label font-bold text-primary">Estado: ACTIVO</span>
        </div>
        <p class="pt-2 text-body-lg font-semibold">Rosa Flores Benites</p>
        <p class="text-caption text-on-surface-variant">DNI: <strong class="text-on-surface">08765432</strong></p>
      </template>
      ¿Estás seguro de dar de baja a <strong class="font-semibold text-on-surface">Rosa Flores Benites (DNI 08765432)</strong>? La clienta
      pasará al estado de baja y ya no podrá solicitar fiados ni compras a crédito. El historial de cuenta y saldos pendientes se mantendrán
      registrados.
    </ConfirmDialog>
  </section>
</template>
