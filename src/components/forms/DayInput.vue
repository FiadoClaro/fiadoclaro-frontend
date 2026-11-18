<script setup lang="ts">
/**
 * Día del mes (Figma 5: "Día de corte", "Día de pago ... de cada mes").
 * Solo admite números; por regla del sistema el día va de 1 a 28 (todos los meses lo tienen).
 * Si el número queda fuera del rango, se marca inválido para que el formulario muestre el error.
 * El valor es un número (o null si está vacío).
 */
import { computed, ref, watch } from 'vue'
import iconoDia from '@/assets/icons/campo-dia.svg'
import { clasesCampo, type VarianteCampo } from './estilos'
import { soloDigitos } from '@/utils/decimalInput'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    /** Texto a la derecha, p. ej. "de cada mes" */
    sufijo?: string
    icono?: string
    invalid?: boolean
    variante?: VarianteCampo
    disabled?: boolean
  }>(),
  { min: 1, max: 28, sufijo: undefined, icono: iconoDia, invalid: false, variante: 'relleno', disabled: false },
)

const modelo = defineModel<number | null>({ default: null })
const texto = ref(modelo.value?.toString() ?? '')
watch(modelo, (v) => {
  if ((v?.toString() ?? '') !== texto.value) texto.value = v?.toString() ?? ''
})

const fueraDeRango = computed(() => modelo.value !== null && (modelo.value < props.min || modelo.value > props.max))

function alEscribir(e: Event) {
  const input = e.target as HTMLInputElement
  const limpio = soloDigitos(input.value, 2)
  if (limpio !== input.value) input.value = limpio
  texto.value = limpio
  modelo.value = limpio === '' ? null : Number(limpio) // un día del mes, no un monto: number es correcto
}
</script>

<template>
  <div class="relative w-full">
    <img :src="icono" alt="" width="12" height="13.33" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      v-bind="$attrs"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :value="texto"
      :disabled="disabled"
      :aria-invalid="invalid || fueraDeRango || undefined"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :class="[clasesCampo(variante, invalid || fueraDeRango), sufijo ? 'pl-10 pr-24' : 'pl-8 pr-2 text-center']"
      class="font-semibold tabular-nums"
      @input="alEscribir"
    />
    <span
      v-if="sufijo"
      class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label font-bold text-on-surface-variant"
      aria-hidden="true"
    >
      {{ sufijo }}
    </span>
  </div>
</template>
