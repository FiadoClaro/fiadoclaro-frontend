<script setup lang="ts">
/**
 * Sello de estado tipo "sello de goma" (Figma 2b y 4b): texto en mayúsculas, borde doble y una
 * leve inclinación, como un sello estampado en el cuaderno.
 *
 * Acepta los estados tal como llegan del backend (AL_DIA, EN_MORA, BAJA, ACTIVA, PAGADO...).
 * Los que no están en el Figma (PENDIENTE, PAGADO, VENCIDA...) siguen el mismo estilo.
 */
import { computed } from 'vue'

const props = defineProps<{
  estado: string
  /** Texto a mostrar en lugar del nombre del estado */
  texto?: string
}>()

interface EstiloSello {
  texto: string
  clases: string
  /** Borde punteado exterior (sello ACTIVA de la lista de tiendas) */
  punteado?: boolean
}

const verde: Omit<EstiloSello, 'texto'> = { clases: 'bg-success-container text-success border-success rounded-[2px]', punteado: true }
const teal = { clases: 'bg-primary-fixed text-primary border-primary -rotate-1' }
const rojo = { clases: 'bg-error-container text-error border-error rotate-1' }
const gris = { clases: 'bg-surface-highest text-on-surface-variant border-outline rotate-2' }
const ambar = { clases: 'bg-tertiary-fixed/70 text-tertiary border-tertiary -rotate-1' }

const ESTILOS: Record<string, EstiloSello> = {
  ACTIVA: { texto: 'Activa', ...verde },
  ACTIVO: { texto: 'Activo', ...verde },
  VIGENTE: { texto: 'Vigente', ...verde },
  PAGADO: { texto: 'Pagado', ...verde },
  PAGADA: { texto: 'Pagada', ...verde },
  CANCELADA: { texto: 'Cancelada', ...verde }, // compra totalmente pagada
  AL_DIA: { texto: 'Al día', ...teal },
  EN_MORA: { texto: 'En mora', ...rojo },
  VENCIDO: { texto: 'Vencido', ...rojo },
  VENCIDA: { texto: 'Vencida', ...rojo },
  BAJA: { texto: 'De baja', ...gris },
  DE_BAJA: { texto: 'De baja', ...gris },
  ANULADA: { texto: 'Anulada', ...gris },
  PENDIENTE: { texto: 'Pendiente', ...ambar },
}

const estilo = computed<EstiloSello>(
  () => ESTILOS[props.estado.toUpperCase().replace(/\s+/g, '_')] ?? { texto: props.estado.replace(/_/g, ' '), ...gris },
)
</script>

<template>
  <span
    :class="estilo.clases"
    class="relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-stamp border px-2.5 py-0.5 text-center text-label font-bold uppercase shadow-xs"
  >
    <span v-if="estilo.punteado" class="pointer-events-none absolute -inset-[2px] rounded-[3px] border border-dashed border-success" aria-hidden="true" />
    {{ texto ?? estilo.texto }}
  </span>
</template>
