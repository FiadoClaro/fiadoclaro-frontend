/** Endpoints del catálogo de productos y servicios (/products). Rol: ADMIN_TIENDA. */
import { http } from './http'
import type { PaginaProductoOut, ProductoCreate, ProductoOut, ProductoUpdate } from '@/types/api'

export interface FiltrosProductos {
  /** Busca por nombre, marca o proveedor */
  q?: string
  estado?: 'ACTIVO' | 'BAJA'
  /** Productos que permiten esa modalidad de fiado */
  modalidad?: 'FIN_MES' | 'CUOTAS'
  limit?: number
  offset?: number
}

/** Lista paginada; `conteos.estado` trae TODOS, ACTIVO y BAJA. */
export async function listar(filtros: FiltrosProductos = {}): Promise<PaginaProductoOut> {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''))
  const { data } = await http.get<PaginaProductoOut>('/products', { params })
  return data
}

export async function obtener(id: number): Promise<ProductoOut> {
  const { data } = await http.get<ProductoOut>(`/products/${id}`)
  return data
}

export async function crear(body: ProductoCreate): Promise<ProductoOut> {
  const { data } = await http.post<ProductoOut>('/products', body)
  return data
}

/** PUT: se envía el producto COMPLETO (el backend valida las reglas entre campos juntas). */
export async function actualizar(id: number, body: ProductoUpdate): Promise<ProductoOut> {
  const { data } = await http.put<ProductoOut>(`/products/${id}`, body)
  return data
}

export async function darDeBaja(id: number): Promise<ProductoOut> {
  const { data } = await http.post<ProductoOut>(`/products/${id}/baja`)
  return data
}

export async function reactivar(id: number): Promise<ProductoOut> {
  const { data } = await http.post<ProductoOut>(`/products/${id}/alta`)
  return data
}
