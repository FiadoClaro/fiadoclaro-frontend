/**
 * Equivalencias de una tasa (TED, TEM, TEA) calculadas por el BACKEND (POST /finance/equivalencias).
 *
 * Cada vez que cambia la tasa del formulario se espera 400 ms sin cambios (debounce) y recién se
 * consulta al backend, para no hacer una petición por cada tecla. El front no calcula nada.
 */
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import * as finance from '@/api/finance'
import type { EquivalenciasOut, TasaIn } from '@/types/api'

export function useEquivalencias(tasa: Ref<TasaIn | null>, esperaMs = 400) {
  const resultado = ref<EquivalenciasOut | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)

  let temporizador: ReturnType<typeof setTimeout> | undefined
  let consulta = 0

  async function consultar(t: TasaIn) {
    const actual = ++consulta
    cargando.value = true
    try {
      const r = await finance.equivalencias(t)
      if (actual === consulta) {
        resultado.value = r
        error.value = null
      }
    } catch (e) {
      if (actual === consulta) {
        resultado.value = null
        error.value = e instanceof Error ? e.message : 'No se pudo calcular'
      }
    } finally {
      if (actual === consulta) cargando.value = false
    }
  }

  watch(
    tasa,
    (t) => {
      clearTimeout(temporizador)
      if (!t) {
        consulta++ // descarta respuestas pendientes
        resultado.value = null
        cargando.value = false
        return
      }
      temporizador = setTimeout(() => consultar(t), esperaMs)
    },
    { deep: true, immediate: true },
  )
  onBeforeUnmount(() => clearTimeout(temporizador))

  return { resultado, cargando, error }
}
