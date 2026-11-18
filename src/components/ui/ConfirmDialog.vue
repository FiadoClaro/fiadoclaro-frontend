<script setup lang="ts">
/**
 * Diálogo de confirmación de bajas (reemplaza al confirm() del navegador). Dos variantes del Figma:
 *  - 'lateral'  (2, baja de tienda):  barra ámbar→rojo, ícono a la izquierda, aviso ámbar,
 *                                     botones a la derecha.
 *  - 'centrado' (4, baja de cliente): barra roja, ícono redondo centrado, botones a lo ancho.
 *
 * Slots: detalles (recuadro gris con los datos del registro) y default (mensaje explicativo).
 * Accesible: role="alertdialog", foco dentro del diálogo, Escape cancela, el foco vuelve al
 * botón que lo abrió al cerrar.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import iconoAlerta from '@/assets/icons/modal-alerta.svg'
import iconoInfo from '@/assets/icons/modal-info.svg'
import iconoProhibido from '@/assets/icons/modal-prohibido.svg'
import iconoConfirmar from '@/assets/icons/modal-confirmar.svg'

const props = withDefaults(
  defineProps<{
    titulo: string
    /** Texto pequeño en rojo sobre el título ("ACCIÓN CRÍTICA DEL SISTEMA") */
    eyebrow?: string
    variante?: 'lateral' | 'centrado'
    /** Ícono principal; por defecto, triángulo de alerta */
    icono?: string
    confirmText?: string
    cancelText?: string
    /** Mientras se espera al backend: deshabilita botones y evita cerrar */
    loading?: boolean
    /** Mensaje de error del backend (p. ej. "El cliente tiene deuda pendiente") */
    error?: string | null
    /** 'peligro' (bajas, rojo, por defecto) o 'positivo' (reactivar, verde) */
    tono?: 'peligro' | 'positivo'
  }>(),
  {
    eyebrow: undefined,
    variante: 'lateral',
    icono: iconoAlerta,
    confirmText: 'Confirmar baja',
    cancelText: 'Cancelar',
    loading: false,
    error: null,
    tono: 'peligro',
  },
)

/** Colores según el tono: rojo para bajas, verde para reactivar. */
const colores = computed(() =>
  props.tono === 'positivo'
    ? {
        barraLateral: 'bg-gradient-to-r from-primary to-primary-container',
        barraCentrada: 'bg-primary-container',
        fondoIcono: 'bg-primary-fixed',
        eyebrow: 'text-primary',
        aviso: 'bg-primary-fixed/30',
        boton: 'bg-primary-container hover:bg-primary',
      }
    : {
        barraLateral: 'bg-gradient-to-r from-tertiary-container via-error to-error',
        barraCentrada: 'bg-error',
        fondoIcono: 'bg-error-container',
        eyebrow: 'text-error',
        aviso: 'bg-tertiary-fixed/30',
        boton: 'bg-error hover:bg-[#93000a]',
      },
)

const abierto = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()

const uid = useId()
const idTitulo = `dialogo-titulo-${uid}`
const idMensaje = `dialogo-mensaje-${uid}`
const dialogo = ref<HTMLElement | null>(null)
const botonCancelar = ref<HTMLButtonElement | null>(null)
let focoAnterior: HTMLElement | null = null

function cancelar() {
  if (!props.loading) abierto.value = false
}

// Mantiene el foco dentro del diálogo al usar Tab (trampa de foco).
function alTeclear(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelar()
    return
  }
  if (e.key !== 'Tab' || !dialogo.value) return
  const enfocables = Array.from(dialogo.value.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea'))
  if (enfocables.length === 0) return
  const primero = enfocables[0]!
  const ultimo = enfocables[enfocables.length - 1]!
  if (e.shiftKey && document.activeElement === primero) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault()
    primero.focus()
  }
}

