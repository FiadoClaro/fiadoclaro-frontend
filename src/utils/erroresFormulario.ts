/**
 * Coloca los errores del backend junto a cada campo del formulario.
 *
 *  - Errores de validación (422): el backend manda { campo: "administrador.username", mensaje } y
 *    los formularios usan esos mismos nombres, así que se asignan directo.
 *  - Errores de negocio (409, 422 con code): llegan sin campo; con `reglas` se decide a qué campo
 *    pertenecen según el texto (p. ej. "Ya existe una tienda con RUC..." → campo "ruc").
 *
 * Devuelve el mensaje que no se pudo asignar a ningún campo (para mostrarlo en un aviso general),
 * o null si todo quedó junto a sus campos.
 */
import { ApiError } from '@/api/http'

export interface ReglaError {
  /** Si el mensaje o el código del backend coincide con este patrón... */
  patron: RegExp
  /** ...el error se muestra en este campo */
  campo: string
}

export function aplicarErroresApi(
  error: unknown,
  ponerError: (campo: string, mensaje: string) => void,
  camposDelFormulario: string[],
  reglas: ReglaError[] = [],
): string | null {
  if (!(error instanceof ApiError)) return 'Ocurrió un error inesperado.'

  // 1) Errores de validación por campo.
  let asignados = 0
  for (const [campo, mensaje] of Object.entries(error.fields)) {
    if (camposDelFormulario.includes(campo)) {
      ponerError(campo, mensaje)
      asignados++
    }
  }
  if (asignados > 0 && asignados === Object.keys(error.fields).length) return null

  // 2) Errores de negocio: buscamos el campo por el texto o el código.
  const regla = reglas.find((r) => r.patron.test(error.message) || r.patron.test(error.code))
  if (regla && camposDelFormulario.includes(regla.campo)) {
    ponerError(regla.campo, error.message)
    return null
  }
  return error.message
}
