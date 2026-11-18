<script setup lang="ts" generic="T extends string | number">
/**
 * Lista desplegable (Figma 3 "Giro comercial", Figma 5 "Capitalización", "Plazo máximo").
 * Usa el <select> nativo del navegador: accesible con teclado y cómodo en el celular.
 */
import { computed } from 'vue'
import flecha from '@/assets/icons/select-flecha.svg'
import { clasesCampo, type Opcion, type VarianteCampo } from './estilos'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    options: Opcion<T>[]
    /** Texto de la opción vacía ("Selecciona..."); si no se da, no hay opción vacía */
    placeholder?: string
    icono?: string
    iconoAncho?: number
    iconoAlto?: number
    invalid?: boolean
    variante?: VarianteCampo
    disabled?: boolean
  }>(),
  { placeholder: undefined, icono: undefined, iconoAncho: 15, iconoAlto: 15, invalid: false, variante: 'blanco', disabled: false },
)

const modelo = defineModel<T | null>({ default: null })

// El <select> trabaja con texto: buscamos la opción para devolver el valor con su tipo original.
const indice = computed(() => props.options.findIndex((o) => o.value === modelo.value))
function alCambiar(e: Event) {
  const i = Number((e.target as HTMLSelectElement).value)
  modelo.value = i >= 0 ? props.options[i]!.value : null
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
      class="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2"
    />
    <select
      v-bind="$attrs"
      :value="indice"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :class="[clasesCampo(variante, invalid), icono ? 'pl-10' : 'pl-[15px]']"
      class="cursor-pointer appearance-none pr-9"
      @change="alCambiar"
    >
      <option v-if="placeholder" :value="-1" disabled>{{ placeholder }}</option>
      <option v-for="(o, i) in options" :key="String(o.value)" :value="i" :disabled="o.disabled">{{ o.label }}</option>
    </select>
    <img :src="flecha" alt="" width="8.33" height="4.17" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
  </div>
</template>
