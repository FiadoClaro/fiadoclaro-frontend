<script setup lang="ts">
/**
 * Base de MoneyInput y RateInput: campo numérico decimal alineado a la derecha.
 * El valor es TEXTO ("800.00", "3.5"); nunca se convierte a number.
 * Limita los decimales mientras se escribe (si se pasa, descarta los sobrantes).
 */
import { computed } from 'vue'
import { clasesCampo, type VarianteCampo } from './estilos'
import { limpiarDecimal } from '@/utils/decimalInput'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Máximo de decimales permitidos */
    decimales: number
    /** Texto fijo a la izquierda (S/, US$) en un bloque gris */
    prefijo?: string
    /** Texto fijo a la derecha (%, % mensual) */
    sufijo?: string
    invalid?: boolean
    variante?: VarianteCampo
    disabled?: boolean
  }>(),
  { prefijo: undefined, sufijo: undefined, invalid: false, variante: 'blanco', disabled: false },
)

const modelo = defineModel<string | null>({ default: '' })

// Espacio a cada lado según el texto fijo (aprox. 9 px por carácter + margen).
const estilo = computed(() => ({
  paddingLeft: props.prefijo ? `${props.prefijo.length * 9 + 32}px` : '12px',
  paddingRight: props.sufijo ? `${props.sufijo.length * 7.5 + 20}px` : '12px',
}))

function alEscribir(e: Event) {
  const input = e.target as HTMLInputElement
  const limpio = limpiarDecimal(input.value, props.decimales)
  if (limpio !== input.value) input.value = limpio // así el usuario ve que no se acepta el carácter
  modelo.value = limpio
}
</script>

<template>
  <div class="relative w-full">
    <span
      v-if="prefijo"
      class="pointer-events-none absolute inset-y-0 left-0 flex items-center rounded-l-control bg-surface-container px-3 text-body font-bold text-on-surface"
      aria-hidden="true"
    >
      {{ prefijo }}
    </span>
    <input
      v-bind="$attrs"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :value="modelo ?? ''"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :class="clasesCampo(variante, invalid)"
      :style="estilo"
      class="text-right font-semibold tabular-nums"
      @input="alEscribir"
    />
    <span
      v-if="sufijo"
      class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body font-semibold text-on-surface-variant"
      aria-hidden="true"
    >
      {{ sufijo }}
    </span>
  </div>
</template>
