<script setup lang="ts">
/**
 * Botón "?" de ayuda (observación del profesor: ayuda en TODOS los campos).
 * Figma 3 y 5: círculo de 16 px gris; abierto se pone verde.
 *
 * Dos formas de uso:
 *  1) Suelto: <HelpTip texto="..." /> muestra su propia tarjeta flotante debajo del "?".
 *  2) Dentro de FormField: recibe `panel-id` y NO dibuja la tarjeta; FormField la muestra
 *     debajo del campo, sin tapar otros campos (así está en el Figma).
 *
 * Accesible: se abre con el mouse (hover), con el teclado (foco con Tab; Escape cierra)
 * y con un toque en el celular (toque abre y deja fijo; otro toque o tocar fuera lo cierra).
 * El botón apunta al texto con aria-describedby.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = defineProps<{
  /** Texto de ayuda (para el modo suelto) */
  texto?: string
  /** Título opcional de la ayuda */
  titulo?: string
  /** Nombre del campo, para el lector de pantalla: "Ayuda: Usuario" */
  campo?: string
  /** id del panel que dibuja otro componente (modo FormField) */
  panelId?: string
}>()

/** Estado abierto/cerrado (FormField lo escucha con v-model:abierto). */
const abierto = defineModel<boolean>('abierto', { default: false })

const idPropio = `ayuda-${useId()}`
const idPanel = computed(() => props.panelId ?? idPropio)
const etiqueta = computed(() => (props.campo ? `Ayuda: ${props.campo}` : 'Ayuda'))

const fijado = ref(false) // abierto con clic/toque: no se cierra al quitar el mouse ni al perder el foco
const raiz = ref<HTMLElement | null>(null)

function abrir() {
  abierto.value = true
}
function cerrar() {
  if (!fijado.value) abierto.value = false
}
function alternar() {
  fijado.value = !fijado.value
  abierto.value = fijado.value
}
function cerrarDelTodo() {
  fijado.value = false
  abierto.value = false
}

// Tocar o hacer clic fuera cierra la ayuda (incluso la fijada).
function alTocarFuera(e: PointerEvent) {
  if (abierto.value && raiz.value && !raiz.value.contains(e.target as Node)) cerrarDelTodo()
}
onMounted(() => document.addEventListener('pointerdown', alTocarFuera))
onBeforeUnmount(() => document.removeEventListener('pointerdown', alTocarFuera))
</script>

<template>
  <span ref="raiz" class="relative inline-flex" @mouseenter="abrir" @mouseleave="cerrar" @keydown.esc="cerrarDelTodo">
    <button
      type="button"
      :aria-label="etiqueta"
      :aria-describedby="idPanel"
      :aria-expanded="abierto"
      :aria-controls="idPanel"
      :class="abierto ? 'bg-primary-container text-white shadow-xs' : 'bg-surface-highest text-on-surface-variant hover:bg-outline-variant'"
      class="flex size-4 items-center justify-center rounded-full text-micro font-bold leading-none transition-colors"
      @focus="abrir"
      @blur="cerrar"
      @click="alternar"
    >
      ?
    </button>

    <!-- Tarjeta flotante (solo en modo suelto) -->
    <span
      v-if="!panelId"
      v-show="abierto"
      :id="idPropio"
      role="tooltip"
      class="absolute right-0 top-6 z-30 flex w-64 max-w-[calc(100vw-2rem)] gap-1 rounded-control bg-surface-inverse p-2.5 text-left shadow-btn"
    >
      <span>
        <span v-if="titulo" class="block text-label font-bold text-primary-fixed">{{ titulo }}</span>
        <span class="block text-caption tracking-normal text-on-surface-inverse">{{ texto }}</span>
      </span>
    </span>
  </span>
</template>
