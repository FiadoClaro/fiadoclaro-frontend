/** Endpoints de listados de pago (/statements). Rol: ADMIN_TIENDA. */
import { http } from './http'
import type { EstadoCuentaOut, GeneracionOut, PaginaEstadoCuentaResumen } from '@/types/api'

export interface FiltrosListados {
  cliente_id?: number
  estado?: 'PENDIENTE' | 'PAGADO'
  /** "YYYY-MM-DD" */
  fecha_corte?: string
  limit?: number
  offset?: number
}

/**
 * Genera, en una fecha de corte, el listado de cada cliente con ese día de corte.
 * Es idempotente. Normalmente no hace falta: el backend genera solo los listados de los cortes
 * que ya pasaron al consultar listados, clientes o el portal.
 */
export async function generar(fechaCorte: string, clienteId?: number): Promise<GeneracionOut> {
  const { data } = await http.post<GeneracionOut>('/statements/generar', { fecha_corte: fechaCorte, cliente_id: clienteId ?? null })
  return data
}

export async function listar(filtros: FiltrosListados = {}): Promise<PaginaEstadoCuentaResumen> {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''))
  const { data } = await http.get<PaginaEstadoCuentaResumen>('/statements', { params })
  return data
}

/** Detalle: compras ordenadas por fecha, intereses y la mora como ítems aparte (calculada a hoy). */
export async function obtener(id: number): Promise<EstadoCuentaOut> {
  const { data } = await http.get<EstadoCuentaOut>(`/statements/${id}`)
  return data
}
