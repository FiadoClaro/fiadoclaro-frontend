<script setup lang="ts">
/**
 * Pantalla 11 — Listado de Pago del Periodo (/tienda/listados/:id, Figma node 4-7338).
 * Arriba, como en el Figma, se puede cambiar a otro listado del mismo cliente.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import * as statements from '@/api/statements'
import { ApiError } from '@/api/http'
import ListadoDetalle from '@/components/statements/ListadoDetalle.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import type { EstadoCuentaOut, EstadoCuentaResumen } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/format'
import iconoPago from '@/assets/icons/nav-pago.svg'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() => Number(route.params.id))

const listado = ref<EstadoCuentaOut | null>(null)
const otros = ref<EstadoCuentaResumen[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    listado.value = await statements.obtener(id.value)
    const p = await statements.listar({ cliente_id: listado.value.cliente_id, limit: 50 })
    otros.value = p.items
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo cargar el listado.'
  } finally {
    cargando.value = false
  }
}
watch(id, cargar, { immediate: true })

const opciones = computed(() =>
  otros.value.map((l) => ({ value: l.id, label: `Corte ${formatDate(l.fecha_corte)} · ${l.estado === 'PAGADO' ? 'pagado' : 'pendiente'}` })),
)
const elegido = computed({
  get: () => id.value,
  set: (v: number | null) => v && v !== id.value && router.push({ name: 'tienda-listado', params: { id: v } }),
})
</script>

<template>
  <section class="pb-8">
    <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
      <RouterLink :to="{ name: 'tienda-listados' }" class="text-on-surface-variant hover:underline">Listados</RouterLink>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <span class="font-semibold text-primary" aria-current="page">Listado de pago</span>
    </nav>
    <h1 class="text-headline font-bold text-on-surface">Listado de Pago del Periodo</h1>
    <p class="text-body text-on-surface-variant">Liquidación oficial de consumos a la fecha de corte</p>

    <p v-if="cargando && !listado" class="mt-6 rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando listado…</p>
    <p v-else-if="error" role="alert" class="mt-6 rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ error }}</p>

    <template v-else-if="listado">
      <div class="mt-6 grid gap-4 rounded-card bg-white p-4 shadow-xs sm:grid-cols-2">
        <div>
          <p class="text-label font-bold uppercase text-on-surface-variant">Cliente / libreta deudor</p>
          <p class="flex h-[42px] items-center rounded-control bg-surface-low px-3 text-body font-semibold">{{ listado.cliente }} (DNI: {{ listado.dni }})</p>
        </div>
        <div>
          <p class="flex items-center gap-1 text-label font-bold uppercase text-on-surface-variant">
            <label for="otro-listado">Listado de pago</label>
            <HelpTip campo="Listado de pago" texto="Otros listados del mismo cliente, por fecha de corte. Elige uno para verlo." />
          </p>
          <SelectInput id="otro-listado" v-model="elegido" :options="opciones" variante="relleno" />
        </div>
      </div>

      <div class="mt-6">
        <ListadoDetalle :listado="listado" :tienda-nombre="auth.tienda?.nombre_comercial" :tienda-ruc="auth.tienda?.ruc">
          <template #acciones>
            <section v-if="listado.estado === 'PENDIENTE'" class="rounded-card bg-white p-4 shadow-xs" aria-label="Acciones de cobranza">
              <p class="text-label font-bold uppercase text-on-surface-variant">Acciones de cobranza</p>
              <RouterLink :to="{ name: 'tienda-pago-nuevo', query: { listado: listado.id } }"
                class="mt-2 flex items-center justify-center gap-2 rounded-control bg-primary-container px-4 py-2.5 text-body font-semibold text-white shadow-btn hover:bg-primary">
                <img :src="iconoPago" alt="" width="18.33" height="13.33" class="brightness-0 invert" /> Registrar Pago Inmediato
              </RouterLink>
            </section>
            <p v-else class="rounded-card bg-success-container p-4 text-caption font-semibold text-success">Este listado ya fue pagado.</p>
          </template>
        </ListadoDetalle>
      </div>
    </template>
  </section>
</template>
