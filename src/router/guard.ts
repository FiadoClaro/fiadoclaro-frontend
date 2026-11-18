/**
 * Reglas de acceso por rol (separadas del router para poder probarlas con Vitest).
 *
 *  - Sin sesión → solo puede ver rutas públicas (login); lo demás lo manda a /login.
 *  - Con sesión → no vuelve al login; cada rol solo entra a sus propias rutas.
 */
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import type { Rol } from '@/types/api'

/** Página de inicio de cada rol después del login. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  ADMIN_SISTEMA: '/admin/tiendas',
  ADMIN_TIENDA: '/tienda/clientes',
  CLIENTE: '/portal',
}

export interface EstadoSesion {
  autenticado: boolean
  rol: Rol | null
}

/** Lo mínimo que necesitamos de una ruta: sus registros (padre → hijo) con su meta. */
type RutaConRegistros = Pick<RouteLocationNormalized, 'matched'>

/** Rol que exige la ruta (lo declara la ruta padre de cada layout en `meta.rol`). */
function rolDeRuta(to: RutaConRegistros): Rol | undefined {
  for (let i = to.matched.length - 1; i >= 0; i--) {
    const rol = to.matched[i].meta.rol
    if (rol) return rol
  }
  return undefined
}

/** ¿Este rol puede abrir esta ruta? */
export function puedeEntrar(to: RutaConRegistros, rol: Rol | null): boolean {
  const requerido = rolDeRuta(to)
  return !requerido || requerido === rol
}

/**
 * Decide la navegación: `true` deja pasar; si no, devuelve a dónde redirigir.
 */
export function decidirNavegacion(to: RouteLocationNormalized, sesion: EstadoSesion): true | RouteLocationRaw {
  const esPublica = to.matched.some((r) => r.meta.publico)

  if (!sesion.autenticado || !sesion.rol) {
    if (esPublica) return true
    // Recordamos a dónde quería ir para volver después del login.
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }

  const inicio = INICIO_POR_ROL[sesion.rol]
  if (esPublica) return inicio // Ya tiene sesión: no tiene sentido ver el login.
  if (!puedeEntrar(to, sesion.rol)) return inicio // Ruta de otro rol: a su propio inicio.
  return true
}
