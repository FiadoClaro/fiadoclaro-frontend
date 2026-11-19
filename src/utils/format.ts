/**
 * Formato de montos, tasas y fechas para MOSTRAR en pantalla.
 *
 * Regla del proyecto: el backend envía montos y tasas como texto ("1234.5", "3.5000000").
 * Aquí NUNCA se convierten a `number` (los float pierden precisión: 0.1 + 0.2 = 0.30000000000000004).
 * Solo se reescriben los dígitos del texto: redondeo half up, separador de miles y símbolo.
 * Cualquier cálculo financiero lo hace el backend.
 */

export type Moneda = 'PEN' | 'USD'

/** Texto que se muestra cuando no hay valor. */
export const SIN_VALOR = '—'

const SIMBOLO: Record<Moneda, string> = { PEN: 'S/', USD: 'US$' }

/** Partes de un decimal escrito como texto: signo, parte entera y parte decimal. */
interface PartesDecimal {
  negativo: boolean
  entero: string
  decimales: string
}

/** Lee "-1234.567" → { negativo: true, entero: "1234", decimales: "567" }. Devuelve null si no es un decimal válido. */
function leerDecimal(valor: string | number | null | undefined): PartesDecimal | null {
  if (valor === null || valor === undefined) return null
  const texto = String(valor).trim()
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(texto)
  if (!m || (!m[2] && !m[3])) return null
  return {
    negativo: m[1] === '-',
    entero: (m[2] || '0').replace(/^0+(?=\d)/, ''),
    decimales: m[3] ?? '',
  }
}

/**
 * Redondea un decimal escrito como texto a `cifras` decimales con la regla half up
 * (igual que el backend: 0.005 → 0.01). Usa BigInt, que trabaja con enteros exactos.
 */
export function redondearTexto(valor: string | number, cifras: number): string | null {
  const p = leerDecimal(valor)
  if (!p) return null

  // Pasamos todo a un entero exacto: "12.345" con 2 cifras → 1234 y el dígito siguiente (5) decide.
  const decimales = p.decimales.padEnd(cifras + 1, '0')
  const conservado = BigInt(p.entero + decimales.slice(0, cifras))
  const siguiente = Number(decimales[cifras]) // solo un dígito 0-9, no es un monto
  const redondeado = siguiente >= 5 ? conservado + 1n : conservado

  // Volvemos a escribir el punto decimal.
  const digitos = redondeado.toString().padStart(cifras + 1, '0')
  const entero = cifras > 0 ? digitos.slice(0, -cifras) : digitos
  const frac = cifras > 0 ? digitos.slice(-cifras) : ''
  const esCero = /^0*$/.test(entero + frac)
  const signo = p.negativo && !esCero ? '-' : ''
  return signo + entero + (cifras > 0 ? '.' + frac : '')
}

/** Agrega separador de miles a la parte entera: "1234567.89" → "1,234,567.89". */
function separarMiles(texto: string): string {
  const [entero, frac] = texto.split('.')
  const conComas = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac !== undefined ? `${conComas}.${frac}` : conComas
}

/**
 * Monto con símbolo de moneda y 2 decimales.
 * formatMoney("1234.5") → "S/ 1,234.50" · formatMoney("99", "USD") → "US$ 99.00" · formatMoney("-8") → "-S/ 8.00"
 */
export function formatMoney(valor: string | null | undefined, moneda: Moneda | string = 'PEN'): string {
  const texto = valor == null ? null : redondearTexto(valor, 2)
  if (texto === null) return SIN_VALOR
  const simbolo = SIMBOLO[moneda as Moneda] ?? moneda
  const negativo = texto.startsWith('-')
  const cuerpo = separarMiles(negativo ? texto.slice(1) : texto)
  return `${negativo ? '-' : ''}${simbolo} ${cuerpo}`
}

/**
 * Tasa en porcentaje. Por defecto 2 decimales; para ver la tasa exacta usa más (hasta 7).
 * formatRate("3.5000000") → "3.50 %" · formatRate("3.5123456", 7) → "3.5123456 %"
 */
export function formatRate(valor: string | null | undefined, decimales = 2): string {
  const texto = valor == null ? null : redondearTexto(valor, decimales)
  if (texto === null) return SIN_VALOR
  return `${separarMiles(texto)} %`
}

// ---------------------------------------------------------------------------
// Fechas: siempre en hora de Lima (America/Lima), como el backend.
// ---------------------------------------------------------------------------

const ZONA = 'America/Lima'

/** Partes de una fecha en hora de Lima (día, mes, año, hora, minuto). */
function partesEnLima(fecha: Date): Record<string, string> {
  const partes = new Intl.DateTimeFormat('es-PE', {
    timeZone: ZONA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha)
  return Object.fromEntries(partes.map((p) => [p.type, p.value]))
}

/**
 * Fecha como dd/mm/aaaa.
 * - "2026-11-30" (solo fecha) se muestra tal cual, sin mover de día por la zona horaria.
 * - "2026-11-30T03:00:00Z" (fecha y hora) se convierte a hora de Lima → "29/11/2026".
 */
export function formatDate(valor: string | null | undefined): string {
  if (!valor) return SIN_VALOR
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return SIN_VALOR
  const p = partesEnLima(fecha)
  return `${p.day}/${p.month}/${p.year}`
}

/** Fecha y hora en Lima como "dd/mm/aaaa HH:mm" (24 h). */
export function formatDateTime(valor: string | null | undefined): string {
  if (!valor) return SIN_VALOR
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return SIN_VALOR
  const p = partesEnLima(fecha)
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

/** Fecha de hoy en Lima como "YYYY-MM-DD" (para comparar con fechas del backend). */
export function hoyLima(ahora: Date = new Date()): string {
  const p = partesEnLima(ahora)
  return `${p.year}-${p.month}-${p.day}`
}

/** Hora "HH:mm:ss" del backend (p. ej. la hora de corte) como "HH:mm". */
export function formatTime(valor: string | null | undefined): string {
  const m = valor ? /^(\d{2}):(\d{2})/.exec(valor) : null
  return m ? `${m[1]}:${m[2]}` : SIN_VALOR
}
