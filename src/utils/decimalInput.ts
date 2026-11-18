/**
 * Limpieza de lo que el usuario escribe en campos de monto y tasa.
 *
 * Trabaja solo con texto (nunca convierte a number): el valor se envía al backend tal cual,
 * como string, y el backend lo lee como Decimal exacto.
 */

/**
 * Deja solo dígitos y un punto decimal, con un máximo de decimales.
 *  - Acepta coma como separador decimal (teclado en español): "12,5" → "12.5".
 *  - Si hay más decimales de los permitidos, se descartan los sobrantes: "12.345" (2) → "12.34".
 *  - Quita ceros a la izquierda innecesarios: "007" → "7", pero conserva "0.5".
 */
export function limpiarDecimal(texto: string, maxDecimales: number, maxEnteros = 12): string {
  let limpio = texto.replace(',', '.').replace(/[^\d.]/g, '')

  // Solo el primer punto cuenta.
  const primerPunto = limpio.indexOf('.')
  if (primerPunto !== -1) {
    limpio = limpio.slice(0, primerPunto + 1) + limpio.slice(primerPunto + 1).replace(/\./g, '')
  }

  let [entero = '', decimales] = limpio.split('.')
  entero = entero.replace(/^0+(?=\d)/, '').slice(0, maxEnteros)

  if (decimales === undefined || maxDecimales === 0) return entero
  if (entero === '') entero = '0' // ".5" → "0.5"
  return `${entero}.${decimales.slice(0, maxDecimales)}`
}

/** ¿El texto es un decimal positivo con como máximo `decimales` cifras decimales? ("4.20" → true, "0" → false) */
export function esDecimalPositivo(texto: string | null | undefined, decimales: number): boolean {
  if (!texto) return false
  const patron = new RegExp(`^\\d+(\\.\\d{0,${decimales}})?$`)
  return patron.test(texto) && /[1-9]/.test(texto)
}

/**
 * Compara dos decimales escritos como texto sin pasarlos a float: -1 si a < b, 0 si son iguales, 1 si a > b.
 * Se usa para validar reglas del formulario (p. ej. precio a crédito >= precio al contado).
 */
export function compararDecimales(a: string, b: string): -1 | 0 | 1 {
  const escala = (t: string) => {
    const [e = '0', d = ''] = t.split('.')
    return BigInt(e + d.padEnd(10, '0').slice(0, 10)) // 10 decimales alcanzan para montos y tasas
  }
  const x = escala(a)
  const y = escala(b)
  return x < y ? -1 : x > y ? 1 : 0
}

/** Deja solo dígitos con un largo máximo (DNI, RUC, día del mes). */
export function soloDigitos(texto: string, maxLargo: number): string {
  return texto.replace(/\D/g, '').slice(0, maxLargo)
}
