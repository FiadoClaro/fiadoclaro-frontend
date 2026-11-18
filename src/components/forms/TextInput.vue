<script setup lang="ts">
/**
 * Campo de texto con ícono opcional a la izquierda (Figma 3: RUC, teléfono, correo...).
 * Los atributos extra (id, placeholder, autocomplete, aria-describedby...) pasan al <input>.
 *
 * `digitos` = solo números con ese largo máximo (DNI: 8, RUC: 11).
 * El slot "derecha" permite agregar un botón (p. ej. mostrar contraseña).
 */
import { computed } from 'vue'
import { clasesCampo, type VarianteCampo } from './estilos'
import { soloDigitos } from '@/utils/decimalInput'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    icono?: string
    iconoAncho?: number
    iconoAlto?: number
    type?: string
    invalid?: boolean
    variante?: VarianteCampo
    digitos?: number
    disabled?: boolean
  }>(),
  { icono: undefined, iconoAncho: 15, iconoAlto: 15, type: 'text', invalid: false, variante: 'blanco', digitos: undefined, disabled: false },
)

const modelo = defineModel<string | null>({ default: '' })

const clases = computed(() => [
  clasesCampo(props.variante, props.invalid),
  props.icono ? 'pl-[41px]' : 'pl-[15px]',
  'pr-[15px]',
])

function alEscribir(e: Event) {
  const input = e.target as HTMLInputElement
  if (props.digitos) {
    const limpio = soloDigitos(input.value, props.digitos)
    if (limpio !== input.value) input.value = limpio // corrige lo que se ve en pantalla
    modelo.value = limpio
  } else {
    modelo.value = input.value
  }
}
</script>

<template>
  <div class="relative w-full">
    <img
      v-if="icono"
      :src="icono"
      alt=""
      :width="iconoAncho"
      :height="iconoAlto"
      class="pointer-events-none absolute left-[13.5px] top-1/2 -translate-y-1/2"
    />
    <input
      v-bind="$attrs"
      :type="type"
      :value="modelo ?? ''"
      :disabled="disabled"
      :inputmode="digitos ? 'numeric' : undefined"
      :aria-invalid="invalid || undefined"
      :class="clases"
      @input="alEscribir"
    />
    <div v-if="$slots.derecha" class="absolute inset-y-0 right-0 flex items-center pr-3">
      <slot name="derecha" />
    </div>
  </div>
</template>
