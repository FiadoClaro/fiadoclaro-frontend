<script setup lang="ts">
/**
 * Tasa en porcentaje con sufijo "%" (Figma 5: "3.50 %", "2.00 % mensual"). Hasta 7 decimales.
 * Se escribe el porcentaje tal cual: 3.5 significa 3.5 %.
 */
import { computed } from 'vue'
import DecimalInput from './DecimalInput.vue'
import type { VarianteCampo } from './estilos'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Texto después del %: "mensual", "anual" */
    periodo?: string
    invalid?: boolean
    variante?: VarianteCampo
    disabled?: boolean
  }>(),
  { periodo: undefined, invalid: false, variante: 'blanco', disabled: false },
)
const modelo = defineModel<string | null>({ default: '' })

const sufijo = computed(() => (props.periodo ? `% ${props.periodo}` : '%'))
</script>

<template>
  <DecimalInput
    v-model="modelo"
    v-bind="$attrs"
    :decimales="7"
    :sufijo="sufijo"
    :invalid="invalid"
    :variante="variante"
    :disabled="disabled"
    placeholder="0.00"
  />
</template>
