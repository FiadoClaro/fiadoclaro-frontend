import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import { aplicarErroresApi } from './erroresFormulario'

function recolector() {
  const puestos: Record<string, string> = {}
  return { puestos, poner: (c: string, m: string) => (puestos[c] = m) }
}

describe('aplicarErroresApi', () => {
  it('asigna los errores de validación a sus campos (también los anidados)', () => {
    const { puestos, poner } = recolector()
    const error = new ApiError('Revisa 2 campos', 'validacion', 422, {
      ruc: 'El RUC debe tener exactamente 11 dígitos',
      'administrador.username': 'El usuario debe tener al menos 4 caracteres',
    })
    const resto = aplicarErroresApi(error, poner, ['ruc', 'administrador.username'])
    expect(resto).toBeNull()
    expect(puestos['administrador.username']).toContain('4 caracteres')
  })

  it('usa las reglas para errores de negocio sin campo', () => {
    const { puestos, poner } = recolector()
    const error = new ApiError('Ya existe una tienda con RUC 20554892101', 'conflicto', 409)
    const resto = aplicarErroresApi(error, poner, ['ruc'], [{ patron: /RUC/, campo: 'ruc' }])
    expect(resto).toBeNull()
    expect(puestos.ruc).toBe('Ya existe una tienda con RUC 20554892101')
  })

  it('devuelve el mensaje si no corresponde a ningún campo', () => {
    const { poner } = recolector()
    const error = new ApiError('No tienes permiso para esta operación', 'prohibido', 403)
    expect(aplicarErroresApi(error, poner, ['ruc'])).toBe('No tienes permiso para esta operación')
  })
})
