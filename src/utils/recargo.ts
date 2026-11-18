/**
 * Recargo del precio a crédito sobre el precio al contado, SOLO para mostrar ("+9.5 %").
 * Es un dato informativo del catálogo (Figma 7): no se envía al backend ni interviene en
 * intereses, cuotas ni montos de compra (esos los calcula el backend).
 *
 * Se calcula con enteros exactos (BigInt en céntimos) para no usar float.
 */
import { redondearTexto } from './format'

/** "4.20" → 420n (céntimos). Devuelve null si no es un monto válido. */
function aCentimos(monto: string): bigint | null {
  const texto = redondearTexto(monto, 2)
  if (texto === null) return null
  return BigInt(texto.replace('.', ''))
}

/**
 * Recargo en % con 1 decimal: recargo("4.20", "4.60") → "9.5".
 * Devuelve null si falta algún precio o el contado es 0.
 */
export function recargoPorcentaje(contado: string | null | undefined, credito: string | null | undefined): string | null {
  if (!contado || !credito) return null
  const c = aCentimos(contado)
  const l = aCentimos(credito)
  if (c === null || l === null || c <= 0n) return null
  // (l - c) / c × 100, con 1 decimal → multiplicamos por 1000 y redondeamos half up.
  const milesimas = ((l - c) * 1000n * 2n + c) / (2n * c) // división entera con redondeo
  const negativo = milesimas < 0n
  const abs = negativo ? -milesimas : milesimas
  return `${negativo ? '-' : ''}${abs / 10n}.${abs % 10n}`
}
