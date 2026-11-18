<script setup lang="ts">
/**
 * Layout del ADMINISTRADOR DEL SISTEMA (Figma 2b, node 24-2).
 * Menú: Tiendas (ítem activo en ámbar) y Mi perfil. Abajo, recordatorio del cómputo comercial.
 * Cabecera: ícono + título de la página; a la derecha, escudo y nombre del administrador.
 */
import { useRoute } from 'vue-router'
import AppShell from './components/AppShell.vue'
import type { SeccionMenu } from './nav'
import iconoTiendas from '@/assets/icons/nav-tiendas.svg'
import iconoPerfil from '@/assets/icons/nav-mi-perfil.svg'
import iconoInfo from '@/assets/icons/info-computo.svg'
import iconoCabecera from '@/assets/icons/header-tiendas.svg'
import iconoEscudo from '@/assets/icons/avatar-admin.svg'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const secciones: SeccionMenu[] = [
  {
    titulo: 'Administración central',
    items: [{ texto: 'Tiendas', to: '/admin/tiendas', icono: iconoTiendas, ancho: 15, alto: 13.33 }],
  },
  {
    // No está en el Figma del admin: se agrega para que pueda ver su perfil y cambiar su contraseña (fase 9).
    titulo: 'Mi cuenta',
    items: [{ texto: 'Mi perfil', to: '/admin/perfil', icono: iconoPerfil, ancho: 18, alto: 18 }],
  },
]
</script>

<template>
  <AppShell :secciones="secciones" activo="ambar">
    <template #header-left>
      <div class="flex min-w-0 items-center gap-1">
        <img :src="iconoCabecera" alt="" width="16.74" height="15" />
        <p class="truncate text-body-lg font-semibold text-on-surface">{{ route.meta.titulo }}</p>
      </div>
    </template>

    <template #header-user>
      <div class="flex items-center gap-2">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container shadow-xs">
          <img :src="iconoEscudo" alt="" width="12" height="15" />
        </span>
        <p class="hidden text-caption font-bold text-on-surface sm:block">{{ auth.usuario?.nombre }}</p>
      </div>
    </template>

    <template #sidebar-bottom>
      <div class="bg-white/5 p-4">
        <div class="rounded-control bg-primary-container/40 p-2">
          <p class="flex items-center gap-1 text-label font-bold text-primary-fixed">
            <img :src="iconoInfo" alt="" width="13.33" height="13.33" />
            Cómputo Comercial
          </p>
          <p class="mt-0.5 text-caption text-primary-fixed-dim">360 días año / 30 días mes</p>
        </div>
      </div>
    </template>
  </AppShell>
</template>
