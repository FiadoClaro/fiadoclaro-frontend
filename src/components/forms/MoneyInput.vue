<script setup lang="ts">
/**
 * Monto con prefijo de moneda (Figma 5: "S/ | 800.00"). Máximo 2 decimales.
 * El valor es texto ("800.00") y así se envía al backend.
 */
import { computed } from 'vue'
import DecimalInput from './DecimalInput.vue'
import type { VarianteCampo } from './estilos'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{ moneda?: 'PEN' | 'USD'; invalid?: boolean; variante?: VarianteCampo; disabled?: boolean }>(),
  { moneda: 'PEN', invalid: false, variante: 'blanco', disabled: false },
)
const modelo = defineModel<string | null>({ default: '' })

const prefijo = computed(() => (props.moneda === 'USD' ? 'US$' : 'S/'))
</script>

<template>
  <DecimalInput
    v-model="modelo"
    v-bind="$attrs"
    :decimales="2"
    :prefijo="prefijo"
    :invalid="invalid"
    :variante="variante"
    :disabled="disabled"
    placeholder="0.00"
  />
</template>
