<script setup lang="ts">
/**
 * Cambiar condiciones de crédito (/tienda/clientes/:id/condicion). Rol: ADMIN_TIENDA.
 * PUT /customers/{id}/condicion. Solo afecta compras FUTURAS: cada compra guarda una copia de la
 * tasa pactada (observación del profesor ya resuelta en el backend).
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import * as customers from '@/api/customers'
import { ApiError } from '@/api/http'
import { useEquivalencias } from '@/composables/useEquivalencias'
import { useTopes } from '@/composables/useTopes'
import { useToastStore } from '@/stores/toast'
import { aplicarErroresApi } from '@/utils/erroresFormulario'
import { formatMoney } from '@/utils/format'
import type { ClienteOut } from '@/types/api'
import CondicionFields from './customers/CondicionFields.vue'
import ResumenApertura from './customers/ResumenApertura.vue'
import ReglasCuaderno from './customers/ReglasCuaderno.vue'
import { REGLAS_ERROR_CONDICION, type CondicionForm, condicionDesdeBackend, condicionInicial, condicionParaBackend, esquemaCondicion, tasaParaBackend } from './customers/condicion'
import iconoInfo from '@/assets/icons/modal-info.svg'
import iconoGuardar from '@/assets/icons/guardar.svg'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const id = computed(() => Number(route.params.id))

const esquema = z.object({ condicion: esquemaCondicion })
const { handleSubmit, setFieldError, setValues, values, isSubmitting } = useForm<{ condicion: CondicionForm }>({
  validationSchema: toTypedSchema(esquema),
  initialValues: { condicion: condicionInicial() },
})

const cliente = ref<ClienteOut | null>(null)
const cargando = ref(true)
const errorCarga = ref<string | null>(null)
const errorGeneral = ref<string | null>(null)

onMounted(async () => {
  try {
    cliente.value = await customers.obtener(id.value)
    setValues({ condicion: condicionDesdeBackend(cliente.value.condicion) })
  } catch (e) {
    errorCarga.value = e instanceof ApiError ? e.message : 'No se pudo cargar el cliente.'
  } finally {
    cargando.value = false
  }
})

const tasaComp = computed(() => tasaParaBackend(values.condicion.tasa))
const tasaMora = computed(() => tasaParaBackend(values.condicion.tasa_mora))
const { resultado: equivComp, cargando: calculando } = useEquivalencias(tasaComp)
const { resultado: equivMora } = useEquivalencias(tasaMora)
const { vigente } = useTopes()
const topeComp = computed(() => vigente('COMPENSATORIA', values.condicion.moneda))
const topeMora = computed(() => vigente('MORATORIA', values.condicion.moneda))

const CAMPOS = [
  'condicion.moneda', 'condicion.tasa.valor', 'condicion.tasa.capitalizacion_dias', 'condicion.tasa_mora.valor',
  'condicion.limite_credito', 'condicion.max_meses', 'condicion.dia_corte', 'condicion.hora_corte', 'condicion.dia_pago',
]

const guardar = handleSubmit(
  async (v) => {
    errorGeneral.value = null
    try {
      const c = await customers.cambiarCondicion(id.value, condicionParaBackend(v.condicion))
      toast.exito(`Condiciones de ${c.nombres} actualizadas. Se aplican a las compras nuevas.`)
      await router.push({ name: 'tienda-cliente', params: { id: c.id } })
    } catch (e) {
      errorGeneral.value = aplicarErroresApi(e, (campo, m) => setFieldError(campo as 'condicion', m), CAMPOS, REGLAS_ERROR_CONDICION)
      if (!errorGeneral.value) toast.error('Revisa los campos marcados en rojo.')
    }
  },
  () => toast.error('Revisa los campos marcados en rojo.'),
)

const nombre = computed(() => (cliente.value ? `${cliente.value.nombres} ${cliente.value.apellidos}` : ''))
</script>

<template>
  <section class="pb-8">
    <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
      <RouterLink :to="{ name: 'tienda-clientes' }" class="text-on-surface-variant hover:underline">Clientes</RouterLink>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <RouterLink :to="{ name: 'tienda-cliente', params: { id } }" class="text-on-surface-variant hover:underline">{{ nombre || 'Cliente' }}</RouterLink>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <span class="font-semibold text-primary" aria-current="page">Cambiar condiciones</span>
    </nav>
    <h1 class="mt-4 text-headline font-bold text-on-surface">Cambiar Condiciones del Crédito</h1>

    <p v-if="cargando" class="mt-6 rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando condiciones…</p>
    <p v-else-if="errorCarga" role="alert" class="mt-6 rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ errorCarga }}</p>

    <template v-else-if="cliente">
      <!-- Aviso: solo compras futuras -->
      <p class="mt-4 flex gap-2 rounded-control bg-tertiary-fixed/40 p-4 text-body text-on-surface" role="note">
        <img :src="iconoInfo" alt="" width="16.67" height="18.67" class="mt-0.5 shrink-0" />
        <span>
          <strong>Solo afecta compras futuras.</strong> Las compras ya registradas conservan la tasa con la que se pactaron. Hoy
          {{ nombre }} tiene {{ formatMoney(cliente.resumen.utilizado, cliente.condicion.moneda) }} utilizados de su línea.
        </span>
      </p>

      <form class="mt-6 grid gap-8 lg:grid-cols-12" novalidate @submit="guardar">
        <div class="flex flex-col gap-6 lg:col-span-8">
          <div class="relative overflow-hidden rounded-card bg-white p-6 shadow-xs sm:p-8">
            <span class="pointer-events-none absolute inset-y-0 left-6 w-0.5 bg-error/25" aria-hidden="true" />
            <div class="pl-6">
              <CondicionFields :equiv-compensatoria="equivComp" :equiv-moratoria="equivMora" :tope-compensatoria="topeComp" :tope-moratoria="topeMora" />
            </div>
          </div>
          <p v-if="errorGeneral" role="alert" class="rounded-control border border-error/30 bg-error-container px-4 py-3 text-body font-semibold text-error">{{ errorGeneral }}</p>
          <div class="flex justify-end gap-4">
            <RouterLink :to="{ name: 'tienda-cliente', params: { id } }" class="flex h-10 items-center rounded-control bg-surface-high px-8 text-body font-semibold hover:bg-surface-highest">Cancelar</RouterLink>
            <button type="submit" :disabled="isSubmitting"
              class="flex h-10 items-center gap-1 rounded-control bg-primary-container px-10 text-body font-semibold text-white shadow-btn hover:bg-primary disabled:cursor-wait disabled:opacity-70">
              <span v-if="isSubmitting" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              <img v-else :src="iconoGuardar" alt="" width="15" height="15" />
              {{ isSubmitting ? 'Guardando…' : 'Guardar condiciones' }}
            </button>
          </div>
        </div>
        <aside class="flex flex-col gap-6 lg:col-span-4">
          <ResumenApertura
            etiqueta="Nuevas condiciones"
            :nombre="nombre"
            :dni="cliente.dni"
            :moneda="values.condicion.moneda"
            :limite="values.condicion.limite_credito"
            :tasa="values.condicion.tasa.valor"
            :periodo-dias="values.condicion.tasa.periodo_dias"
            :tipo-tasa="values.condicion.tasa.tipo"
            :equivalencias="equivComp"
            :calculando="calculando"
            :dia-corte="values.condicion.dia_corte"
            :hora-corte="values.condicion.hora_corte"
            :dia-pago="values.condicion.dia_pago"
            :capacidad="`Disponible hoy: ${formatMoney(cliente.resumen.disponible, cliente.condicion.moneda)}`"
          />
          <ReglasCuaderno :dia-corte="values.condicion.dia_corte" :hora-corte="values.condicion.hora_corte" :dia-pago="values.condicion.dia_pago" />
        </aside>
      </form>
    </template>
  </section>
</template>
