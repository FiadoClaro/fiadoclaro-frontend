<script setup lang="ts">
/**
 * Hora (Figma 5: "hora de corte" 06:00 PM). Usa el selector de hora nativo del navegador.
 * El valor es "HH:mm" (24 h), que es lo que acepta el backend.
 */
import iconoHora from '@/assets/icons/campo-hora.svg'
import { clasesCampo, type VarianteCampo } from './estilos'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{ invalid?: boolean; variante?: VarianteCampo; disabled?: boolean }>(), {
  invalid: false,
  variante: 'relleno',
  disabled: false,
})

const modelo = defineModel<string | null>({ default: '' })
</script>

<template>
  <div class="relative w-full">
    <img :src="iconoHora" alt="" width="13.33" height="13.33" class="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2" />
    <input
      v-bind="$attrs"
      v-model="modelo"
      type="time"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :class="clasesCampo(variante, invalid)"
      class="pl-8 pr-2 font-semibold tabular-nums"
    />
  </div>
</template>
