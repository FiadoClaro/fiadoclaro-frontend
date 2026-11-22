/** Endpoints de pagos (/payments). Rol: ADMIN_TIENDA. */
import { http } from './http'
import type { CotizacionOut, PagoIn, PagoOut, PaginaPagoOut } from '@/types/api'

/**
 * Total exigible de un listado si se paga en `fechaPago` (YYYY-MM-DD; por defecto hoy):
 * capital, interés compensatorio, mora por días de atraso e imputación por prelación
 * (1 mora, 2 compensatorio por atraso, 3 compensatorio, 4 capital). Lo calcula el backend.
 */
export async function cotizar(estadoCuentaId: number, fechaPago?: string): Promise<CotizacionOut> {
  const { data } = await http.get<CotizacionOut>(`/payments/cotizar/${estadoCuentaId}`, {
    params: fechaPago ? { fecha_pago: fechaPago } : {},
  })
  return data
}

/** Registra el pago TOTAL del listado. El monto debe ser exactamente el total exigible (sin pagos parciales). */
export async function registrar(body: PagoIn): Promise<PagoOut> {
  const { data } = await http.post<PagoOut>('/payments', body)
  return data
}

export async function listar(filtros: { cliente_id?: number; limit?: number; offset?: number } = {}): Promise<PaginaPagoOut> {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined))
  const { data } = await http.get<PaginaPagoOut>('/payments', { params })
  return data
}

export async function obtener(id: number): Promise<PagoOut> {
  const { data } = await http.get<PagoOut>(`/payments/${id}`)
  return data
}
