<script setup lang="ts">
/**
 * Campo de formulario estándar de FiadoClaro (Figma 3, 5 y 7):
 *   Etiqueta [*]                                  (?)
 *   [ control: slot ]
 *   [ ayuda abierta, debajo del campo, sin tapar nada ]
 *   mensaje de error
 *
 * La prop `help` es OBLIGATORIA (observación del profesor: ayuda "?" en todos los campos).
 * Si falta, TypeScript marca error al compilar y Vue avisa en la consola.
 *
 * El slot entrega { id, labelId, describedBy, invalid } para conectar el control con la etiqueta,
 * la ayuda y el error (accesibilidad). Los grupos (SegmentedToggle) usan labelId:
 *   <FormField label="RUC" help="..." v-slot="{ id, describedBy, invalid }">
 *     <TextInput :id="id" :aria-describedby="describedBy" :invalid="invalid" v-model="ruc" />
 *   </FormField>
 */
import { computed, ref, useId } from 'vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import iconoInfoOscura from '@/assets/icons/ayuda-info-oscura.svg'
import iconoInfoClara from '@/assets/icons/ayuda-info.svg'

const props = withDefaults(
  defineProps<{
    /** Texto de la etiqueta */
    label: string
    /** Texto de ayuda del "?" (obligatorio) */
    help: string
    /** Título de la ayuda; por defecto, la etiqueta */
    helpTitle?: string
    /** Muestra el asterisco rojo de obligatorio */
    required?: boolean
    /** Mensaje de error (del formulario o del backend) */
    error?: string | null
    /** Texto pequeño fijo bajo el control (p. ej. "Cobro en mostrador") */
    hint?: string
    /** Estilo de la ayuda: oscura (Figma 3) o verde clara (Figma 5) */
    tono?: 'oscuro' | 'claro'
    /** id del control; si no se da, se genera uno */
    id?: string
  }>(),
  { helpTitle: undefined, required: false, error: null, hint: undefined, tono: 'oscuro', id: undefined },
)

const uid = useId()
const idControl = computed(() => props.id ?? `campo-${uid}`)
const idAyuda = computed(() => `${idControl.value}-ayuda`)
const idError = computed(() => `${idControl.value}-error`)
const idHint = computed(() => `${idControl.value}-hint`)
const idLabel = computed(() => `${idControl.value}-label`)

const ayudaAbierta = ref(false)

/** Ids que describen al control: ayuda (siempre), pista y error (si hay). */
const describedBy = computed(() =>
  [idAyuda.value, props.hint ? idHint.value : null, props.error ? idError.value : null].filter(Boolean).join(' '),
)
const invalid = computed(() => !!props.error)
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-2">
      <label :id="idLabel" :for="idControl" class="text-caption font-semibold text-on-surface">
        {{ label }}<span v-if="required" class="text-error" aria-hidden="true"> *</span>
        <span v-if="required" class="sr-only"> (obligatorio)</span>
      </label>
      <HelpTip v-model:abierto="ayudaAbierta" :campo="label" :panel-id="idAyuda" />
    </div>

    <slot :id="idControl" :label-id="idLabel" :described-by="describedBy" :invalid="invalid" />

    <!-- Ayuda: siempre en el DOM (para aria-describedby), visible solo cuando se abre -->
    <div
      v-show="ayudaAbierta"
      :id="idAyuda"
      role="note"
      :class="tono === 'oscuro' ? 'bg-surface-inverse shadow-btn' : 'bg-primary-fixed/40'"
      class="flex gap-1.5 rounded-control p-2.5"
    >
      <img :src="tono === 'oscuro' ? iconoInfoOscura : iconoInfoClara" alt="" width="15" height="15" class="mt-px shrink-0" />
      <p :class="tono === 'oscuro' ? 'text-on-surface-inverse' : 'text-[#00201d]'" class="text-caption tracking-normal">
        <span :class="tono === 'oscuro' ? 'text-primary-fixed' : ''" class="block text-label font-bold">{{ helpTitle ?? label }}</span>
        {{ help }}
      </p>
    </div>

    <p v-if="hint" :id="idHint" class="text-caption text-on-surface-variant">{{ hint }}</p>
    <p v-if="error" :id="idError" class="text-caption text-error" role="alert">{{ error }}</p>
  </div>
</template>
