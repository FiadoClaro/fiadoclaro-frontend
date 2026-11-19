/** Endpoints de compras fiadas (/purchases). Rol: ADMIN_TIENDA. */
import { http } from './http'
import type { CompraIn, CompraOut, PaginaCompraResumenOut, SimulacionOut } from '@/types/api'

export interface FiltrosCompras {
  cliente_id?: number
  estado?: 'VIGENTE' | 'CANCELADA' | 'ANULADA'
  /** Fecha "YYYY-MM-DD" (inclusive) */
  desde?: string
  hasta?: string
  limit?: number
  offset?: number
}

/**
 * Calcula la compra SIN registrarla: ciclo (corte y pago), días de gracia, interés, cuotas,
 * TCEA, cronograma y crédito disponible. Si excede el crédito, responde igual con
 * `excede_credito: true` y un `mensaje`. Es la única fuente de los números que se muestran.
 */
export async function simular(body: CompraIn): Promise<SimulacionOut> {
  const { data } = await http.post<SimulacionOut>('/purchases/simular', body)
  return data
}

/** Registra la compra (el backend vuelve a calcular todo y rechaza si excede el crédito). */
export async function registrar(body: CompraIn): Promise<CompraOut> {
  const { data } = await http.post<CompraOut>('/purchases', body)
  return data
}

export async function listar(filtros: FiltrosCompras = {}): Promise<PaginaCompraResumenOut> {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''))
  const { data } = await http.get<PaginaCompraResumenOut>('/purchases', { params })
  return data
}

/** Compra con su detalle, tasa pactada (copia) y cronograma. */
export async function obtener(id: number): Promise<CompraOut> {
  const { data } = await http.get<CompraOut>(`/purchases/${id}`)
  return data
}
