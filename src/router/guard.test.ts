import { describe, expect, it } from 'vitest'
import type { RouteLocationNormalized, RouteRecordNormalized } from 'vue-router'
import type { Rol } from '@/types/api'
import { decidirNavegacion, INICIO_POR_ROL, puedeEntrar } from './guard'

/** Arma una ruta de prueba con la meta de sus registros (padre → hijo). */
function ruta(fullPath: string, ...metas: Record<string, unknown>[]): RouteLocationNormalized {
  return {
    fullPath,
    path: fullPath,
    matched: metas.map((meta) => ({ meta }) as unknown as RouteRecordNormalized),
  } as unknown as RouteLocationNormalized
}

const login = ruta('/login', { publico: true })
const tiendas = ruta('/admin/tiendas', { rol: 'ADMIN_SISTEMA' }, { titulo: 'Tiendas' })
const clientes = ruta('/tienda/clientes', { rol: 'ADMIN_TIENDA' }, { titulo: 'Clientes' })
const portal = ruta('/portal', { rol: 'CLIENTE' }, { titulo: 'Mi estado de cuenta' })

const sinSesion = { autenticado: false, rol: null }
const con = (rol: Rol) => ({ autenticado: true, rol })

describe('sin sesión', () => {
  it('puede ver el login', () => {
    expect(decidirNavegacion(login, sinSesion)).toBe(true)
  })
  it('cualquier ruta privada lleva al login recordando el destino', () => {
    expect(decidirNavegacion(clientes, sinSesion)).toEqual({ name: 'login', query: { redirect: '/tienda/clientes' } })
  })
})

describe('con sesión', () => {
  it('el login lleva al inicio de cada rol', () => {
    expect(decidirNavegacion(login, con('ADMIN_SISTEMA'))).toBe('/admin/tiendas')
    expect(decidirNavegacion(login, con('ADMIN_TIENDA'))).toBe('/tienda/clientes')
    expect(decidirNavegacion(login, con('CLIENTE'))).toBe('/portal')
  })
  it('cada rol entra a sus rutas', () => {
    expect(decidirNavegacion(tiendas, con('ADMIN_SISTEMA'))).toBe(true)
    expect(decidirNavegacion(clientes, con('ADMIN_TIENDA'))).toBe(true)
    expect(decidirNavegacion(portal, con('CLIENTE'))).toBe(true)
  })
  it('un rol no puede entrar a rutas de otro: vuelve a su inicio', () => {
    expect(decidirNavegacion(tiendas, con('ADMIN_TIENDA'))).toBe(INICIO_POR_ROL.ADMIN_TIENDA)
    expect(decidirNavegacion(clientes, con('CLIENTE'))).toBe(INICIO_POR_ROL.CLIENTE)
    expect(decidirNavegacion(portal, con('ADMIN_SISTEMA'))).toBe(INICIO_POR_ROL.ADMIN_SISTEMA)
  })
  it('puedeEntrar revisa el rol del layout padre', () => {
    expect(puedeEntrar(clientes, 'ADMIN_TIENDA')).toBe(true)
    expect(puedeEntrar(clientes, 'CLIENTE')).toBe(false)
  })
})
