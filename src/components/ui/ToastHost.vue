<script setup lang="ts">
/**
 * Muestra los mensajes del store "toast" (abajo a la derecha; arriba en celulares).
 * No está en el Figma: usa los colores del sistema (verde para éxito, rojo para error).
 * Los lectores de pantalla los anuncian: los de éxito con aria-live="polite" y los errores con role="alert".
 */
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const estilos = {
  exito: { borde: 'border-l-primary-container', icono: '✓', color: 'bg-primary-container text-white' },
  error: { borde: 'border-l-error', icono: '!', color: 'bg-error text-white' },
  info: { borde: 'border-l-tertiary-container', icono: 'i', color: 'bg-tertiary-container text-white' },
} as const
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto" aria-live="polite">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        :role="t.tipo === 'error' ? 'alert' : 'status'"
        :class="estilos[t.tipo].borde"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control border-l-4 bg-white p-3 shadow-float"
      >
        <span :class="estilos[t.tipo].color" class="flex size-5 shrink-0 items-center justify-center rounded-full text-caption font-bold" aria-hidden="true">
          {{ estilos[t.tipo].icono }}
        </span>
        <p class="flex-1 text-body text-on-surface">{{ t.mensaje }}</p>
        <button
          type="button"
          class="-m-1 rounded-stamp p-1 text-on-surface-variant hover:bg-surface-high"
          aria-label="Cerrar mensaje"
          @click="toast.cerrar(t.id)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
