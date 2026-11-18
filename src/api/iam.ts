/** Endpoints de acceso y perfil (/iam). */
import { http } from './http'
import type { TiendaOut, TokenOut, UsuarioOut } from '@/types/api'

/**
 * Inicia sesión. El backend usa el formato OAuth2 estándar, por eso se envía como
 * formulario (application/x-www-form-urlencoded) y no como JSON.
 */
export async function login(username: string, password: string): Promise<TokenOut> {
  const form = new URLSearchParams({ username, password })
  const { data } = await http.post<TokenOut>('/iam/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

/** Usuario de la sesión actual. */
export async function me(): Promise<UsuarioOut> {
  const { data } = await http.get<UsuarioOut>('/iam/me')
  return data
}

/** Tienda del usuario: la que administra (admin de tienda) o donde tiene su cuenta (cliente). */
export async function miTienda(): Promise<TiendaOut> {
  const { data } = await http.get<TiendaOut>('/iam/me/tienda')
  return data
}
