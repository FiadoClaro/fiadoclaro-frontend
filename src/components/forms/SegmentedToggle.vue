<script setup lang="ts" generic="T extends string | number">
/**
 * Selector de opciones en bloque (Figma 5: "Soles (S/) | Dólares ($)", "Mensual | Anual",
 * "Nominal | Efectiva"). La opción elegida va en verde con un check.
 *
 * Por dentro son botones de radio nativos (ocultos): así funcionan las flechas del teclado
 * y los lectores de pantalla lo anuncian como un grupo de opciones.
 */
import { useId } from 'vue'
import check from '@/assets/icons/check-segmento.svg'
import type { Opcion } from './estilos'

withDefaults(
  defineProps<{
    options: Opcion<T>[]
    /** id de la etiqueta que nombra al grupo (FormField lo entrega como labelId) */
    labelledby?: string
    describedby?: string
    disabled?: boolean
  }>(),
  { labelledby: undefined, describedby: undefined, disabled: false },
)

const modelo = defineModel<T | null>({ default: null })
const nombre = `segmento-${useId()}`
</script>

<template>
  <div
    role="radiogroup"
    :aria-labelledby="labelledby"
    :aria-describedby="describedby"
    class="flex h-[42px] gap-2 rounded-control bg-surface-container p-1"
  >
    <label
      v-for="o in options"
      :key="String(o.value)"
      :class="[
        modelo === o.value ? 'bg-primary text-white shadow-xs' : 'text-on-surface hover:bg-surface-high',
        disabled || o.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ]"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-stamp px-2 text-caption font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-container has-[:focus-visible]:ring-offset-1"
    >
      <input v-model="modelo" type="radio" :name="nombre" :value="o.value" :disabled="disabled || o.disabled" class="sr-only" />
      <img v-if="modelo === o.value" :src="check" alt="" width="13.33" height="13.33" />
      <span class="truncate">{{ o.label }}</span>
    </label>
  </div>
</template>
