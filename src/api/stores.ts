/** Endpoints de tiendas (/stores). Solo los usa el administrador del sistema. */
import { http } from './http'
import type { PaginaTiendaOut, TiendaCreate, TiendaOut, TiendaUpdate } from '@/types/api'

export interface FiltrosTiendas {
  /** Busca por nombre comercial, razón social o RUC */
  q?: string
  estado?: 'ACTIVA' | 'BAJA'
  giro?: string
  limit?: number
  offset?: number
}

/** Lista paginada; incluye `conteos.estado` y `conteos.giro` para los filtros. */
export async function listar(filtros: FiltrosTiendas = {}): Promise<PaginaTiendaOut> {
  // No enviamos parámetros vacíos (el backend los tomaría como filtro "").
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''))
  const { data } = await http.get<PaginaTiendaOut>('/stores', { params })
  return data
}

export async function obtener(id: number): Promise<TiendaOut> {
  const { data } = await http.get<TiendaOut>(`/stores/${id}`)
  return data
}

/** Crea la tienda junto con su administrador (usuario y contraseña inicial). */
export async function crear(body: TiendaCreate): Promise<TiendaOut> {
  const { data } = await http.post<TiendaOut>('/stores', body)
  return data
}

/** Edita datos de la tienda y del contacto del administrador (el RUC no cambia). */
export async function actualizar(id: number, body: TiendaUpdate): Promise<TiendaOut> {
  const { data } = await http.patch<TiendaOut>(`/stores/${id}`, body)
  return data
}

export async function darDeBaja(id: number): Promise<TiendaOut> {
  const { data } = await http.post<TiendaOut>(`/stores/${id}/baja`)
  return data
}

export async function reactivar(id: number): Promise<TiendaOut> {
  const { data } = await http.post<TiendaOut>(`/stores/${id}/alta`)
  return data
}
