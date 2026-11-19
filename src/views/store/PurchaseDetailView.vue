<script setup lang="ts">
/**
 * Detalle de compra (/tienda/compras/:id) con la pantalla 9 — Cronograma de Pagos (Figma 4-7750).
 * GET /purchases/{id} trae la tasa pactada (copia guardada en la compra) y el cronograma.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import * as purchases from '@/api/purchases'
import * as customers from '@/api/customers'
import { ApiError } from '@/api/http'
import CronogramaPagos from '@/components/purchases/CronogramaPagos.vue'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import type { ClienteOut, CompraOut } from '@/types/api'
import { formatDateTime, formatMoney } from '@/utils/format'

const route = useRoute()
const id = computed(() => Number(route.params.id))

const compra = ref<CompraOut | null>(null)
const cliente = ref<ClienteOut | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    compra.value = await purchases.obtener(id.value)
    try {
      cliente.value = await customers.obtener(compra.value.cliente_id)
    } catch {
      // Sin datos del cliente el cronograma se muestra igual.
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo cargar la compra.'
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <section class="pb-8">
    <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
      <span class="text-on-surface-variant">Inicio</span>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <RouterLink :to="{ name: 'tienda-compras' }" class="text-on-surface-variant hover:underline">Compras</RouterLink>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <span class="font-semibold text-primary" aria-current="page">Cronograma de pagos</span>
    </nav>
    <div class="mt-1 flex flex-wrap items-end justify-between gap-3 pb-6">
      <div>
        <h1 class="text-headline font-bold text-on-surface">Cronograma de Pagos del Fiado</h1>
        <p class="text-body text-on-surface-variant">
          {{ compra?.modalidad === 'CUOTAS' ? 'Simulación de amortización bajo método francés vencido ordinario' : 'Pago único en la fecha de pago del ciclo' }}
        </p>
      </div>
      <div v-if="compra" class="flex items-center gap-3 text-caption text-on-surface-variant">
        Compra #{{ compra.id }} · {{ formatDateTime(compra.fecha_hora) }}
        <StatusStamp :estado="compra.estado" />
      </div>
    </div>

    <p v-if="cargando" class="rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando compra…</p>
    <p v-else-if="error" role="alert" class="rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ error }}</p>
    <template v-else-if="compra">
      <CronogramaPagos
        :compra="compra"
        :cliente-nombre="cliente ? `${cliente.nombres} ${cliente.apellidos}` : `Cliente #${compra.cliente_id}`"
        :cliente-dni="cliente?.dni"
        :estado-pago="cliente?.resumen.estado_pago"
      />
      <section class="mt-8 rounded-card bg-white p-6 shadow-xs" aria-labelledby="titulo-items">
        <h2 id="titulo-items" class="text-title font-semibold">Productos de la compra</h2>
        <ul class="mt-3 divide-y divide-surface-container text-body">
          <li v-for="(d, i) in compra.detalles" :key="i" class="flex justify-between gap-3 py-2">
            <span>{{ d.cantidad }} × {{ d.descripcion }}</span>
            <span class="font-semibold tabular-nums">{{ formatMoney(d.subtotal, compra.moneda) }}</span>
          </li>
        </ul>
      </section>
      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink :to="{ name: 'tienda-compra-nueva' }" class="rounded-control bg-primary-container px-6 py-2.5 text-body font-semibold text-white shadow-btn hover:bg-primary">Registrar otra compra</RouterLink>
        <RouterLink v-if="cliente" :to="{ name: 'tienda-cliente', params: { id: cliente.id } }" class="rounded-control bg-surface-high px-6 py-2.5 text-body font-semibold text-primary hover:bg-surface-highest">Ver cliente</RouterLink>
      </div>
    </template>
  </section>
</template>
