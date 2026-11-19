/**
 * Simulación de una compra con el BACKEND (POST /purchases/simular), con espera de 400 ms.
 *
 * Cada vez que cambia el cliente, los ítems, la modalidad o las cuotas, se espera a que el usuario
 * deje de cambiar y se pide el cálculo: ciclo, días de gracia, interés, cuota, TCEA, cronograma y
 * crédito disponible. El front no calcula nada; solo pinta la respuesta.
 *
 * `error` guarda los rechazos de negocio (p. ej. "excede_plazo" o un producto que no permite cuotas).
 * El exceso de crédito NO es error: llega en la simulación con `excede_credito: true`.
 */
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import * as purchases from '@/api/purchases'
import { ApiError } from '@/api/http'
import type { CompraIn, SimulacionOut } from '@/types/api'

export function useSimulacion(cuerpo: Ref<CompraIn | null>, esperaMs = 400) {
  const simulacion = ref<SimulacionOut | null>(null)
  const error = ref<ApiError | null>(null)
  const calculando = ref(false)

  let temporizador: ReturnType<typeof setTimeout> | undefined
  let consulta = 0

  async function simular(body: CompraIn) {
    const actual = ++consulta
    calculando.value = true
    try {
      const s = await purchases.simular(body)
      if (actual !== consulta) return
      simulacion.value = s
      error.value = null
    } catch (e) {
      if (actual !== consulta) return
      simulacion.value = null
      error.value = e instanceof ApiError ? e : new ApiError('No se pudo calcular la compra.', 'error_cliente', 0)
    } finally {
      if (actual === consulta) calculando.value = false
    }
  }

  watch(
    cuerpo,
    (body) => {
      clearTimeout(temporizador)
      if (!body) {
        consulta++ // descarta respuestas pendientes
        simulacion.value = null
        error.value = null
        calculando.value = false
        return
      }
      calculando.value = true
      temporizador = setTimeout(() => simular(body), esperaMs)
    },
    { deep: true, immediate: true },
  )
  onBeforeUnmount(() => clearTimeout(temporizador))

  return { simulacion, error, calculando }
}
