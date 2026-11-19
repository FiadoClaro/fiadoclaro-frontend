/** Endpoints de clientes y sus condiciones de crédito (/customers). Rol: ADMIN_TIENDA. */
import { http } from './http'
import type { ClienteCreate, ClienteOut, ClienteUpdate, CondicionIn, PaginaClienteOut, ResumenCredito } from '@/types/api'

export type EstadoCliente = 'ACTIVO' | 'BAJA' | 'AL_DIA' | 'EN_MORA'

export interface FiltrosClientes {
  /** Busca por DNI o nombre */
  q?: string
  /** ACTIVO/BAJA (estado del cliente) o AL_DIA/EN_MORA (estado de pago, solo activos) */
  estado?: EstadoCliente
  limit?: number
  offset?: number
}

/** Lista paginada; `conteos.estado` trae TODOS, ACTIVO, BAJA, AL_DIA y EN_MORA. */
export async function listar(filtros: FiltrosClientes = {}): Promise<PaginaClienteOut> {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''))
  const { data } = await http.get<PaginaClienteOut>('/customers', { params })
  return data
}

/** Cliente con sus condiciones (y equivalencias de tasa) y su resumen de crédito. */
export async function obtener(id: number): Promise<ClienteOut> {
  const { data } = await http.get<ClienteOut>(`/customers/${id}`)
  return data
}

/** Línea de crédito: límite, utilizado, disponible, próximo corte y pago. */
export async function credito(id: number): Promise<ResumenCredito> {
  const { data } = await http.get<ResumenCredito>(`/customers/${id}/credito`)
  return data
}

/** Alta del cliente con sus condiciones y su acceso al portal. */
export async function crear(body: ClienteCreate): Promise<ClienteOut> {
  const { data } = await http.post<ClienteOut>('/customers', body)
  return data
}

/** Editar datos personales (nombres, apellidos, teléfono, correo, dirección). */
export async function actualizar(id: number, body: ClienteUpdate): Promise<ClienteOut> {
  const { data } = await http.patch<ClienteOut>(`/customers/${id}`, body)
  return data
}

/** Cambiar condiciones de crédito: solo afecta compras futuras (cada compra guarda su tasa). */
export async function cambiarCondicion(id: number, body: CondicionIn): Promise<ClienteOut> {
  const { data } = await http.put<ClienteOut>(`/customers/${id}/condicion`, body)
  return data
}

/** Baja: el backend la rechaza si el cliente tiene deuda pendiente. */
export async function darDeBaja(id: number): Promise<ClienteOut> {
  const { data } = await http.post<ClienteOut>(`/customers/${id}/baja`)
  return data
}

export async function reactivar(id: number): Promise<ClienteOut> {
  const { data } = await http.post<ClienteOut>(`/customers/${id}/alta`)
  return data
}
