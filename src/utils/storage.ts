/**
 * Acceso seguro a localStorage.
 * En modo incógnito, con el almacenamiento bloqueado o en pruebas, localStorage puede lanzar error;
 * por eso cada lectura y escritura va dentro de try/catch y, si falla, la app sigue funcionando
 * (solo que la sesión no se recuerda al recargar).
 */

export function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave)
  } catch {
    return null
  }
}

export function guardar(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}

export function borrar(clave: string): void {
  try {
    window.localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}
