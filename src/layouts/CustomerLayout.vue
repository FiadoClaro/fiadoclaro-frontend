<script setup lang="ts">
/**
 * Layout del CLIENTE / vecino (Figma 12, node 4-8786).
 * Barra lateral: tarjeta de la tienda donde tiene su cuenta y "Portal cliente".
 * Cabecera: ícono + título de la página; a la derecha, su nombre.
 * Es de solo lectura: el menú no tiene acciones de alta, baja ni pago.
 */
import { useRoute } from 'vue-router'
import AppShell from './components/AppShell.vue'
import StoreCard from './components/StoreCard.vue'
import UserBadge from './components/UserBadge.vue'
import type { SeccionMenu } from './nav'
import iconoEstado from '@/assets/icons/nav-estado-cuenta.svg'
import iconoPerfil from '@/assets/icons/nav-mi-perfil.svg'
import iconoCabecera from '@/assets/icons/header-estado-cuenta.svg'

const route = useRoute()

const secciones: SeccionMenu[] = [
  {
    titulo: 'Portal cliente',
    items: [{ texto: 'Mi estado de cuenta', to: '/portal', icono: iconoEstado, ancho: 15.83, alto: 15, exacto: true }],
  },
  {
    // No está en el Figma del cliente: se agrega para el cambio de contraseña (fase 9).
    titulo: 'Mi cuenta',
    items: [{ texto: 'Mi perfil', to: '/portal/perfil', icono: iconoPerfil, ancho: 18, alto: 18 }],
  },
]
</script>

<template>
  <AppShell :secciones="secciones">
    <template #sidebar-top>
      <StoreCard />
    </template>

    <template #header-left>
      <div class="flex min-w-0 items-center gap-1 text-caption">
        <img :src="iconoCabecera" alt="" width="14.25" height="13.5" />
        <span class="text-on-surface-variant" aria-hidden="true">/</span>
        <span class="truncate font-semibold tracking-[0.24px] text-primary">{{ route.meta.titulo }}</span>
      </div>
    </template>

    <template #header-user>
      <UserBadge />
    </template>
  </AppShell>
</template>