watch(
  abierto,
  async (v) => {
    if (v) {
      focoAnterior = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden' // evita que la página de fondo se desplace
      await nextTick()
      botonCancelar.value?.focus() // la opción segura recibe el foco
    } else {
      document.body.style.overflow = ''
      focoAnterior?.focus()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => (document.body.style.overflow = ''))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="abierto"
        class="fixed inset-0 z-50 flex items-center justify-center bg-surface-inverse/40 p-4 backdrop-blur-[2px]"
        @click.self="cancelar"
        @keydown="alTeclear"
      >
        <div
          ref="dialogo"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="idTitulo"
          :aria-describedby="idMensaje"
          :class="variante === 'lateral' ? 'max-w-[512px] rounded-2xl' : 'max-w-[440px] rounded-card'"
          class="w-full overflow-hidden bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
        >
          <!-- Barra superior de color -->
          <div :class="variante === 'lateral' ? colores.barraLateral : colores.barraCentrada" class="h-2" />

          <div :class="variante === 'centrado' ? 'items-center text-center' : ''" class="flex flex-col p-6 sm:p-8">
            <!-- Encabezado -->
            <div v-if="variante === 'lateral'" class="flex items-start gap-4 pb-4">
              <span :class="colores.fondoIcono" class="flex size-12 shrink-0 items-center justify-center rounded-card shadow-xs">
                <img :src="icono" alt="" width="25.67" height="22.17" />
              </span>
              <div>
                <p v-if="eyebrow" :class="colores.eyebrow" class="text-label font-bold uppercase">{{ eyebrow }}</p>
                <h2 :id="idTitulo" class="pt-0.5 text-headline font-bold text-on-surface">{{ titulo }}</h2>
              </div>
            </div>
            <template v-else>
              <span :class="colores.fondoIcono" class="mb-4 flex size-14 items-center justify-center rounded-full shadow-xs">
                <img :src="icono" alt="" width="28" height="21.33" />
              </span>
              <p v-if="eyebrow" :class="colores.eyebrow" class="text-label font-bold uppercase">{{ eyebrow }}</p>
              <h2 :id="idTitulo" class="pb-2 text-headline font-bold text-on-surface">{{ titulo }}</h2>
            </template>

            <!-- Datos del registro -->
            <div v-if="$slots.detalles" :class="variante === 'lateral' ? 'rounded-card' : 'rounded-control'" class="mb-4 w-full bg-surface-low p-4 text-left">
              <slot name="detalles" />
            </div>

            <!-- Mensaje -->
            <div
              :id="idMensaje"
              :class="variante === 'lateral' ? `flex gap-2 rounded-control p-4 text-on-surface ${colores.aviso}` : 'text-on-surface-variant'"
              class="w-full text-left text-body leading-[22.75px]"
            >
              <img v-if="variante === 'lateral'" :src="iconoInfo" alt="" width="16.67" height="18.67" class="mt-0.5 shrink-0" />
              <div><slot /></div>
            </div>

            <!-- Error del backend -->
            <p v-if="error" role="alert" class="mt-4 w-full rounded-control border border-error/30 bg-error-container px-3 py-2 text-left text-caption font-semibold text-error">
              {{ error }}
            </p>

            <!-- Botones -->
            <div :class="variante === 'lateral' ? 'justify-end pt-6' : 'pt-6'" class="flex w-full flex-col-reverse gap-2 sm:flex-row">
              <button
                ref="botonCancelar"
                type="button"
                :disabled="loading"
                :class="variante === 'lateral' ? 'bg-surface-container px-6' : 'flex-1 bg-surface-high px-4'"
                class="rounded-control py-2.5 text-body font-semibold text-on-surface transition-colors hover:bg-surface-highest disabled:opacity-60"
                @click="cancelar"
              >
                {{ cancelText }}
              </button>
              <button
                type="button"
                :disabled="loading"
                :class="[variante === 'lateral' ? 'px-6 text-body-lg' : 'flex-1 px-4 text-body', colores.boton]"
                class="flex items-center justify-center gap-2 rounded-control py-2.5 font-semibold text-white shadow-btn transition-colors disabled:cursor-wait disabled:opacity-70"
                @click="emit('confirm')"
              >
                <span v-if="loading" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                <img
                  v-else
                  :src="variante === 'lateral' && tono === 'peligro' ? iconoProhibido : iconoConfirmar"
                  alt=""
                  :width="variante === 'lateral' && tono === 'peligro' ? 16.67 : 15"
                  :height="variante === 'lateral' && tono === 'peligro' ? 16.67 : 15"
                />
                {{ loading ? 'Procesando…' : confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
