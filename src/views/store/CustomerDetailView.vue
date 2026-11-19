<script setup lang="ts">
/**
 * Detalle del cliente (/tienda/clientes/:id). Rol: ADMIN_TIENDA.
 * No hay una pantalla propia en el Figma; se arma con los mismos tokens y piezas.
 * Muestra datos, condiciones con sus equivalencias (del backend) y el resumen de crédito.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import * as customers from '@/api/customers'
import { ApiError } from '@/api/http'
import StatusStamp from '@/components/ui/StatusStamp.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { ClienteOut } from '@/types/api'
import { useToastStore } from '@/stores/toast'
import { formatDate, formatTime } from '@/utils/format'
import { iniciales } from '@/layouts/nav'
import TasaResumen from './customers/TasaResumen.vue'
import BarraCredito from './customers/BarraCredito.vue'
import iconoBaja from '@/assets/icons/modal-cliente-baja.svg'

const route = useRoute()
const toast = useToastStore()
const id = computed(() => Number(route.params.id))

const cliente = ref<ClienteOut | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    cliente.value = await customers.obtener(id.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo cargar el cliente.'
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const deBaja = computed(() => cliente.value?.estado === 'BAJA')
const nombre = computed(() => (cliente.value ? `${cliente.value.nombres} ${cliente.value.apellidos}` : ''))

// ---------------- Baja / reactivación ----------------
const dialogo = ref(false)
const procesando = ref(false)
const errorDialogo = ref<string | null>(null)
function abrirDialogo() {
  errorDialogo.value = null
  dialogo.value = true
}
async function confirmar() {
  if (!cliente.value) return
  procesando.value = true
  errorDialogo.value = null
  const reactivando = deBaja.value // se guarda antes, porque al recargar el cliente el estado cambia
  try {
    cliente.value = reactivando ? await customers.reactivar(cliente.value.id) : await customers.darDeBaja(cliente.value.id)
    dialogo.value = false
    toast.exito(reactivando ? `${nombre.value} fue reactivado` : `${nombre.value} fue dado de baja`)
  } catch (e) {
    // P. ej. "No se puede dar de baja a un cliente con deuda pendiente"
    errorDialogo.value = e instanceof ApiError ? e.message : 'No se pudo completar la operación.'
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <section class="pb-8">
    <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
      <span class="text-on-surface-variant">Inicio</span>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <RouterLink :to="{ name: 'tienda-clientes' }" class="text-on-surface-variant hover:underline">Clientes</RouterLink>
      <span class="text-outline-variant" aria-hidden="true">/</span>
      <span class="font-semibold text-primary" aria-current="page">Detalle</span>
    </nav>

    <p v-if="cargando" class="mt-6 rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando cliente…</p>
    <p v-else-if="error" role="alert" class="mt-6 rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ error }}</p>

    <template v-else-if="cliente">
      <!-- Encabezado -->
      <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex items-center gap-4">
          <span :class="deBaja ? 'bg-surface-highest text-on-surface-variant' : 'bg-primary-fixed text-primary'"
            class="flex size-14 shrink-0 items-center justify-center rounded-full text-title font-semibold" aria-hidden="true">
            {{ iniciales(nombre) }}
          </span>
          <div>
            <h1 class="text-headline font-bold text-on-surface">{{ nombre }}</h1>
            <p class="flex flex-wrap items-center gap-2 text-body text-on-surface-variant">
              DNI {{ cliente.dni }} · Cliente desde {{ formatDate(cliente.created_at) }}
              <StatusStamp :estado="deBaja ? 'BAJA' : cliente.resumen.estado_pago" />
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink :to="{ name: 'tienda-cliente-editar', params: { id: cliente.id } }"
            class="rounded-control bg-surface-high px-4 py-2.5 text-body font-semibold text-primary shadow-xs hover:bg-surface-highest">
            Editar datos
          </RouterLink>
          <RouterLink v-if="!deBaja" :to="{ name: 'tienda-cliente-condicion', params: { id: cliente.id } }"
            class="rounded-control bg-surface-high px-4 py-2.5 text-body font-semibold text-primary shadow-xs hover:bg-surface-highest">
            Cambiar condiciones
          </RouterLink>
          <RouterLink v-if="!deBaja" :to="{ name: 'tienda-compra-nueva', query: { cliente: cliente.id } }"
            class="rounded-control bg-primary-container px-4 py-2.5 text-body font-semibold text-white shadow-btn hover:bg-primary">
            Registrar compra
          </RouterLink>
          <button type="button" :class="deBaja ? 'bg-primary-fixed text-primary' : 'bg-error-container text-error'"
            class="rounded-control px-4 py-2.5 text-body font-semibold shadow-xs" @click="abrirDialogo">
            {{ deBaja ? 'Reactivar' : 'Dar de baja' }}
          </button>
        </div>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-3">
        <!-- Resumen de crédito -->
        <section class="rounded-card bg-white p-6 shadow-xs lg:col-span-1" aria-labelledby="titulo-credito">
          <h2 id="titulo-credito" class="text-title font-semibold">Línea de crédito</h2>
          <dl class="mt-4 grid grid-cols-2 gap-3">
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Límite</dt><dd class="text-body-lg font-bold"><MoneyText :valor="cliente.resumen.limite" :moneda="cliente.condicion.moneda" /></dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Disponible</dt><dd class="text-body-lg font-bold text-primary"><MoneyText :valor="cliente.resumen.disponible" :moneda="cliente.condicion.moneda" /></dd></div>
          </dl>
          <div class="mt-3">
            <p class="mb-1 text-label font-bold uppercase text-on-surface-variant">Utilizado</p>
            <BarraCredito :utilizado="cliente.resumen.utilizado" :porcentaje="cliente.resumen.porcentaje_utilizado" :moneda="cliente.condicion.moneda" :apagado="deBaja" />
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-surface-container pt-4">
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Próximo corte</dt><dd class="text-body font-semibold">{{ formatDate(cliente.resumen.proximo_corte) }}</dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Próximo pago</dt><dd class="text-body font-semibold text-primary">{{ formatDate(cliente.resumen.proximo_pago) }}</dd></div>
            <div class="col-span-2"><dt class="text-label font-bold uppercase text-on-surface-variant">Listados pendientes</dt><dd class="text-body font-semibold">{{ cliente.resumen.listados_pendientes }}</dd></div>
          </dl>
        </section>

        <!-- Condiciones -->
        <section class="rounded-card bg-white p-6 shadow-xs lg:col-span-2" aria-labelledby="titulo-condiciones">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-condiciones" class="text-title font-semibold">Condiciones del crédito</h2>
            <p class="text-caption text-on-surface-variant">Equivalencias calculadas por el sistema (año 360 / mes 30)</p>
          </div>
          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <TasaResumen titulo="Tasa compensatoria" :tasa="cliente.condicion.tasa" />
            <TasaResumen titulo="Tasa moratoria" :tasa="cliente.condicion.tasa_mora" />
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Moneda</dt><dd class="text-body font-semibold">{{ cliente.condicion.moneda === 'USD' ? 'Dólares (US$)' : 'Soles (S/)' }}</dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Máx. de meses</dt><dd class="text-body font-semibold">{{ cliente.condicion.max_meses }}</dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Corte</dt><dd class="text-body font-semibold">Día {{ cliente.condicion.dia_corte }} · {{ formatTime(cliente.condicion.hora_corte) }}</dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Pago</dt><dd class="text-body font-semibold">Día {{ cliente.condicion.dia_pago }} de c/mes</dd></div>
          </dl>
        </section>

        <!-- Datos y acceso -->
        <section class="rounded-card bg-white p-6 shadow-xs lg:col-span-3" aria-labelledby="titulo-datos">
          <h2 id="titulo-datos" class="text-title font-semibold">Datos de contacto y acceso</h2>
          <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Teléfono</dt><dd class="text-body">{{ cliente.telefono ?? '—' }}</dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Correo</dt><dd class="break-all text-body">{{ cliente.correo ?? '—' }}</dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Dirección</dt><dd class="text-body">{{ cliente.direccion ?? '—' }}</dd></div>
            <div><dt class="text-label font-bold uppercase text-on-surface-variant">Usuario del portal</dt><dd class="break-all text-body font-semibold">{{ cliente.usuario }}</dd></div>
          </dl>
        </section>
      </div>

      <!-- Baja / reactivación (Figma 4-5385) -->
      <ConfirmDialog
        v-model:open="dialogo"
        variante="centrado"
        :icono="iconoBaja"
        :titulo="deBaja ? '¿Reactivar a este cliente?' : '¿Dar de baja a este cliente?'"
        :confirm-text="deBaja ? 'Reactivar cliente' : 'Confirmar baja'"
        :tono="deBaja ? 'positivo' : 'peligro'"
        :loading="procesando"
        :error="errorDialogo"
        @confirm="confirmar"
      >
        <template #detalles>
          <div class="flex items-center justify-between border-b border-surface-highest/60 pb-2">
            <span class="text-label font-bold uppercase text-on-surface-variant">{{ deBaja ? 'Cliente a reactivar:' : 'Cliente a suspender:' }}</span>
            <span class="rounded-stamp bg-primary-fixed px-2 py-0.5 text-label font-bold text-primary">Estado: {{ cliente.estado }}</span>
          </div>
          <p class="pt-2 text-body-lg font-semibold">{{ nombre }}</p>
          <p class="text-caption text-on-surface-variant">DNI: <strong class="text-on-surface">{{ cliente.dni }}</strong></p>
        </template>
        <template v-if="!deBaja">
          ¿Estás seguro de dar de baja a <strong class="font-semibold text-on-surface">{{ nombre }} (DNI {{ cliente.dni }})</strong>? Pasará al estado de baja y ya no
          podrá solicitar fiados ni ingresar al portal. El historial de cuenta se mantiene registrado. Si tiene deuda pendiente, el sistema no lo permitirá.
        </template>
        <template v-else>
          <strong class="font-semibold text-on-surface">{{ nombre }}</strong> volverá a estar activo y podrá ingresar al portal y comprar fiado nuevamente.
        </template>
      </ConfirmDialog>
    </template>
  </section>
</template>
