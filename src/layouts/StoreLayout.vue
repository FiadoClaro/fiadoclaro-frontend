<script setup lang="ts">
/**
 * Layout del ADMINISTRADOR DE TIENDA (Figma 4b node 32-2 y 15 node 43-1297).
 * Barra lateral: tarjeta de la tienda, "Operaciones cuaderno" y "Mi cuenta".
 * Cabecera: miga de pan Inicio / tienda / sección + RUC; a la derecha, nombre y "Administrador".
 * Pie: recordatorio de la regla contable (360 / 30).
 */
import { RouterLink, useRoute } from 'vue-router'
import AppShell from './components/AppShell.vue'
import StoreCard from './components/StoreCard.vue'
import UserBadge from './components/UserBadge.vue'
import type { SeccionMenu } from './nav'
import iconoClientes from '@/assets/icons/nav-clientes.svg'
import iconoProductos from '@/assets/icons/nav-productos.svg'
import iconoCompra from '@/assets/icons/nav-compra.svg'
import iconoPago from '@/assets/icons/nav-pago.svg'
import iconoListado from '@/assets/icons/nav-listado.svg'
import iconoMiTienda from '@/assets/icons/nav-mi-tienda.svg'
import iconoPerfil from '@/assets/icons/nav-mi-perfil.svg'
import iconoInicio from '@/assets/icons/header-inicio.svg'
import iconoRegla from '@/assets/icons/footer-regla.svg'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const secciones: SeccionMenu[] = [
  {
    titulo: 'Operaciones cuaderno',
    items: [
      { texto: 'Clientes', to: '/tienda/clientes', icono: iconoClientes, ancho: 20, alto: 10 },
      { texto: 'Productos y servicios', to: '/tienda/productos', icono: iconoProductos, ancho: 16.67, alto: 16.67 },
      { texto: 'Registrar compra', to: '/tienda/compras/nueva', icono: iconoCompra, ancho: 15, alto: 15 },
      { texto: 'Registrar pago', to: '/tienda/pagos/nuevo', icono: iconoPago, ancho: 18.33, alto: 13.33 },
      { texto: 'Listado de pago', to: '/tienda/listados', icono: iconoListado, ancho: 15, alto: 16.67 },
    ],
  },
  {
    titulo: 'Mi cuenta',
    items: [
      { texto: 'Mi tienda', to: '/tienda/mi-tienda', icono: iconoMiTienda, ancho: 18, alto: 18 },
      { texto: 'Mi perfil', to: '/tienda/perfil', icono: iconoPerfil, ancho: 18, alto: 18 },
    ],
  },
]
</script>

<template>
  <AppShell :secciones="secciones">
    <template #sidebar-top>
      <StoreCard />
    </template>

    <template #header-left>
      <nav aria-label="Ubicación" class="flex min-w-0 items-center gap-1 text-caption text-on-surface-variant">
        <RouterLink to="/tienda/clientes" class="shrink-0" aria-label="Inicio">
          <img :src="iconoInicio" alt="" width="12" height="13.5" />
        </RouterLink>
        <span aria-hidden="true">/</span>
        <span class="hidden truncate sm:inline">{{ auth.tienda?.nombre_comercial }}</span>
        <span class="hidden sm:inline" aria-hidden="true">/</span>
        <span class="font-semibold text-primary">{{ route.meta.seccion }}</span>
      </nav>
      <span
        v-if="auth.tienda"
        class="hidden items-center gap-1 rounded-full bg-surface-container px-2 py-1 text-label font-bold text-on-surface-variant md:flex"
      >
        <span class="size-2 rounded-full bg-primary-container" />
        RUC {{ auth.tienda.ruc }}
      </span>
    </template>

    <template #header-user>
      <UserBadge etiqueta="Administrador" />
    </template>

    <template #footer-right>
      <p class="flex items-center gap-1 text-caption text-primary">
        <img :src="iconoRegla" alt="" width="12.83" height="12.25" />
        Regla contable: Año de 360 días · Mes de 30 días
      </p>
    </template>
  </AppShell>
</template>
