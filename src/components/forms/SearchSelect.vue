<script setup lang="ts" generic="T">
/**
 * Buscador con lista de resultados (combobox accesible). Lo usa "Registrar compra" para elegir
 * al vecino (Figma 8: "Rosa Flores Benites (DNI: 08765432)") y el producto del catálogo.
 *
 * - Escribe y espera 300 ms; luego llama a `buscar(texto)` (que consulta al backend).
 * - Teclado: flechas arriba/abajo para moverse, Enter para elegir, Escape para cerrar.
 * - Lectores de pantalla: role="combobox" + role="listbox" con la opción activa anunciada.
 */
import { computed, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue'
import iconoBuscar from '@/assets/icons/buscar.svg'
import { clasesCampo, type ResultadoBusqueda, type VarianteCampo } from './estilos'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    buscar: (texto: string) => Promise<ResultadoBusqueda<T>[]>
    /** Texto que se muestra en el campo cuando ya hay algo elegido */
    textoSeleccion?: string
    placeholder?: string
    variante?: VarianteCampo
    invalid?: boolean
    disabled?: boolean
    /** Buscar también con el campo vacío (muestra las primeras opciones al enfocar) */
    buscarVacio?: boolean
  }>(),
  { textoSeleccion: '', placeholder: 'Buscar…', variante: 'relleno', invalid: false, disabled: false, buscarVacio: true },
)
const emit = defineEmits<{ elegir: [ResultadoBusqueda<T>] }>()

const uid = useId()
const idLista = `lista-${uid}`
const texto = ref(props.textoSeleccion)
// shallowRef: los resultados se reemplazan completos, no hace falta reactividad interna.
const resultados = shallowRef<ResultadoBusqueda<T>[]>([])
const abierto = ref(false)
const activo = ref(-1)
const cargando = ref(false)
const error = ref<string | null>(null)

watch(() => props.textoSeleccion, (t) => (texto.value = t))

let espera: ReturnType<typeof setTimeout> | undefined
let consulta = 0
async function consultar(q: string) {
  const actual = ++consulta
  cargando.value = true
  error.value = null
  try {
    const r = await props.buscar(q.trim())
    if (actual !== consulta) return
    resultados.value = r
    activo.value = r.findIndex((x) => !x.deshabilitado)
  } catch (e) {
    if (actual === consulta) error.value = e instanceof Error ? e.message : 'No se pudo buscar'
  } finally {
    if (actual === consulta) cargando.value = false
  }
}
function programar(q: string) {
  clearTimeout(espera)
  if (!q.trim() && !props.buscarVacio) {
    resultados.value = []
    return
  }
  espera = setTimeout(() => consultar(q), 300)
}
onBeforeUnmount(() => clearTimeout(espera))

function alEscribir(e: Event) {
  texto.value = (e.target as HTMLInputElement).value
  abierto.value = true
  programar(texto.value)
}
function alEnfocar() {
  abierto.value = true
  // Al enfocar con algo ya elegido, se busca desde vacío para ver otras opciones.
  programar(texto.value === props.textoSeleccion ? '' : texto.value)
}
function cerrar() {
  abierto.value = false
  texto.value = props.textoSeleccion // si no eligió nada, vuelve a mostrar la selección
}
// Si el foco sale del buscador (Tab o clic en otro lado), se cierra la lista.
const raiz = ref<HTMLElement | null>(null)
function alSalirDelFoco(e: FocusEvent) {
  const destino = e.relatedTarget as Node | null
  if (!destino || !raiz.value?.contains(destino)) cerrar()
}
function elegir(r: ResultadoBusqueda<T>) {
  if (r.deshabilitado) return
  emit('elegir', r)
  abierto.value = false
}
function mover(paso: 1 | -1) {
  if (!abierto.value) {
    abierto.value = true
    programar(texto.value)
    return
  }
  const n = resultados.value.length
  if (n === 0) return
  let i = activo.value
  for (let k = 0; k < n; k++) {
    i = (i + paso + n) % n
    if (!resultados.value[i]!.deshabilitado) break
  }
  activo.value = i
}
function alEnter(e: KeyboardEvent) {
  const r = resultados.value[activo.value]
  if (abierto.value && r) {
    e.preventDefault()
    elegir(r)
  }
}

const idActivo = computed(() => (activo.value >= 0 && abierto.value ? `${idLista}-${activo.value}` : undefined))
</script>

<template>
  <div ref="raiz" class="relative w-full" @focusout="alSalirDelFoco">
    <img :src="iconoBuscar" alt="" width="15" height="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      v-bind="$attrs"
      type="text"
      role="combobox"
      autocomplete="off"
      :value="texto"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-expanded="abierto"
      :aria-controls="idLista"
      aria-autocomplete="list"
      :aria-activedescendant="idActivo"
      :aria-invalid="invalid || undefined"
      :class="clasesCampo(variante, invalid)"
      class="pl-10 pr-3 font-semibold"
      @input="alEscribir"
      @focus="alEnfocar"
      @keydown.down.prevent="mover(1)"
      @keydown.up.prevent="mover(-1)"
      @keydown.enter="alEnter"
      @keydown.esc="cerrar"
    />
    <ul
      v-show="abierto"
      :id="idLista"
      role="listbox"
      class="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-control bg-white p-1 shadow-float"
    >
      <li v-if="cargando" class="px-3 py-2 text-caption text-on-surface-variant" role="presentation">Buscando…</li>
      <li v-else-if="error" class="px-3 py-2 text-caption text-error" role="presentation">{{ error }}</li>
      <li v-else-if="resultados.length === 0" class="px-3 py-2 text-caption text-on-surface-variant" role="presentation">Sin resultados</li>
      <template v-else>
        <li
          v-for="(r, i) in resultados"
          :id="`${idLista}-${i}`"
          :key="i"
          role="option"
          :aria-selected="i === activo"
          :aria-disabled="r.deshabilitado || undefined"
          :class="[i === activo ? 'bg-primary-fixed/50' : '', r.deshabilitado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-low']"
          class="rounded-stamp px-3 py-2"
          @mousedown.prevent="elegir(r)"
          @mousemove="!r.deshabilitado && (activo = i)"
        >
          <p class="text-body font-semibold text-on-surface">{{ r.texto }}</p>
          <p v-if="r.detalle" class="text-caption text-on-surface-variant">{{ r.detalle }}</p>
        </li>
      </template>
    </ul>
  </div>
</template>
