<script setup lang="ts">
/**
 * Estructura común de las pantallas internas (Figma 2b, 4b, 12 y 15):
 *  - Barra lateral verde de 256 px con logo, menú por secciones y bloques opcionales.
 *  - Cabecera fija de 64 px con fondo crema translúcido.
 *  - Contenido (RouterView) y pie de página.
 * En pantallas angostas (< 1024 px) la barra lateral se abre con el botón de menú.
 *
 * Slots: sidebar-top, sidebar-bottom, header-left, header-user, footer-right.
 */
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import logo from '@/assets/figma/logo-fiadoclaro.png'
import { estaActivo, type SeccionMenu } from '../nav'
import LogoutButton from './LogoutButton.vue'
import AppFooter from './AppFooter.vue'

const props = withDefaults(
  defineProps<{
    secciones: SeccionMenu[]
    /** Color del ítem activo: verde (tienda, cliente) o ámbar (admin del sistema, Figma 2b) */
    activo?: 'verde' | 'ambar'
  }>(),
  { activo: 'verde' },
)

const route = useRoute()
const menuAbierto = ref(false)

// Al navegar, se cierra el menú en móviles.
watch(
  () => route.fullPath,
  () => (menuAbierto.value = false),
)

const claseActivo =
  props.activo === 'ambar' ? 'bg-tertiary-container text-white shadow-xs' : 'bg-primary-container text-white shadow-xs'
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Fondo oscuro detrás del menú abierto en móviles -->
    <div v-if="menuAbierto" class="fixed inset-0 z-30 bg-on-surface/40 lg:hidden" aria-hidden="true" @click="menuAbierto = false" />

    <!-- ===================== Barra lateral ===================== -->
    <aside
      id="menu-lateral"
      :class="menuAbierto ? 'translate-x-0' : '-translate-x-full'"
      class="fixed inset-y-0 left-0 z-40 flex w-sidebar flex-col justify-between overflow-y-auto bg-primary shadow-[0px_1px_4px_rgba(0,0,0,0.08)] transition-transform lg:translate-x-0"
      aria-label="Menú principal"
    >
      <div>
        <!-- Logo -->
        <div class="flex h-header items-center gap-2 bg-primary-container/20 px-4">
          <img :src="logo" alt="" width="32" height="32" class="size-8" />
          <div>
            <p class="text-body-lg font-semibold tracking-[-0.4px] text-white">FiadoClaro</p>
            <p class="text-label font-bold uppercase text-primary-inverse">Libro de cuentas</p>
          </div>
        </div>

        <slot name="sidebar-top" />

        <!-- Menú por secciones -->
        <nav class="flex flex-col gap-1 px-2 pt-4">
          <template v-for="(seccion, i) in secciones" :key="seccion.titulo">
            <p :class="i === 0 ? 'pt-1' : 'pt-4'" class="px-2 pb-1.5 text-label font-bold uppercase text-primary-fixed-dim/70">
              {{ seccion.titulo }}
            </p>
            <RouterLink
              v-for="item in seccion.items"
              :key="item.to"
              :to="item.to"
              :class="estaActivo(item, route.path) ? claseActivo : 'text-on-surface-inverse hover:bg-white/10'"
              :aria-current="estaActivo(item, route.path) ? 'page' : undefined"
              class="flex items-center gap-2 rounded-control p-2 text-body transition-colors"
            >
              <span class="flex w-5 shrink-0 items-center justify-center">
                <img :src="item.icono" alt="" :width="item.ancho" :height="item.alto" />
              </span>
              {{ item.texto }}
            </RouterLink>
          </template>
        </nav>
      </div>

      <slot name="sidebar-bottom" />
    </aside>

    <!-- ===================== Contenido ===================== -->
    <div class="flex min-h-screen flex-col lg:pl-sidebar">
      <header
        class="sticky top-0 z-20 flex h-header items-center justify-between gap-3 bg-surface/90 px-4 shadow-header backdrop-blur-[12px] sm:px-8"
      >
        <div class="flex min-w-0 items-center gap-3">
          <!-- Botón de menú (solo en pantallas angostas) -->
          <button
            type="button"
            class="-ml-2 rounded-control p-2 text-primary hover:bg-surface-high lg:hidden"
            aria-controls="menu-lateral"
            :aria-expanded="menuAbierto"
            aria-label="Abrir menú"
            @click="menuAbierto = !menuAbierto"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <slot name="header-left" />
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-4">
          <span class="hidden h-6 w-px bg-outline-variant/40 sm:block" />
          <slot name="header-user" />
          <LogoutButton />
        </div>
      </header>

      <main class="flex-1 px-4 pb-8 pt-1 sm:px-8">
        <!-- La clave por ruta hace que, p. ej., ir de "editar" a "nueva" cree un formulario limpio. -->
        <RouterView v-slot="{ Component, route: r }">
          <component :is="Component" :key="r.path" />
        </RouterView>
      </main>

      <AppFooter>
        <slot name="footer-right" />
      </AppFooter>
    </div>
  </div>
</template>
