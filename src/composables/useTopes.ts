/**
 * Topes de tasa del BCRP vigentes (GET /finance/topes), para mostrarlos como ayuda en el formulario.
 * El backend es quien valida de verdad (responde "tasa_supera_tope" si la TEA lo supera).
 */
import { ref } from 'vue'
import * as finance from '@/api/finance'
import type { TopeOut } from '@/types/api'
import { hoyLima } from '@/utils/format'

const topes = ref<TopeOut[] | null>(null) // se cargan una sola vez por sesión
let pedido: Promise<void> | null = null

export function useTopes() {
  if (!pedido) {
    pedido = finance
      .topes()
      .then((t) => {
        topes.value = t
      })
      .catch(() => {
        topes.value = []
        pedido = null // se reintentará la próxima vez
      })
  }

  /** Tope vigente hoy (el de fecha de vigencia más reciente que ya empezó) para ese tipo y moneda. */
  function vigente(tipo: 'COMPENSATORIA' | 'MORATORIA', moneda: string): TopeOut | null {
    const hoy = hoyLima()
    return (
      (topes.value ?? [])
        .filter((t) => t.tipo === tipo && (t.moneda ?? 'PEN') === moneda && t.vigente_desde <= hoy)
        .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0] ?? null
    )
  }

  return { topes, vigente }
}
